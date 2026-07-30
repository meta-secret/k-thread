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

export const HUB_W = 268
export const HUB_H = 76
export const BRIDGE_W = 188
export const BRIDGE_H = 52
export const SUB_W = 92
export const SUB_H = 28
export const CHIP_W = BRIDGE_W
export const CHIP_H = BRIDGE_H
export const BUNDLE_STRANDS = 5
export const FORK_STRANDS = 8

export const HudTier = {
  Hub: 'hub',
  Bridge: 'bridge',
  Sub: 'sub',
} as const
export type HudTier = (typeof HudTier)[keyof typeof HudTier]

export type HudNode = ViewNode & {
  tier: HudTier
  x: number
  y: number
  code: string
}

export type HudWire = {
  from: DocId
  to: DocId
  missing: boolean
  fork: boolean
  real: boolean
}

export type HudStage = {
  hubs: HudNode[]
  bridges: HudNode[]
  subs: HudNode[]
  wires: HudWire[]
  records: { id: DocId; code: string; degree: number; rate: string }[]
}

export type Point = { x: number; y: number }

const linked = (a: DocId, b: DocId, edgeSet: ReadonlySet<string>): boolean =>
  edgeSet.has(`${a}|${b}`) || edgeSet.has(`${b}|${a}`)

/** 2 meta-secret hubs → 2 bridges → fork into sub-components (dense L→R). */
export const buildHudStage = (
  nodes: readonly ViewNode[],
  edges: readonly ViewEdge[],
  activeId: DocId | '',
  width: number,
  height: number,
): HudStage => {
  const edgeSet = new Set(edges.map((e) => `${e.from}|${e.to}`))
  const byDegree = [...nodes].sort((a, b) => {
    if (a.id === activeId) return -1
    if (b.id === activeId) return 1
    if (b.degree !== a.degree) return b.degree - a.degree
    return a.id.localeCompare(b.id)
  })

  const hubsRaw = byDegree.slice(0, Math.min(2, byDegree.length))
  const hubIds = new Set(hubsRaw.map((n) => n.id))
  const restAfterHubs = byDegree.filter((n) => !hubIds.has(n.id))

  const bridgeScore = (n: ViewNode): number => {
    let score = n.degree
    for (const h of hubIds) {
      if (linked(n.id, h, edgeSet)) score += 10
    }
    return score
  }

  const bridgesRaw = [...restAfterHubs]
    .sort((a, b) => bridgeScore(b) - bridgeScore(a) || a.id.localeCompare(b.id))
    .slice(0, Math.min(2, restAfterHubs.length))
  const bridgeIds = new Set(bridgesRaw.map((n) => n.id))
  const subsRaw = restAfterHubs.filter((n) => !bridgeIds.has(n.id))

  const midY = height / 2
  const hubX = Math.max(150, width * 0.17)
  const bridgeX = Math.max(390, width * 0.4)
  const subX0 = Math.max(560, width * 0.56)

  const placeColumn = (
    list: readonly ViewNode[],
    tier: HudTier,
    x: number,
    gap: number,
  ): HudNode[] => {
    if (list.length === 0) return []
    const total = (list.length - 1) * gap
    const start = midY - total / 2
    return list.map((n, i) => ({
      ...n,
      tier,
      x,
      y: start + i * gap,
      code: `${String(i + 1).padStart(2, '0')}`,
    }))
  }

  const hubs = placeColumn(hubsRaw, HudTier.Hub, hubX, HUB_H + 28)
  const bridges = placeColumn(bridgesRaw, HudTier.Bridge, bridgeX, BRIDGE_H + 36)

  const cols = Math.max(2, Math.min(4, Math.ceil(Math.sqrt(Math.max(subsRaw.length, 1)))))
  const colGap = 108
  const rowGap = 44
  const subs: HudNode[] = subsRaw.map((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const rows = Math.ceil(subsRaw.length / cols)
    const blockH = (rows - 1) * rowGap
    return {
      ...n,
      tier: HudTier.Sub,
      x: subX0 + col * colGap,
      y: midY - blockH / 2 + row * rowGap,
      code: `S${String(i + 1).padStart(2, '0')}`,
    }
  })

  const byId = new Map<DocId, HudNode>()
  for (const n of [...hubs, ...bridges, ...subs]) byId.set(n.id, n)

  const wires: HudWire[] = []
  const seen = new Set<string>()
  const pushWire = (from: DocId, to: DocId, fork: boolean, real: boolean) => {
    const key = from < to ? `${from}|${to}` : `${to}|${from}`
    if (seen.has(key)) return
    seen.add(key)
    const a = byId.get(from)
    const b = byId.get(to)
    wires.push({
      from,
      to,
      fork,
      real,
      missing: (a?.kind === 'missing' || b?.kind === 'missing') ?? false,
    })
  }

  // Real edges across stages
  for (const e of edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const tiers = new Set([a.tier, b.tier])
    if (tiers.has(HudTier.Hub) && tiers.has(HudTier.Bridge)) {
      pushWire(e.from, e.to, false, true)
    } else if (tiers.has(HudTier.Bridge) && tiers.has(HudTier.Sub)) {
      pushWire(e.from, e.to, true, true)
    } else if (tiers.has(HudTier.Hub) && tiers.has(HudTier.Sub)) {
      pushWire(e.from, e.to, true, true)
    } else if (a.tier === b.tier && a.tier === HudTier.Hub) {
      pushWire(e.from, e.to, false, true)
    }
  }

  // Ensure 2→2 staging links (affinity) when sparse
  for (const hub of hubs) {
    let linkedBridge = bridges.find((b) => linked(hub.id, b.id, edgeSet))
    if (!linkedBridge && bridges.length > 0) {
      linkedBridge = bridges[hubs.indexOf(hub) % bridges.length]
    }
    if (linkedBridge) pushWire(hub.id, linkedBridge.id, false, linked(hub.id, linkedBridge.id, edgeSet))
  }

  // Fork: every sub attaches to a bridge (linked preferred, else round-robin)
  bridges.forEach((bridge, bi) => {
    const mine = subs.filter((s, si) => {
      if (linked(bridge.id, s.id, edgeSet)) return true
      const owners = bridges.filter((b) => linked(b.id, s.id, edgeSet))
      if (owners.length > 0) return owners[0]?.id === bridge.id
      return si % bridges.length === bi
    })
    for (const sub of mine) {
      pushWire(bridge.id, sub.id, true, linked(bridge.id, sub.id, edgeSet))
    }
  })

  // If no bridges, hubs fork directly to subs
  if (bridges.length === 0) {
    hubs.forEach((hub, hi) => {
      for (const [si, sub] of subs.entries()) {
        if (linked(hub.id, sub.id, edgeSet) || si % Math.max(hubs.length, 1) === hi) {
          pushWire(hub.id, sub.id, true, linked(hub.id, sub.id, edgeSet))
        }
      }
    })
  }

  const records = hubs.map((h, i) => ({
    id: h.id,
    code: h.code,
    degree: h.degree,
    rate: `${(40 + h.degree * 17 + i * 3).toFixed(1)}Kb/s`,
  }))

  return { hubs, bridges, subs, wires, records }
}

/** Cubic bezier + parallel offset strands for fiber-bundle edges. */
export const bundlePaths = (
  from: Point,
  to: Point,
  strands: number = BUNDLE_STRANDS,
  spread = 2.4,
): string[] => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return []

  const nx = -dy / len
  const ny = dx / len
  const bend = Math.min(140, len * 0.42)
  const c1 = { x: from.x + bend, y: from.y + dy * 0.05 }
  const c2 = { x: to.x - bend * 0.75, y: to.y - dy * 0.05 }
  const paths: string[] = []

  for (let i = 0; i < strands; i += 1) {
    const t = strands === 1 ? 0 : (i / (strands - 1) - 0.5) * 2
    const o = t * spread
    const sx = from.x + nx * o
    const sy = from.y + ny * o
    const tx = to.x + nx * o
    const ty = to.y + ny * o
    const ax = c1.x + nx * o * 0.85
    const ay = c1.y + ny * o * 0.85
    const bx = c2.x + nx * o * 0.85
    const by = c2.y + ny * o * 0.85
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
