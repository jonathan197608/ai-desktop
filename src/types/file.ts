import {audioExts, documentExts, imageExts, textExts, videoExts} from '@/shared/config/constant'
import {FileType, FileTypes} from '@/types'
import {invoke} from '@tauri-apps/api/core';
import {open, OpenDialogOptions, save, SaveDialogOptions} from "@tauri-apps/plugin-dialog";
import {
  BaseDirectory,
  copyFile,
  exists,
  mkdir,
  readDir,
  readTextFile,
  stat,
  writeTextFile,
  writeFile as writeBinFile,
  open as openFile
} from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import {fetch} from '@tauri-apps/plugin-http';
import {v4 as uuidv4} from "uuid";
import {base64ToUint8Array, uint8ArrayToBase64} from "uint8array-extras";

// 创建文件类型映射表，提高查找效率
const fileTypeMap = new Map<string, FileTypes>()

// 初始化映射表
initFileTypeMap()

// 初始化映射表
function initFileTypeMap() {
  imageExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.IMAGE))
  videoExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.VIDEO))
  audioExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.AUDIO))
  textExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.TEXT))
  documentExts.forEach((ext) => fileTypeMap.set(ext, FileTypes.DOCUMENT))
}

function getFileType(ext: string): FileTypes {
  ext = ext.toLowerCase()
  return fileTypeMap.get(ext) || FileTypes.OTHER
}

export async function getTempPath(fileName: string) {
  return await path.join(await path.tempDir(), 'AIDesktop', fileName)
}

export function getBaseDir() {
  return BaseDirectory.AppData
}

export function getDataPath(fileName: string) {
  return path.join('Data', 'Files', fileName)
}

export async function getDataPathFull(fileName: string) {
  return path.join(await path.appDataDir(), await getDataPath(fileName))
}

async function getExt(filePath: string) {
  return '.' + (await path.extname(filePath)).toLowerCase()
}

export async function makeFile(filePath: string, uuid?: string): Promise<FileType> {
  const stats = await stat(filePath)
  const ext = await getExt(filePath)
  const fileType = getFileType(ext)
  return {
    id: uuid || uuidv4(),
    origin_name: await path.basename(filePath),
    name: await path.basename(filePath),
    path: filePath,
    created_at: (stats.birthtime || new Date()).toISOString(),
    size: stats.size,
    ext: ext,
    type: fileType,
    count: 1
  }
}

export async function selectFiles(options?: OpenDialogOptions) {
  const selected = await open(options);
  if (selected === null) {
    return [];
  }
  if (Array.isArray(selected)) {
    return await Promise.all(selected.map(async (filePath: string) => await makeFile(filePath)))
  }
  return [await makeFile(selected)];
}

async function findDuplicateFile(filePath: string): Promise<FileType | null> {
  const stats = await stat(filePath)
  const fileSize = stats.size
  const storageDir = await getDataPath('');
  const baseDir = getBaseDir();

  const files = await readDir(storageDir, {baseDir})
  for (const file of files) {
    const storedFilePath = await path.join(storageDir, file.name)
    const storedStats = await stat(storedFilePath, {baseDir})
    if (storedStats.size === fileSize) {
      const fullPath = await path.join(await path.appDataDir(), storedFilePath)
      const [originalHash, storedHash] = await Promise.all([
        invoke('get_hash', {filePath}),
        invoke('get_hash', {filePath: fullPath})
      ])
      if (originalHash === storedHash) {
        const ext = await getExt(file.name)
        const id = await path.basename(file.name, ext)
        return {
          id,
          origin_name: file.name,
          name: id + ext,
          path: fullPath,
          created_at: (storedStats.birthtime || new Date).toISOString(),
          size: storedStats.size,
          ext,
          type: getFileType(ext),
          count: 2
        }
      }
    }
  }
  return null
}

