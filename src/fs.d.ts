interface Window {
  showDirectoryPicker: (options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  }) => Promise<FileSystemDirectoryHandle>
}

interface FileSystemDirectoryHandle {
  entries: () => AsyncIterableIterator<[string, FileSystemHandle]>
  values: () => AsyncIterableIterator<FileSystemHandle>
  keys: () => AsyncIterableIterator<string>
}
