mod mcp;

use mcp::{mcp_call_tool, mcp_list_tools, mcp_start, mcp_stop};
use rmcp::{ServiceError, transport::sse::SseTransportError};
use std::{env, fs};
use tauri::menu::MenuBuilder;
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_log::{Target, TargetKind};
use tokio::sync::Mutex;
use tokio::task::JoinError;

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
}

#[derive(serde::Serialize)]
struct AppInfo {
    version: String,
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
        _ => panic!("invalid task completed!"),
    }
    // Check if both tasks are completed
    if state_lock.frontend_task {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(SetupState {
            frontend_task: false,
        }))
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
            }
            Ok(())
        })
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
            mcp_start,
            mcp_list_tools,
            mcp_call_tool,
            mcp_stop
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
