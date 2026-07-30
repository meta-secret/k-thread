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

export const NODE_W = 168
export const NODE_H = 48
/** @deprecated use NODE_W — kept for older imports */
export const HUB_W = NODE_W
export const HUB_H = NODE_H
export const BRIDGE_W = NODE_W
export const BRIDGE_H = NODE_H
export const SUB_W = NODE_W
export const SUB_H = NODE_H
export const CHIP_W = NODE_W
export const CHIP_H = NODE_H
export const BUNDLE_STRANDS = 1
export const FORK_STRANDS = 1

/** Visual weight only — every note is still one graph node. */
export const HudTier = {
  Root: 'root',
  Node: 'node',
} as const
export type HudTier = (typeof HudTier)[keyof typeof HudTier]

export type HudNode = ViewNode & {
  tier: HudTier
  x: number
  y: number
  code: string
  layer: number
}

export type HudWire = {
  from: DocId
  to: DocId
  missing: boolean
  fork: boolean
  real: boolean
}

export type HudStage = {
  nodes: HudNode[]
  wires: HudWire[]
  /** @deprecated aliases for gradual migration */
  hubs: HudNode[]
  bridges: HudNode[]
  subs: HudNode[]
}

export type Point = { x: number; y: number }

/**
 * One node per note. Top-down flowchart (GTD-style):
 * BFS hop = row; notes fan horizontally within a row; arrows flow downward.
 */
export const buildHudStage = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  activeId: DocId | '',
  width: number,
  height: number,
): HudStage => {
  if (nodes.length === 0) {
    return { nodes: [], wires: [], hubs: [], bridges: [], subs: [] }
  }

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const adj = new Map<DocId, DocId[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue
    adj.get(e.from)?.push(e.to)
    adj.get(e.to)?.push(e.from)
  }

  const rootId =
    activeId.length > 0 && byId.has(activeId)
      ? activeId
      : [...nodes].sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))[0]?.id ?? ''

  const layerOf = new Map<DocId, number>()
  const queue: DocId[] = []
  if (rootId.length > 0) {
    layerOf.set(rootId, 0)
    queue.push(rootId)
  }
  while (queue.length > 0) {
    const id = queue.shift()
    if (!id) break
    const depth = layerOf.get(id) ?? 0
    for (const n of adj.get(id) ?? []) {
      if (layerOf.has(n)) continue
      layerOf.set(n, depth + 1)
      queue.push(n)
    }
  }

  let maxLayer = 0
  for (const d of layerOf.values()) maxLayer = Math.max(maxLayer, d)
  const orphanLayer = maxLayer + (layerOf.size > 0 && layerOf.size < nodes.length ? 1 : 0)
  for (const n of nodes) {
    if (!layerOf.has(n.id)) layerOf.set(n.id, orphanLayer)
  }
  for (const d of layerOf.values()) maxLayer = Math.max(maxLayer, d)

  const rows: ViewNode[][] = Array.from({ length: maxLayer + 1 }, () => [])
  for (const n of nodes) {
    const layer = layerOf.get(n.id) ?? 0
    rows[layer]?.push(n)
  }
  for (const row of rows) {
    row.sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
  }

  const rowGap = Math.max(96, Math.min(120, (height - 120) / Math.max(rows.length, 1)))
  const colGap = NODE_W + 36
  const originY = Math.max(72, (height - rowGap * Math.max(rows.length - 1, 0)) / 2 - 8)
  const midX = width / 2

  const placed: HudNode[] = []
  let code = 1
  rows.forEach((row, li) => {
    const blockW = Math.max(0, (row.length - 1) * colGap)
    const startX = midX - blockW / 2
    row.forEach((n, ri) => {
      placed.push({
        ...n,
        tier: n.id === rootId ? HudTier.Root : HudTier.Node,
        layer: li,
        x: startX + ri * colGap,
        y: originY + li * rowGap,
        code: String(code).padStart(2, '0'),
      })
      code += 1
    })
  })

  const pos = new Map(placed.map((n) => [n.id, n]))
  const wires: HudWire[] = []
  const seen = new Set<string>()
  for (const e of edges) {
    const a = pos.get(e.from)
    const b = pos.get(e.to)
    if (!a || !b) continue
    const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`
    if (seen.has(key)) continue
    seen.add(key)
    // Arrow parent (shallower hop) → child
    const [from, to] = a.layer <= b.layer ? [a, b] : [b, a]
    wires.push({
      from: from.id,
      to: to.id,
      fork: false,
      real: true,
      missing: a.kind === 'missing' || b.kind === 'missing',
    })
  }

  return {
    nodes: placed,
    wires,
    hubs: placed.filter((n) => n.tier === HudTier.Root),
    bridges: [],
    subs: placed.filter((n) => n.tier === HudTier.Node),
  }
}

/** Orthogonal elbow — prefer vertical-first for top-down flowcharts. */
export const orthoPath = (from: Point, to: Point): string => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) < 0.5) return `M${from.x},${from.y} V${to.y}`
  if (Math.abs(dy) < 0.5) return `M${from.x},${from.y} H${to.x}`
  // Drop, then across, then drop — fans cleanly from a parent to siblings
  const midY = from.y + dy * 0.45
  return `M${from.x},${from.y} V${midY} H${to.x} V${to.y}`
}

/**
 * Manhattan path with filleted corners — music-player HUD flow aesthetic.
 * One continuous neon strand between note ports (no mid-edge action nodes).
 */
export const roundedOrthoPath = (from: Point, to: Point, radius = 16): string => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dy) < 0.5) {
    return `M${from.x},${from.y} H${to.x}`
  }
  if (Math.abs(dx) < 0.5) {
    return `M${from.x},${from.y} V${to.y}`
  }

  const midX = from.x + dx * 0.55
  const yDir = dy > 0 ? 1 : -1
  const xInto = midX >= from.x ? 1 : -1
  const xOut = to.x >= midX ? 1 : -1
  const r = Math.min(
    radius,
    Math.abs(midX - from.x) * 0.9,
    Math.abs(to.x - midX) * 0.9,
    Math.abs(dy) / 2,
  )

  if (r < 2) return orthoPath(from, to)

  return [
    `M${from.x},${from.y}`,
    `H${midX - r * xInto}`,
    `Q${midX},${from.y} ${midX},${from.y + r * yDir}`,
    `V${to.y - r * yDir}`,
    `Q${midX},${to.y} ${midX + r * xOut},${to.y}`,
    `H${to.x}`,
  ].join(' ')
}

/** Kept for callers that still expect path arrays. */
export const bundlePaths = (
  from: Point,
  to: Point,
  _strands: number = BUNDLE_STRANDS,
  _spread = 2.4,
): string[] => {
  const path = roundedOrthoPath(from, to)
  return path.length > 0 ? [path] : []
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
