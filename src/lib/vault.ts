import { err, ok, type AppError, type Doc, type Result } from '../types'
import { buildIndex, INDEX_PATH, parseIndex, serializeIndex } from './graph'
import { clearVault, ensureDir, listVault, readText, writeText } from './opfs'
import { idFromPath, pathFromId, titleFromPath } from './wikilink'

const SKIP_DIRS = new Set(['.obsidian', '.git', '.trash', 'node_modules'])

export type VaultData = {
  docs: Doc[]
  folders: string[]
}

const walkDirectory = async (
  dir: FileSystemDirectoryHandle,
  prefix: string,
): Promise<Result<VaultData, AppError>> => {
  const docs: Doc[] = []
  const folders: string[] = []
  try {
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'directory') {
        if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
        const path = prefix.length === 0 ? name : `${prefix}/${name}`
        folders.push(path)
        const nested = await walkDirectory(handle, path)
        if (nested.tag === 'err') return nested
        docs.push(...nested.value.docs)
        folders.push(...nested.value.folders)
        continue
      }
      if (!name.endsWith('.md')) continue
      const path = prefix.length === 0 ? name : `${prefix}/${name}`
      const file = await handle.getFile()
      const body = await file.text()
      const id = idFromPath(path)
      docs.push({ id, path, title: titleFromPath(path), body })
    }
    return ok({ docs, folders: [...new Set(folders)].sort() })
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Vault walk failed' })
  }
}

export const pickLocalVault = async (): Promise<Result<VaultData, AppError>> => {
  if (!('showDirectoryPicker' in window)) {
    return err({
      kind: 'unsupported',
      detail: 'File System Access API is required to open a local Obsidian vault',
    })
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' })
    return walkDirectory(handle, '')
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return err({ kind: 'io', detail: 'Vault picker cancelled' })
    }
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Failed to open vault' })
  }
}

export const importVaultToOpfs = async (data: VaultData): Promise<Result<true, AppError>> => {
  const cleared = await clearVault()
  if (cleared.tag === 'err') return cleared

  for (const folder of data.folders) {
    const made = await ensureDir(folder)
    if (made.tag === 'err') return made
  }

  for (const doc of data.docs) {
    const written = await writeText(doc.path, doc.body)
    if (written.tag === 'err') return written
  }

  return writeText(INDEX_PATH, serializeIndex(buildIndex(data.docs, data.folders)))
}

export const loadVaultFromOpfs = async (): Promise<Result<VaultData, AppError>> => {
  const listed = await listVault()
  if (listed.tag === 'err') return listed

  const docs: Doc[] = []
  for (const path of listed.value.files) {
    if (path === INDEX_PATH) continue
    const text = await readText(path)
    if (text.tag === 'err') return text
    const id = idFromPath(path)
    docs.push({ id, path, title: titleFromPath(path), body: text.value })
  }

  const indexText = await readText(INDEX_PATH)
  const fromIndex =
    indexText.tag === 'ok'
      ? parseIndex(indexText.value)
      : ok({ version: 1 as const, folders: [], nodes: [], edges: [] })
  const indexedFolders = fromIndex.tag === 'ok' ? fromIndex.value.folders : []

  return ok({
    docs,
    folders: [...new Set([...listed.value.folders, ...indexedFolders])].sort(),
  })
}

export const saveDoc = async (doc: Doc): Promise<Result<true, AppError>> =>
  writeText(pathFromId(doc.id), doc.body)

export const persistIndex = async (
  docs: readonly Doc[],
  folders: readonly string[],
): Promise<Result<true, AppError>> =>
  writeText(INDEX_PATH, serializeIndex(buildIndex(docs, folders)))

export const createFolderInOpfs = async (path: string): Promise<Result<true, AppError>> =>
  ensureDir(path)
