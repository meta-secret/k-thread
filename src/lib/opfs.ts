import { err, ok, type Result, type AppError } from '../types'

const ROOT = 'vault'

const getRoot = async (): Promise<Result<FileSystemDirectoryHandle, AppError>> => {
  if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
    return err({ kind: 'unsupported', detail: 'OPFS is not available in this browser' })
  }
  try {
    const opfs = await navigator.storage.getDirectory()
    const vault = await opfs.getDirectoryHandle(ROOT, { create: true })
    return ok(vault)
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'OPFS open failed' })
  }
}

const resolvePath = async (
  root: FileSystemDirectoryHandle,
  path: string,
  create: boolean,
): Promise<Result<{ dir: FileSystemDirectoryHandle; name: string }, AppError>> => {
  const parts = path.split('/').filter((p) => p.length > 0)
  const name = parts[parts.length - 1]
  if (typeof name !== 'string') {
    return err({ kind: 'io', detail: 'Empty path' })
  }
  let dir = root
  try {
    for (const part of parts.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(part, { create })
    }
    return ok({ dir, name })
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Failed to resolve path' })
  }
}

export const writeText = async (path: string, text: string): Promise<Result<true, AppError>> => {
  const root = await getRoot()
  if (root.tag === 'err') return root
  const parent = await resolvePath(root.value, path, true)
  if (parent.tag === 'err') return parent
  try {
    const file = await parent.value.dir.getFileHandle(parent.value.name, { create: true })
    const writable = await file.createWritable()
    await writable.write(text)
    await writable.close()
    return ok(true)
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Write failed' })
  }
}

export const readText = async (path: string): Promise<Result<string, AppError>> => {
  const root = await getRoot()
  if (root.tag === 'err') return root
  const parent = await resolvePath(root.value, path, false)
  if (parent.tag === 'err') return parent
  try {
    const file = await parent.value.dir.getFileHandle(parent.value.name)
    const blob = await file.getFile()
    return ok(await blob.text())
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Read failed' })
  }
}

export const listMarkdown = async (): Promise<Result<string[], AppError>> => {
  const root = await getRoot()
  if (root.tag === 'err') return root
  const paths: string[] = []

  const walk = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<Result<true, AppError>> => {
    try {
      for await (const [name, handle] of dir.entries()) {
        const next = prefix.length === 0 ? name : `${prefix}/${name}`
        if (handle.kind === 'directory') {
          if (name === '.obsidian' || name.startsWith('.')) continue
          const nested = await walk(handle, next)
          if (nested.tag === 'err') return nested
        } else if (name.endsWith('.md')) {
          paths.push(next)
        }
      }
      return ok(true)
    } catch (e) {
      return err({ kind: 'io', detail: e instanceof Error ? e.message : 'List failed' })
    }
  }

  const walked = await walk(root.value, '')
  if (walked.tag === 'err') return walked
  return ok(paths.sort())
}

export const clearVault = async (): Promise<Result<true, AppError>> => {
  if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
    return err({ kind: 'unsupported', detail: 'OPFS is not available in this browser' })
  }
  try {
    const opfs = await navigator.storage.getDirectory()
    await opfs.removeEntry(ROOT, { recursive: true })
    await opfs.getDirectoryHandle(ROOT, { create: true })
    return ok(true)
  } catch (e) {
    return err({ kind: 'io', detail: e instanceof Error ? e.message : 'Clear failed' })
  }
}