export async function uploadFile(filePath: string): Promise<FileType> {
  const storageDir = await getDataPath('');
  const baseDir = getBaseDir();

  if (!await exists(storageDir, {baseDir})) {
    await mkdir(storageDir, {baseDir, recursive: true})
  }

  const duplicateFile = await findDuplicateFile(filePath)
  if (duplicateFile) {
    return duplicateFile
  }

  const uuid = uuidv4()
  const origin_name = await path.basename(filePath)
  const ext = await getExt(origin_name)
  const destPath = await path.join(storageDir, uuid + ext)

  await copyFile(filePath, destPath, {toPathBaseDir: baseDir})
  return makeFile(await path.join(await path.appDataDir(), destPath), uuid)
}

export async function readFile(fileId: string): Promise<string> {
  if (documentExts.includes(await getExt(fileId))) {
    const filePath = await getDataPathFull(fileId)
    return await invoke('get_content', {filePath})
  }
  return await readTextFile(await getDataPath(fileId), {baseDir: getBaseDir()})
}

export async function writeFile(fileName: string, data: string): Promise<string> {
  await writeTextFile(fileName, data, {baseDir: getBaseDir()})
  return await path.join(await path.appDataDir(), fileName)
}

export async function readBase64File(filePath: string): Promise<{ mime: string, base64: string, data: string }> {
  const fileHandle = await openFile(filePath, {
    read: true,
    baseDir: BaseDirectory.AppData,
  })
  const stat = await fileHandle.stat()
  const buf = new Uint8Array(stat.size)
  await fileHandle.read(buf)
  const base64: string = uint8ArrayToBase64(buf);
  await fileHandle.close()
  const ext = (await getExt(filePath)).slice(1)
  const ext2 = ext === 'jpg' ? 'jpeg' : ext
  const mime = `image/${ext2}`
  return {
    mime,
    base64,
    data: `data:${mime};base64,${base64}`
  }
}

export async function saveFile(
  fileName: string,
  content: string,
  options?: SaveDialogOptions
): Promise<string | null> {
  try {
    const path = await save({
      title: '保存文件',
      defaultPath: fileName,
      ...options
    })

    if (path) {
      await writeTextFile(path, content)
    }

    return path
  } catch (err) {
    console.error('An error occurred saving the file:', err)
    return null
  }
}

export async function readBinaryFile(filePath: string): Promise<{ data: ArrayBuffer; mime: string }> {
  const fileHandle = await openFile(filePath, {
    read: true,
    baseDir: BaseDirectory.AppData,
  })
  const stat = await fileHandle.stat()
  const buf = new Uint8Array(stat.size)
  await fileHandle.read(buf)
  const ext = (await getExt(filePath)).slice(1)
  const mime = `image/${ext}`
  return {data: buf.buffer, mime}
}

function getExtensionFromMimeType(mimeType: string | null): string {
  if (!mimeType) return '.bin'

  const mimeToExtension: { [key: string]: string } = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'application/octet-stream': '.bin'
  }
  return mimeToExtension[mimeType] || '.bin'
}

export async function downloadFile(url: string): Promise<FileType> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  // 尝试从Content-Disposition获取文件名
  const contentDisposition = response.headers.get('Content-Disposition')
  let fileName = 'download'

  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
    if (filenameMatch) {
      fileName = filenameMatch[1]
    }
  }

  // 如果URL中有文件名，使用URL中的文件名
  const urlFilename = url.split('/').pop()?.split('?')[0]
  if (urlFilename && urlFilename.includes('.')) {
    fileName = urlFilename
  }

  // 如果文件名没有后缀，根据Content-Type添加后缀
  let ext = ".jpg"
  if (!fileName.includes('.')) {
    const contentType = response.headers.get('Content-Type')
    ext = getExtensionFromMimeType(contentType)
  }
  const uuid = uuidv4()
  const filePath = await getDataPath(uuid + ext)
  await writeBinFile(filePath, new Uint8Array(await response.arrayBuffer()), {baseDir: getBaseDir()})
  return makeFile(await getDataPathFull(uuid + ext), uuid)
}

export async function saveImage(name: string, data: string): Promise<void> {
  try {
    const filePath = await save({
      title: '保存图片',
      defaultPath: `${name}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })

    if (filePath) {
      const base64Data = data.replace(/^data:image\/png;base64,/, '')
      await writeBinFile(filePath, base64ToUint8Array(base64Data))
    }
  } catch (error) {
    console.error('An error occurred saving the image:', error)
  }
}
