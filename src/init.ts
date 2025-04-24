import KeyvStorage from '@kangfenmao/keyv-storage'
import {
  makeFile,
  selectFiles,
  uploadFile,
  getBaseDir,
  getDataPath,
  readFile,
  writeFile,
  saveFile,
  readBase64File, readBinaryFile, downloadFile
} from '@/types/file'
import {invoke} from '@tauri-apps/api/core'
import {FileType, MCPServer, Shortcut} from '@/types'
import {remove} from '@tauri-apps/plugin-fs'
import {OpenDialogOptions} from '@tauri-apps/plugin-dialog'
import * as path from "@tauri-apps/api/path"
import {openPath, openUrl} from "@tauri-apps/plugin-opener";
import {check} from '@tauri-apps/plugin-updater'
import CopilotService from '@/services/CopilotService'
import type {DownloadEvent, Update as UpdateInfo} from '@tauri-apps/plugin-updater'
import {disable, enable} from "@tauri-apps/plugin-autostart"
import {register} from '@tauri-apps/plugin-global-shortcut'
import {load} from '@tauri-apps/plugin-store';

(async () => {
  const platform: string = await invoke('platform')
  window.isMac = platform === 'macos'
  window.isWindows = platform === 'windows'
  window.copilotStore = await load('copilot_store.json', {autoSave: true})
  window.configStore = await load('config.json', {autoSave: true})
  window.keyv = new KeyvStorage()
  await window.keyv.init()
})().then(() => console.log("config loaded"))

const api = {
  getAppInfo: () => invoke('get_app_info'),
  checkForUpdate: () => check(),
  openWebsite: (url: string) => openUrl(url),
  showUpdateDialog: (info: UpdateInfo, onProgress: ((progress: DownloadEvent) => void) | undefined) => info.downloadAndInstall(onProgress),
  setLaunchOnBoot: async (isActive: boolean) => isActive ? await enable() : await disable(),
  file: {
    select: (options?: OpenDialogOptions) => selectFiles(options),
    upload: (file: FileType) => uploadFile(file.path),
    delete: async (fileId: string) => remove(await getDataPath(fileId), {baseDir: getBaseDir()}),
    read: async (fileId: string) => readFile(fileId),
    clear: () => invoke('file:clear'),
    get: async (filePath: string) => makeFile((await path.appDataDir()) + (await getDataPath(filePath))),
    write: (fileName: string, data: string) => writeFile(fileName, data),
    openPath: (path: string) => openPath(path),
    save: (path: string, content: string) => saveFile(path, content),
    base64Image: async (fileId: string) => readBase64File(await getDataPath(fileId)),
    download: (url: string) => downloadFile(url),
    binaryFile: async (fileId: string) => readBinaryFile(await getDataPath(fileId))
  },
  shortcuts: {
    update: async (shortcuts: Shortcut[]) => {
      return await register(shortcuts
        .filter((item) => item.enabled)
        .map((item) => item.shortcut.join('+')), (event) => {
        console.log(`Shortcut ${event.shortcut} triggered`);
      })
    }
  },
  config: {
    set: (key: string, value: any) => window.configStore?.set(key, value),
    get: (key: string) => window.configStore?.get<any>(key)
  },
  mcp: {
    startServer: (server: MCPServer) => invoke('mcp_start', {server}),
    stopServer: (server: MCPServer) => invoke('mcp_stop', {server}),
    listTools: (server: MCPServer) => invoke('mcp_list_tools', {server}),
    callTool: ({server, name, args}: { server: MCPServer; name: string; args: any }) => invoke('mcp_call_tool', {
      server,
      name,
      args
    })
  },
  copilot: {
    getAuthMessage: (headers?: Record<string, string>) => CopilotService.getAuthMessage(headers),
    getCopilotToken: (device_code: string, headers?: Record<string, string>) =>
      CopilotService.getCopilotToken(device_code, headers),
    saveCopilotToken: (access_token: string) => CopilotService.saveCopilotToken(access_token),
    getToken: (headers?: Record<string, string>) => CopilotService.getToken(headers),
    logout: () => CopilotService.logout(),
    getUser: (token: string) => CopilotService.getUser(token)
  }
}
// @ts-ignore
window.api = api
