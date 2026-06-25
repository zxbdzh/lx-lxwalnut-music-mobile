declare module 'react-native-file-system' {
  export type FileType = any
  export const Dirs: { CacheDir: string; SDCardDir: string; DocumentDir: string }
  export const FileSystem: any
  export const AndroidScoped: {
    openDocumentTree: (persist?: boolean) => Promise<any>
    openDocument: (options: any) => Promise<any>
    releasePersistableUriPermission: (uri: string) => Promise<void>
    getPersistedUriPermissions: () => Promise<any[]>
  }
  export type OpenDocumentOptions = any
  export type Encoding = any
  export type HashAlgorithm = any
  export function getExternalStoragePaths(is_removable?: boolean): Promise<string[]>
  export function existsItem(path: string): Promise<boolean>
  export function readDir(path: string): Promise<any[]>
  export function mkdir(path: string): Promise<void>
  export function unlink(path: string): Promise<void>
  export function copyFile(src: string, dest: string): Promise<void>
  export function moveFile(src: string, dest: string): Promise<void>
  export function readFile(path: string): Promise<string>
  export function writeFile(path: string, content: string): Promise<void>
  export function appendFile(path: string, content: string): Promise<void>
  export function stat(path: string): Promise<any>
  export function downloadFile(options: any): any
  export function stopDownload(resumable: any): void
  export type Resumable = any
}
