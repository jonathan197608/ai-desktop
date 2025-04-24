use super::Error;
use nanoid::nanoid;
use rmcp::service::RunningService;
use rmcp::transport::TokioChildProcess;
use rmcp::{
    RoleClient, ServiceExt,
    model::{CallToolRequestParam, CallToolResult, JsonObject, Tool},
    transport::SseTransport,
};
use std::collections::HashMap;
use std::sync::LazyLock;
use tauri_plugin_shell::ShellExt;
use tokio::process::Command;
use tokio::sync::Mutex;

const ARG_LIMIT: usize = 5;

#[allow(non_snake_case)]
#[derive(serde::Deserialize, Default, Debug)]
pub struct MCPServer {
    id: String,
    name: String,
    baseUrl: Option<String>,
    command: Option<String>,
    registryUrl: Option<String>,
    args: Option<Vec<String>>,
    env: Option<HashMap<String, String>>,
}

#[allow(non_snake_case)]
#[derive(serde::Serialize)]
pub struct MCPTool {
    id: String,
    serverId: String,
    serverName: String,
    name: String,
    description: Option<String>,
    inputSchema: JsonObject,
}

static CLIENT_LIST: LazyLock<Mutex<HashMap<String, RunningService<RoleClient, ()>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

async fn replace_client(id: String, client: RunningService<RoleClient, ()>) {
    let mut list = CLIENT_LIST.lock().await;
    if let Some(old) = list.insert(id, client) {
        tokio::spawn(async move {
            if let Err(e) = old.cancel().await {
                log::error!("failed to cancel server: {e}");
            }
        });
    }
}

#[tauri::command]
pub async fn mcp_stop(server: MCPServer) -> Result<(), Error> {
    let mut list = CLIENT_LIST.lock().await;
    if let Some(old) = list.remove(&server.id) {
        if let Err(e) = old.cancel().await {
            log::error!("failed to cancel server: {e}");
        }
    }
    Ok(())
}

async fn make_client(
    app: &tauri::AppHandle,
    server: &MCPServer,
) -> Result<RunningService<RoleClient, ()>, Error> {
    let client;
    log::debug!("Connecting to server: {:?}", server);
    if let Some(ref base_url) = server.baseUrl {
        let transport = SseTransport::start(base_url).await?;
        client = ().serve(transport).await.inspect_err(|e| {
            log::error!("sse client error: {:?} {}", e, base_url);
        })?;
    } else {
        let mut args: Vec<String> = Vec::new();
        let cmd_args = server.args.clone().unwrap_or_default();
        if cmd_args.len() > ARG_LIMIT {
            return Err(Error::BadParam(format!(
                "the count of argument must less then {ARG_LIMIT}"
            )));
        }
        let mut cmd_envs = server.env.clone().unwrap_or_default();
        let command = server
            .command
            .clone()
            .ok_or(Error::BadParam("miss command".into()))?;
        let command = match command.as_str() {
            "uvx" => {
                args.push("tool".into());
                args.push("run".into());
                args.push("-q".into());
                args.push("--no-progress".into());
                args.extend_from_slice(cmd_args.as_slice());
                if let Some(registry_url) = &server.registryUrl {
                    cmd_envs.insert("UV_DEFAULT_INDEX".into(), registry_url.clone());
                }
                "uv"
            }
            "npx" => {
                args.push("x".into());
                args.push("--silent".into());
                args.extend_from_slice(cmd_args.as_slice());
                if let Some(registry_url) = &server.registryUrl {
                    cmd_envs.insert("NPM_CONFIG_REGISTRY".into(), registry_url.clone());
                }
                "bun"
            }
            _ => return Err(Error::BadParam("invalid command".into())),
        };
        let sidecar_command = app.shell().sidecar(command)?.args(args).envs(cmd_envs);
        let sidecar_command: std::process::Command = sidecar_command.into();
        client =
            ().serve(TokioChildProcess::new(&mut Command::from(sidecar_command))?)
                .await
                .inspect_err(|e| {
                    log::error!("stdio client error: {:?} {}", e, command);
                })?;
    }
    let client_info = client.peer_info();
    log::info!("Connected to server: {client_info:#?}");
    Ok(client)
}

#[tauri::command]
pub async fn mcp_start(app: tauri::AppHandle, server: MCPServer) -> Result<(), Error> {
    let client = make_client(&app, &server).await?;
    replace_client(server.id, client).await;
    Ok(())
}

#[tauri::command]
pub async fn mcp_list_tools(
    app: tauri::AppHandle,
    server: MCPServer,
) -> Result<Vec<MCPTool>, Error> {
    {
        let list = CLIENT_LIST.lock().await;
        if let Some(client) = list.get(&server.id) {
            return Ok(make_mcp_tool_list(&server, &client.list_all_tools().await?));
        }
    }
    let client = make_client(&app, &server).await?;
    let res = client.list_all_tools().await?;
    replace_client(server.id.clone(), client).await;
    Ok(make_mcp_tool_list(&server, &res))
}

fn make_mcp_tool_list(server: &MCPServer, tools: &Vec<Tool>) -> Vec<MCPTool> {
    tools
        .iter()
        .map(|tool| MCPTool {
            id: nanoid!(),
            serverId: server.id.clone(),
            serverName: server.name.clone(),
            name: String::from(tool.name.clone()),
            description: Some(String::from(tool.description.clone())),
            inputSchema: JsonObject::clone(&tool.input_schema),
        })
        .collect()
}

#[tauri::command]
pub async fn mcp_call_tool(
    app: tauri::AppHandle,
    server: MCPServer,
    name: String,
    args: JsonObject,
) -> Result<CallToolResult, Error> {
    {
        let list = CLIENT_LIST.lock().await;
        if let Some(client) = list.get(&server.id) {
            return Ok(client
                .call_tool(CallToolRequestParam {
                    name: name.into(),
                    arguments: Some(args),
                })
                .await?);
        }
    }
    let client = make_client(&app, &server).await?;
    let res = client
        .call_tool(CallToolRequestParam {
            name: name.into(),
            arguments: Some(args),
        })
        .await?;
    replace_client(server.id, client).await;
    Ok(res)
}
