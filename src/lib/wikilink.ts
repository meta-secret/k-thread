import { err, ok, type AppError, type DocId, type Result } from '../types'

/** [[target]], [[target|alias]], [[target#heading]] */
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g

const leafName = (id: DocId): string => {
  const parts = id.split('/')
  const last = parts[parts.length - 1]
  return typeof last === 'string' ? last : id
}

export const normalizeNoteId = (raw: string): Result<DocId, AppError> => {
  const trimmed = raw.trim().replace(/\\/g, '/')
  const withoutExt = trimmed.toLowerCase().endsWith('.md') ? trimmed.slice(0, -3) : trimmed
  const parts = withoutExt
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '.' && part !== '..')
  if (parts.length === 0) {
    return err({ kind: 'parse', detail: 'Note name is required' })
  }
  const id = parts.join('/')
  if (/[<>:"|?*\u0000]/.test(id)) {
    return err({ kind: 'parse', detail: 'Note name has invalid characters' })
  }
  return ok(id)
}

export const extractWikilinks = (body: string): DocId[] => {
  const ids: DocId[] = []
  const seen = new Set<string>()
  for (const match of body.matchAll(WIKILINK)) {
    const raw = match[1]
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (id.length === 0 || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

export const resolveWikilink = (target: string, known: ReadonlySet<DocId>): DocId => {
  if (known.has(target)) return target
  const lower = target.toLowerCase()
  for (const id of known) {
    if (id.toLowerCase() === lower) return id
  }
  const base = leafName(target)
  for (const id of known) {
    if (leafName(id).toLowerCase() === base.toLowerCase()) return id
  }
  return target
}

export const titleFromPath = (path: string): string => {
  const file = path.endsWith('.md') ? path.slice(0, -3) : path
  return leafName(file)
}

export const idFromPath = (path: string): DocId =>
  path.endsWith('.md') ? path.slice(0, -3) : path

export const pathFromId = (id: DocId): string => `${id}.md`
