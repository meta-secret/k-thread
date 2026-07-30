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
  index: number
  noteId: DocId | ''
  folderPath: string
  isCollapsed?: boolean
  childCount?: number
}

export type StructureEdge = {
  from: string
  to: string
}

export type StructureGraph = {
  nodes: StructureNode[]
  edges: StructureEdge[]
  rootId: string
}

export const ROOT_ID = '__vault__'

export const WIDGET_W = 236
export const WIDGET_H = 76
const COL_GAP = 28
const ROW_GAP = 48

const parentFolder = (folderPath: string): string => {
  if (!folderPath.includes('/')) return ''
  return folderPath.split('/').slice(0, -1).join('/')
}

const countNotesUnder = (folderPath: string, docs: readonly Doc[]): number => {
  if (folderPath.length === 0) return docs.length
  const prefix = `${folderPath}/`
  return docs.filter(
    (d) => d.id.startsWith(prefix) || folderOf(d.id) === folderPath,
  ).length
}

const inFocus = (focusFolder: string, path: string, noteId: DocId | ''): boolean => {
  if (focusFolder.length === 0) return true
  if (noteId.length > 0) {
    const folder = folderOf(noteId)
    return (
      noteId === focusFolder
      || noteId.startsWith(`${focusFolder}/`)
      || folder === focusFolder
      || folder.startsWith(`${focusFolder}/`)
    )
  }
  return (
    path.length === 0
    || path === focusFolder
    || path.startsWith(`${focusFolder}/`)
    || focusFolder.startsWith(`${path}/`)
  )
}

/** Check if any ancestor folder of this path is collapsed. */
const isAncestorCollapsed = (path: string, collapsedFolders: ReadonlySet<string>): boolean => {
  if (!path.includes('/')) return false
  const parts = path.split('/')
  let walked = ''
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!p) continue
    walked = walked.length === 0 ? p : `${walked}/${p}`
    if (collapsedFolders.has(walked)) return true
  }
  return false
}

/** Hierarchy-only graph: vault → folders → notes (no wikilink edges). */
export const buildStructureGraph = (
  docs: readonly Doc[],
  folders: readonly string[],
  focusFolder: string = '',
  collapsedFolders: ReadonlySet<string> = new Set(),
): StructureGraph => {
  const folderSet = new Set<string>()
  for (const f of folders) {
    if (f.length === 0) continue
    let walked = ''
    for (const part of f.split('/')) {
      walked = walked.length === 0 ? part : `${walked}/${part}`
      folderSet.add(walked)
    }
  }
  for (const d of docs) {
    const folder = folderOf(d.id)
    if (folder.length === 0) continue
    let walked = ''
    for (const part of folder.split('/')) {
      walked = walked.length === 0 ? part : `${walked}/${part}`
      folderSet.add(walked)
    }
  }

  const nodes: StructureNode[] = []
  const edges: StructureEdge[] = []
  let counter = 0

  nodes.push({
    id: ROOT_ID,
    kind: StructureKind.Root,
    title: 'Vault',
    meta: `${docs.length} notes · project home`,
    depth: 0,
    index: ++counter,
    noteId: '',
    folderPath: '',
    isCollapsed: collapsedFolders.has(''),
    childCount: docs.length,
  })

  for (const path of [...folderSet].sort((a, b) => a.localeCompare(b))) {
    if (!inFocus(focusFolder, path, '')) continue
    if (isAncestorCollapsed(path, collapsedFolders)) continue

    const depth = path.split('/').filter((p) => p.length > 0).length
    const id = `folder:${path}`
    const n = countNotesUnder(path, docs)
    const isCollapsed = collapsedFolders.has(path)

    nodes.push({
      id,
      kind: StructureKind.Folder,
      title: labelOf(path),
      meta: isCollapsed ? `${n} notes (collapsed)` : n === 1 ? '1 note' : `${n} notes`,
      depth,
      index: ++counter,
      noteId: '',
      folderPath: path,
      isCollapsed,
      childCount: n,
    })
    const parent = parentFolder(path)
    edges.push({
      from: parent.length === 0 ? ROOT_ID : `folder:${parent}`,
      to: id,
    })
  }

  for (const doc of [...docs].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!inFocus(focusFolder, folderOf(doc.id), doc.id)) continue
    const folder = folderOf(doc.id)
    if (folder.length > 0 && (collapsedFolders.has(folder) || isAncestorCollapsed(folder, collapsedFolders))) {
      continue
    }

    const depth = folder.length === 0 ? 1 : folder.split('/').filter((p) => p.length > 0).length + 1
    const id = `note:${doc.id}`
    nodes.push({
      id,
      kind: StructureKind.Note,
      title: labelOf(doc.id),
      meta: folder.length > 0 ? folder : 'Open to edit',
      depth,
      index: ++counter,
      noteId: doc.id,
      folderPath: folder,
    })
    edges.push({
      from: folder.length === 0 ? ROOT_ID : `folder:${folder}`,
      to: id,
    })
  }

  return { nodes, edges, rootId: ROOT_ID }
}

