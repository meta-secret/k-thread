import type { Doc, DocId } from '../types'
import { folderOf, labelOf } from './graphView'

export const StructureKind = {
  Root: 'root',
  Folder: 'folder',
  Note: 'note',
} as const
export type StructureKind = (typeof StructureKind)[keyof typeof StructureKind]

export type StructureNode = {
  id: string
  kind: StructureKind
  title: string
  meta: string
  depth: number
  noteId: DocId | ''
  folderPath: string
}

export type StructureEdge = {
  from: string
  to: string
}

export type StructureGraph = {
  nodes: StructureNode[]
  edges: StructureEdge[]
}

const ROOT_ID = '__vault__'

const parentFolder = (folderPath: string): string => {
  if (!folderPath.includes('/')) return ''
  return folderPath.split('/').slice(0, -1).join('/')
}

const countNotesUnder = (folderPath: string, docs: readonly Doc[]): number => {
  if (folderPath.length === 0) return docs.length
  const prefix = `${folderPath}/`
  return docs.filter((d) => d.id === folderPath || d.id.startsWith(prefix) || folderOf(d.id) === folderPath)
    .length
}

/** Hierarchy-only graph: vault root → folders → notes (no wikilink edges). */
export const buildStructureGraph = (
  docs: readonly Doc[],
  folders: readonly string[],
  focusFolder: string = '',
): StructureGraph => {
  const folderSet = new Set<string>()
  for (const f of folders) {
    if (f.length === 0) continue
    folderSet.add(f)
    let walked = ''
    for (const part of f.split('/')) {
      walked = walked.length === 0 ? part : `${walked}/${part}`
      folderSet.add(walked)
    }
  }
  for (const d of docs) {
    const folder = folderOf(d.id)
    if (folder.length === 0) continue
    folderSet.add(folder)
    let walked = ''
    for (const part of folder.split('/')) {
      walked = walked.length === 0 ? part : `${walked}/${part}`
      folderSet.add(walked)
    }
  }

  const inFocus = (path: string, noteId: DocId | ''): boolean => {
    if (focusFolder.length === 0) return true
    if (noteId.length > 0) {
      return noteId === focusFolder || noteId.startsWith(`${focusFolder}/`) || folderOf(noteId) === focusFolder
        || folderOf(noteId).startsWith(`${focusFolder}/`)
    }
    return path === focusFolder || path.startsWith(`${focusFolder}/`) || focusFolder.startsWith(`${path}/`)
      || path.length === 0
  }

  const nodes: StructureNode[] = []
  const edges: StructureEdge[] = []

  nodes.push({
    id: ROOT_ID,
    kind: StructureKind.Root,
    title: 'Vault',
    meta: `${docs.length} notes`,
    depth: 0,
    noteId: '',
    folderPath: '',
  })

  const sortedFolders = [...folderSet].sort((a, b) => a.localeCompare(b))
  for (const path of sortedFolders) {
    if (!inFocus(path, '')) continue
    const depth = path.split('/').filter((p) => p.length > 0).length
    const id = `folder:${path}`
    nodes.push({
      id,
      kind: StructureKind.Folder,
      title: labelOf(path),
      meta: `${countNotesUnder(path, docs)} notes`,
      depth,
      noteId: '',
      folderPath: path,
    })
    const parent = parentFolder(path)
    edges.push({
      from: parent.length === 0 ? ROOT_ID : `folder:${parent}`,
      to: id,
    })
  }

  const sortedDocs = [...docs].sort((a, b) => a.id.localeCompare(b.id))
  for (const doc of sortedDocs) {
    if (!inFocus(folderOf(doc.id), doc.id)) continue
    const folder = folderOf(doc.id)
    const depth = folder.length === 0 ? 1 : folder.split('/').filter((p) => p.length > 0).length + 1
    const id = `note:${doc.id}`
    nodes.push({
      id,
      kind: StructureKind.Note,
      title: labelOf(doc.id),
      meta: folder.length > 0 ? folder : 'root',
      depth,
      noteId: doc.id,
      folderPath: folder,
    })
    edges.push({
      from: folder.length === 0 ? ROOT_ID : `folder:${folder}`,
      to: id,
    })
  }

  return { nodes, edges }
}

export type PlacedStructureNode = StructureNode & { x: number; y: number }

export const WIDGET_W = 200
export const WIDGET_H = 72

/** Top-down stage: depth = row, siblings fan horizontally. */
export const placeStructureStage = (
  graph: StructureGraph,
  width: number,
  height: number,
): { nodes: PlacedStructureNode[]; edges: StructureEdge[] } => {
  if (graph.nodes.length === 0) return { nodes: [], edges: [] }

  let maxDepth = 0
  for (const n of graph.nodes) maxDepth = Math.max(maxDepth, n.depth)

  const rows: StructureNode[][] = Array.from({ length: maxDepth + 1 }, () => [])
  for (const n of graph.nodes) {
    rows[n.depth]?.push(n)
  }
  for (const row of rows) {
    row.sort((a, b) => {
      if (a.kind !== b.kind) {
        if (a.kind === StructureKind.Root) return -1
        if (b.kind === StructureKind.Root) return 1
        if (a.kind === StructureKind.Folder) return -1
        if (b.kind === StructureKind.Folder) return 1
      }
      return a.title.localeCompare(b.title)
    })
  }

  const rowGap = Math.max(110, Math.min(140, (height - 100) / Math.max(rows.length, 1)))
  const colGap = WIDGET_W + 40
  const originY = Math.max(64, (height - rowGap * Math.max(rows.length - 1, 0)) / 2)
  const midX = width / 2

  const placed: PlacedStructureNode[] = []
  rows.forEach((row, di) => {
    const blockW = Math.max(0, (row.length - 1) * colGap)
    const startX = midX - blockW / 2
    row.forEach((n, ri) => {
      placed.push({
        ...n,
        x: startX + ri * colGap,
        y: originY + di * rowGap,
      })
    })
  })

  const ids = new Set(placed.map((n) => n.id))
  const edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  return { nodes: placed, edges }
}

export const structurePort = (
  n: PlacedStructureNode,
  side: 'in' | 'out',
): { x: number; y: number } => ({
  x: n.x,
  y: n.y + (side === 'out' ? WIDGET_H / 2 : -WIDGET_H / 2),
})
