import type { DocId } from '../types'

/** [[target]], [[target|alias]], [[target#heading]] */
const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g

const leafName = (id: DocId): string => {
  const parts = id.split('/')
  const last = parts[parts.length - 1]
  return typeof last === 'string' ? last : id
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
  const leaf = file.includes('/') ? file.split('/').pop()! : file
  return leaf
}

export const idFromPath = (path: string): DocId =>
  path.endsWith('.md') ? path.slice(0, -3) : path

export const pathFromId = (id: DocId): string => `${id}.md`