export type PlacedStructureNode = StructureNode & { x: number; y: number }

type TreeNode = StructureNode & {
  children: TreeNode[]
  subtreeW: number
  x: number
  y: number
}

/** Parent-aligned tidy tree — children sit under their parent (funnel, not flat rows). */
export const placeStructureStage = (
  graph: StructureGraph,
  _width: number,
  _height: number,
): { nodes: PlacedStructureNode[]; edges: StructureEdge[]; bounds: { minX: number; maxX: number; minY: number; maxY: number; contentW: number; contentH: number } } => {
  if (graph.nodes.length === 0) {
    return { nodes: [], edges: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, contentW: 0, contentH: 0 } }
  }

  const byId = new Map<string, TreeNode>()
  for (const n of graph.nodes) {
    byId.set(n.id, { ...n, children: [], subtreeW: WIDGET_W, x: 0, y: 0 })
  }

  const childIds = new Set<string>()
  for (const e of graph.edges) {
    const parent = byId.get(e.from)
    const child = byId.get(e.to)
    if (!parent || !child) continue
    parent.children.push(child)
    childIds.add(child.id)
  }

  for (const n of byId.values()) {
    n.children.sort((a, b) => {
      if (a.kind !== b.kind) {
        if (a.kind === StructureKind.Folder) return -1
        if (b.kind === StructureKind.Folder) return 1
      }
      return a.title.localeCompare(b.title)
    })
  }

  const root = byId.get(graph.rootId) ?? [...byId.values()].find((n) => !childIds.has(n.id))
  if (!root) {
    return { nodes: [], edges: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, contentW: 0, contentH: 0 } }
  }

  const measure = (node: TreeNode): number => {
    if (node.children.length === 0) {
      node.subtreeW = WIDGET_W
      return node.subtreeW
    }
    let sum = 0
    for (const c of node.children) sum += measure(c)
    sum += COL_GAP * (node.children.length - 1)
    node.subtreeW = Math.max(WIDGET_W, sum)
    return node.subtreeW
  }
  measure(root)

  const place = (node: TreeNode, left: number, depth: number) => {
    node.y = depth * (WIDGET_H + ROW_GAP)
    if (node.children.length === 0) {
      node.x = left + node.subtreeW / 2
      return
    }
    let cursor = left
    for (const c of node.children) {
      place(c, cursor, depth + 1)
      cursor += c.subtreeW + COL_GAP
    }
    const first = node.children[0]
    const last = node.children[node.children.length - 1]
    node.x = first && last ? (first.x + last.x) / 2 : left + node.subtreeW / 2
  }
  place(root, 0, 0)

  const placed: PlacedStructureNode[] = [...byId.values()].map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    meta: n.meta,
    depth: n.depth,
    index: n.index,
    noteId: n.noteId,
    folderPath: n.folderPath,
    isCollapsed: n.isCollapsed,
    childCount: n.childCount,
    x: n.x,
    y: n.y,
  }))

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const n of placed) {
    minX = Math.min(minX, n.x - WIDGET_W / 2)
    maxX = Math.max(maxX, n.x + WIDGET_W / 2)
    minY = Math.min(minY, n.y - WIDGET_H / 2)
    maxY = Math.max(maxY, n.y + WIDGET_H / 2)
  }

  const contentW = maxX - minX
  const contentH = maxY - minY

  // Normalize origin to (padX, padY)
  const padX = 40
  const padY = 50
  for (const n of placed) {
    n.x = n.x - minX + padX
    n.y = n.y - minY + padY
  }

  const ids = new Set(placed.map((n) => n.id))
  const edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  return {
    nodes: placed,
    edges,
    bounds: {
      minX: padX,
      maxX: padX + contentW,
      minY: padY,
      maxY: padY + contentH,
      contentW,
      contentH,
    },
  }
}

export const structurePort = (
  n: PlacedStructureNode,
  side: 'in' | 'out',
): { x: number; y: number } => ({
  x: n.x,
  y: n.y + (side === 'out' ? WIDGET_H / 2 : -WIDGET_H / 2),
})
