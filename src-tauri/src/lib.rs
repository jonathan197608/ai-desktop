mod mcp;

use mcp::{mcp_call_tool, mcp_list_tools, mcp_start, mcp_stop};
use rmcp::{ServiceError, transport::sse::SseTransportError};
use serde_json as _;
use std::sync::{Arc, LazyLock};
use std::time::Duration;
use std::{env, fs};
use tauri::async_runtime::spawn;
use tauri::menu::MenuBuilder;
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_http::reqwest;
use tauri_plugin_http::reqwest::Client;
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tokio::sync::Mutex;
use tokio::task::JoinError;

static UV_PYTHON_INSTALL_MIRROR: LazyLock<Arc<Mutex<bool>>> =
    LazyLock::new(|| Arc::new(Mutex::new(false)));
const PYTHON_RELEASE: &str = "https://github.com/astral-sh/python-build-standalone/releases";

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("bad param: {0}")]
    BadParam(String),
    #[error(transparent)]
    MCP(#[from] ServiceError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    SSE(#[from] SseTransportError),
    #[error(transparent)]
    Join(#[from] JoinError),
    #[error(transparent)]
    Shell(#[from] tauri_plugin_shell::Error),
    #[error(transparent)]
    Req(#[from] reqwest::Error),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}

#[derive(serde::Serialize)]
struct AppInfo {
    version: String,
}

async fn check_release() -> Result<bool, Error> {
    let client = Client::builder()
        .timeout(Duration::from_secs(10)) // 设置超时时间为 10 秒
        .build()?;
    if let Ok(resp) = client.get(PYTHON_RELEASE).send().await {
        if resp.status().is_success() {
            return Ok(true);
        } else {
            log::error!("failed to check python release: {}", resp.status());
        }
    }
    Ok(false)
}
async fn setup(app: AppHandle) -> Result<(), Error> {
    let sidecar_command = app
        .shell()
        .sidecar("bun")?
        .args(["i", "office-text-extractor"]);
    let (mut rx, _) = sidecar_command.spawn()?;
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Terminated(res) = event {
            log::info!("office-text-extractor installed: {:?}", res);
            break;
        }
    }
    match check_release().await {
        Ok(false) => *UV_PYTHON_INSTALL_MIRROR.lock().await = true,
        Err(e) => {
            *UV_PYTHON_INSTALL_MIRROR.lock().await = true;
            log::error!("failed to check python release: {}", e);
        }
        Ok(true) => {}
    }
    log::info!(
        "setup finished, use mirror: {}",
        *UV_PYTHON_INSTALL_MIRROR.lock().await
    );
    set_complete(
        app.clone(),
        app.state::<Mutex<SetupState>>(),
        "backend".to_string(),
    )
    .await
    .ok();
    Ok(())
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
fn platform() -> String {
    tauri_plugin_os::platform().to_string()
}

#[tauri::command]
fn get_hash(file_path: &str) -> Result<String, Error> {
    let content = fs::read(file_path)?;
    Ok(format!("{:x}", md5::compute(content)))
}

#[tauri::command]
async fn set_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), ()> {
    let mut state_lock = state.lock().await;
    match task.as_str() {
        "frontend" => state_lock.frontend_task = true,
        "backend" => state_lock.backend_task = true,
        _ => panic!("invalid task completed!"),
    }
    // Check if both tasks are completed
    if state_lock.backend_task && state_lock.frontend_task {
        // Setup is complete, we can close the splashscreen
        // and show the main window!
        if let Some(splash_window) = app.get_webview_window("splashscreen") {
            splash_window.close().unwrap();
        }
        let main_window = app.get_webview_window("main").unwrap();
        main_window.show().unwrap();
    }
    Ok(())
}

#[tauri::command]
async fn get_content(app: tauri::AppHandle, file_path: String) -> Result<String, Error> {
    #[cfg(target_os = "windows")]
    let file_path = file_path.replace("\\", "\\\\");
    let script = format!(
        r#"import {{getTextExtractor}} from 'office-text-extractor';await getTextExtractor().extractText({{input:'{file_path}',type:'file'}})"#
    );
    let sidecar_command = app.shell().sidecar("bun")?.args(["-p", &script]);
    let (mut rx, _) = sidecar_command.spawn()?;
    let mut content = String::new();
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(line_bytes) = event {
            let line = String::from_utf8_lossy(&line_bytes);
            content.push_str(&line);
        }
    }
    log::info!("got content: {}, length: {}", file_path, content.len());
    Ok(content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(Default::default(), None))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            platform,
            set_complete,
            get_app_info,
            get_hash,
            get_content,
            mcp_start,
            mcp_list_tools,
            mcp_call_tool,
            mcp_stop
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let menu = MenuBuilder::new(app).hide_others().quit().build()?;
                app.handle().plugin(tauri_plugin_positioner::init())?;
                TrayIconBuilder::new()
                    .menu(&menu)
                    .show_menu_on_left_click(true)
                    .icon(app.default_window_icon().unwrap().clone())
                    .on_tray_icon_event(|tray_handle, event| {
                        tauri_plugin_positioner::on_tray_event(tray_handle.app_handle(), &event);
                    })
                    .build(app)?;
                if let Some(splash) = app.get_webview_window("splashscreen") {
                    splash.as_ref().window().move_window(Position::Center).ok();
                }
            }
            spawn(setup(app.handle().clone()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
