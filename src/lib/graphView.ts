import type { DocId, GraphEdge, GraphIndex } from '../types'

export const GraphScope = {
  Global: 'global',
  Local: 'local',
} as const
export type GraphScope = (typeof GraphScope)[keyof typeof GraphScope]

export type GraphNodeKind = 'note' | 'missing'

export type ViewNode = {
  id: DocId
  kind: GraphNodeKind
  degree: number
}

export type ViewEdge = {
  from: DocId
  to: DocId
}

export const labelOf = (id: DocId): string => {
  const parts = id.split('/')
  const last = parts[parts.length - 1]
  return typeof last === 'string' ? last : id
}

export const folderOf = (id: DocId): string => {
  if (!id.includes('/')) return ''
  return id.split('/').slice(0, -1).join('/')
}

const neighbors = (id: DocId, edges: readonly GraphEdge[]): Set<DocId> => {
  const out = new Set<DocId>()
  for (const edge of edges) {
    if (edge.from === id) out.add(edge.to)
    if (edge.to === id) out.add(edge.from)
  }
  return out
}

export const localClosure = (
  center: DocId,
  edges: readonly GraphEdge[],
  hops: number,
): Set<DocId> => {
  const kept = new Set<DocId>([center])
  let frontier = new Set<DocId>([center])
  for (let hop = 0; hop < hops; hop += 1) {
    const next = new Set<DocId>()
    for (const id of frontier) {
      for (const n of neighbors(id, edges)) {
        if (!kept.has(n)) {
          kept.add(n)
          next.add(n)
        }
      }
    }
    frontier = next
    if (frontier.size === 0) break
  }
  return kept
}

export const buildViewGraph = (
  index: GraphIndex,
  existing: ReadonlySet<DocId>,
  options: {
    scope: GraphScope
    activeId: DocId | ''
    hops: number
    showOrphans: boolean
    query: string
  },
): { nodes: ViewNode[]; edges: ViewEdge[] } => {
  let nodeIds = new Set(index.nodes)
  let edges = index.edges

  if (options.scope === GraphScope.Local && options.activeId.length > 0) {
    const kept = localClosure(options.activeId, index.edges, options.hops)
    nodeIds = kept
    edges = index.edges.filter((e) => kept.has(e.from) && kept.has(e.to))
  }

  const degree = new Map<DocId, number>()
  for (const id of nodeIds) degree.set(id, 0)
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
  }

  if (!options.showOrphans) {
    nodeIds = new Set([...nodeIds].filter((id) => (degree.get(id) ?? 0) > 0 || id === options.activeId))
    edges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
  }

  const q = options.query.trim().toLowerCase()
  if (q.length > 0) {
    nodeIds = new Set(
      [...nodeIds].filter(
        (id) => id.toLowerCase().includes(q) || labelOf(id).toLowerCase().includes(q),
      ),
    )
    edges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
  }

  const nodes: ViewNode[] = [...nodeIds]
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({
      id,
      kind: existing.has(id) ? 'note' : 'missing',
      degree: degree.get(id) ?? 0,
    }))

  return {
    nodes,
    edges: edges.map((e) => ({ from: e.from, to: e.to })),
  }
}

/** Stable-ish hue from folder path for visual grouping. */
export const folderHue = (folder: string): number => {
  if (folder.length === 0) return 200
  let hash = 0
  for (let i = 0; i < folder.length; i += 1) {
    hash = (hash * 31 + folder.charCodeAt(i)) >>> 0
  }
  return hash % 360
}

export const CHIP_W = 118
export const CHIP_H = 36
export const BUNDLE_STRANDS = 4

export type Point = { x: number; y: number }

/** Cubic bezier + parallel offset strands for fiber-bundle edges. */
export const bundlePaths = (
  from: Point,
  to: Point,
  strands: number = BUNDLE_STRANDS,
): string[] => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return []

  const nx = -dy / len
  const ny = dx / len
  const bend = Math.min(90, len * 0.35)
  const c1 = { x: from.x + bend, y: from.y }
  const c2 = { x: to.x - bend, y: to.y }
  const spread = 2.4
  const paths: string[] = []

  for (let i = 0; i < strands; i += 1) {
    const t = strands === 1 ? 0 : (i / (strands - 1) - 0.5) * 2
    const o = t * spread
    const sx = from.x + nx * o
    const sy = from.y + ny * o
    const tx = to.x + nx * o
    const ty = to.y + ny * o
    const ax = c1.x + nx * o * 0.6
    const ay = c1.y + ny * o * 0.6
    const bx = c2.x + nx * o * 0.6
    const by = c2.y + ny * o * 0.6
    paths.push(`M${sx},${sy} C${ax},${ay} ${bx},${by} ${tx},${ty}`)
  }
  return paths
}

export const noteLinks = (
  id: DocId,
  edges: readonly ViewEdge[],
): { out: DocId[]; back: DocId[] } => {
  const out: DocId[] = []
  const back: DocId[] = []
  for (const edge of edges) {
    if (edge.from === id) out.push(edge.to)
    if (edge.to === id) back.push(edge.from)
  }
  return {
    out: [...new Set(out)].sort(),
    back: [...new Set(back)].sort(),
  }
}
