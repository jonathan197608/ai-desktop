import type {FileMetadataResponse, ListFilesResponse, UploadFileResponse} from '@google/generative-ai/server'
import type {MCPServer, MCPTool} from '@/types'
import {AppInfo, FileType} from '@/types'
import type {Store} from '@tauri-apps/plugin-store'
import type {DownloadEvent, Update as UpdateInfo} from '@tauri-apps/plugin-updater'

declare global {
  interface String {
    replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  }
  interface Array<T> {
    findLastIndex(
      predicate: (value: T, index: number, obj: T[]) => unknown,
      thisArg?: any
    ): number
  }

  interface Window {
    isMac: boolean,
    isWindows: boolean,
    configStore: Store,
    copilotStore: Store,
    api: {
      getAppInfo: () => Promise<AppInfo>
      checkForUpdate: () => Promise<UpdateInfo | null>
      showUpdateDialog: (info: UpdateInfo, onProgress: (progress: DownloadEvent) => void) => Promise<void>
      openWebsite: (url: string) => void
      setLaunchOnBoot: (isActive: boolean) => Promise<void>
      file: {
        select: (options?: OpenDialogOptions) => Promise<FileType[] | null>
        upload: (file: FileType) => Promise<FileType>
        delete: (fileId: string) => Promise<void>
        read: (fileId: string) => Promise<string>
        clear: () => Promise<void>
        get: (filePath: string) => Promise<FileType | null>
        write: (filePath: string, data: string) => Promise<string>
        openPath: (path: string) => Promise<void>
        save: (
          path: string,
          content: string | NodeJS.ArrayBufferView
        ) => Promise<string | null>
        base64Image: (fileId: string) => Promise<{ mime: string; base64: string; data: string }>
        download: (url: string) => Promise<FileType | null>
        binaryFile: (fileId: string) => Promise<{ data: ArrayBuffer; mime: string }>
      }
      shortcuts: {
        update: (shortcuts: Shortcut[]) => Promise<void>
      }
      config: {
        set: (key: string, value: any) => Promise<void>
        get: (key: string) => Promise<any>
      }
      mcp: {
        startServer: (server: MCPServer) => Promise<void>
        stopServer: (server: MCPServer) => Promise<void>
        listTools: (server: MCPServer) => Promise<MCPTool[]>
        callTool: ({server, name, args}: { server: MCPServer; name: string; args: any }) => Promise<any>
      }
      copilot: {
        getAuthMessage: (
          headers?: Record<string, string>
        ) => Promise<{ device_code: string; user_code: string; verification_uri: string }>
        getCopilotToken: (device_code: string, headers?: Record<string, string>) => Promise<{ access_token: string }>
        saveCopilotToken: (access_token: string) => Promise<void>
        getToken: (headers?: Record<string, string>) => Promise<{ token: string }>
        logout: () => Promise<void>
        getUser: (token: string) => Promise<{ login: string; avatar: string }>
      }
    }
  }
}
