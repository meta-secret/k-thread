import { parse, stringify } from 'yaml'
import {
  err,
  ok,
  type AppError,
  type Doc,
  type DocId,
  type GraphEdge,
  type GraphIndex,
  type Result,
} from '../types'
import { extractWikilinks, resolveWikilink } from './wikilink'

export const INDEX_PATH = 'index.yaml'

export const emptyIndex = (): GraphIndex => ({
  version: 1,
  folders: [],
  nodes: [],
  edges: [],
})

export const buildIndex = (docs: readonly Doc[], folders: readonly string[] = []): GraphIndex => {
  const known = new Set(docs.map((d) => d.id))
  const edges: GraphEdge[] = []
  const edgeKey = new Set<string>()
  const folderSet = new Set(folders.filter((f) => f.length > 0))

  for (const doc of docs) {
    const parts = doc.id.split('/').filter((p) => p.length > 0)
    let walked = ''
    for (const part of parts.slice(0, -1)) {
      walked = walked.length === 0 ? part : `${walked}/${part}`
      folderSet.add(walked)
    }
    for (const target of extractWikilinks(doc.body)) {
      const to = resolveWikilink(target, known)
      const key = `${doc.id}->${to}`
      if (edgeKey.has(key)) continue
      edgeKey.add(key)
      edges.push({ from: doc.id, to })
      if (!known.has(to)) known.add(to)
    }
  }

  return {
    version: 1,
    folders: [...folderSet].sort(),
    nodes: [...known].sort(),
    edges,
  }
}

export const serializeIndex = (index: GraphIndex): string =>
  stringify(index, { sortMapEntries: true })

export const parseIndex = (text: string): Result<GraphIndex, AppError> => {
  try {
    const raw: unknown = parse(text)
    if (typeof raw !== 'object' || !raw || Array.isArray(raw)) {
      return err({ kind: 'parse', detail: 'index.yaml must be a mapping' })
    }
    const record = raw as Record<string, unknown>
    if (record.version !== 1) {
      return err({ kind: 'parse', detail: 'Unsupported index.yaml version' })
    }
    const folders = Array.isArray(record.folders)
      ? record.folders.filter((n): n is string => typeof n === 'string')
      : []
    const nodes = Array.isArray(record.nodes)
      ? record.nodes.filter((n): n is DocId => typeof n === 'string')
      : []
    const edges: GraphEdge[] = []
    if (Array.isArray(record.edges)) {
      for (const item of record.edges) {
        if (typeof item !== 'object' || !item) continue
        const e = item as Record<string, unknown>
        if (typeof e.from === 'string' && typeof e.to === 'string') {
          edges.push({ from: e.from, to: e.to })
        }
      }
    }
    return ok({ version: 1, folders, nodes, edges })
  } catch (e) {
    return err({ kind: 'parse', detail: e instanceof Error ? e.message : 'YAML parse failed' })
  }
}
