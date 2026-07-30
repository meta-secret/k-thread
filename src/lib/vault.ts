import { err, ok, type AppError, type Doc, type Result } from '../types'
import { clearVault, listMarkdown, readText, writeText } from './opfs'
import { buildIndex, INDEX_PATH, serializeIndex } from './graph'
import { idFromPath, pathFromId, titleFromPath } from './wikilink'

const SKIP_DIRS = new Set(['.obsidian', '.git', '.trash', 'node_modules'])

const walkDirectory = async (
  dir: FileSystemDirectoryHandle,
  prefix: string,
): Promise<Result<Doc[], AppError>> => {
  const docs: Doc[] = []
  try {
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'directory') {
        if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
        const nested = await walkDirectory(handle, prefix.length === 0 ? name : `${prefix}/${name}`)
        if (nested.tag === 'err') return nested
        docs.push(...nested.value)
        continue
      }
      if (!name.endsWith('.md')) continue
      const path = prefix.length === 0 ? name : `${prefix}/${name}`
      const file = await handle.getFile()
      const body = await file.text()
      const id = idFromPath(path)
      docs.push({ id, path, title: titleFromPath(path), body })
    }
    return ok(docs)
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Vault walk failed' })
  }
}

export const pickLocalVault = async (): Promise<Result<Doc[], AppError>> => {
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

export const importDocsToOpfs = async (docs: readonly Doc[]): Promise<Result<true, AppError>> => {
  const cleared = await clearVault()
  if (cleared.tag === 'err') return cleared

  for (const doc of docs) {
    const written = await writeText(doc.path, doc.body)
    if (written.tag === 'err') return written
  }

  const index = buildIndex(docs)
  return writeText(INDEX_PATH, serializeIndex(index))
}

export const loadDocsFromOpfs = async (): Promise<Result<Doc[], AppError>> => {
  const listed = await listMarkdown()
  if (listed.tag === 'err') return listed

  const docs: Doc[] = []
  for (const path of listed.value) {
    if (path === INDEX_PATH) continue
    const text = await readText(path)
    if (text.tag === 'err') return text
    const id = idFromPath(path)
    docs.push({ id, path, title: titleFromPath(path), body: text.value })
  }
  return ok(docs)
}

export const saveDoc = async (doc: Doc): Promise<Result<true, AppError>> => writeText(pathFromId(doc.id), doc.body)

export const persistIndex = async (docs: readonly Doc[]): Promise<Result<true, AppError>> =>
  writeText(INDEX_PATH, serializeIndex(buildIndex(docs)))
