<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BRIDGE_H,
  BRIDGE_W,
  buildHudStage,
  buildViewGraph,
  GraphScope,
  HUB_H,
  HUB_W,
  HudTier,
  labelOf,
  orthoPath,
  SUB_H,
  SUB_W,
  type GraphScope as GraphScopeT,
  type HudNode,
  type HudStage,
  type HudWire,
  type Point,
} from '@/lib/graphView'
import { none, some, type DocId, type GraphIndex, type Option } from '@/types'

const props = defineProps<{
  index: GraphIndex
  activeId: DocId | ''
  existingIds: readonly DocId[]
}>()

const emit = defineEmits<{
  select: [id: DocId]
  open: [id: DocId]
}>()

type WireSel = Selection<SVGGElement, HudWire, SVGGElement, unknown>
type NodeSel = Selection<SVGGElement, HudNode, SVGGElement, unknown>

const scope = ref<GraphScopeT>(GraphScope.Global)
const hops = ref(1)
const showOrphans = ref(true)
const query = ref('')
const hoveredId = ref<DocId | ''>('')

const hostEl = ref<Option<HTMLElement>>(none)
let zoomBehavior: Option<ZoomBehavior<SVGSVGElement, unknown>> = none
let svgRoot: Option<Selection<SVGSVGElement, unknown, null, undefined>> = none
let wireSel: Option<WireSel> = none
let nodeSel: Option<NodeSel> = none
let resizeObserver: Option<ResizeObserver> = none
let stage: Option<HudStage> = none
const stageStats = ref({ hubs: 0, bridges: 0, subs: 0 })
const dragOffsets = new Map<DocId, { x: number; y: number }>()

const existingSet = computed(() => new Set(props.existingIds))

const view = computed(() =>
  buildViewGraph(props.index, existingSet.value, {
    scope: scope.value,
    activeId: props.activeId,
    hops: hops.value,
    showOrphans: showOrphans.value,
    query: query.value,
  }),
)

const adjacency = computed(() => {
  const map = new Map<DocId, Set<DocId>>()
  for (const node of view.value.nodes) map.set(node.id, new Set())
  for (const edge of view.value.edges) {
    map.get(edge.from)?.add(edge.to)
    map.get(edge.to)?.add(edge.from)
  }
  return map
})

const scopeLabel = computed(() =>
  scope.value === GraphScope.Local ? `LOCAL·${hops.value}` : 'GLOBAL',
)

const sizeOf = (d: HudNode): { w: number; h: number } => {
  if (d.tier === HudTier.Hub) return { w: HUB_W, h: HUB_H }
  if (d.tier === HudTier.Bridge) return { w: BRIDGE_W, h: BRIDGE_H }
  return { w: SUB_W, h: SUB_H }
}

const portOf = (d: HudNode, side: 'in' | 'out'): { x: number; y: number } => {
  const { w } = sizeOf(d)
  return { x: d.x + (side === 'out' ? w / 2 : -w / 2), y: d.y }
}

const isDimmed = (id: DocId): boolean => {
  const hover = hoveredId.value
  if (hover.length === 0) return false
  if (id === hover) return false
  return !(adjacency.value.get(hover)?.has(id) ?? false)
}

const isWireHot = (link: HudWire): boolean => {
  const hover = hoveredId.value
  if (hover.length > 0) return link.from === hover || link.to === hover
  if (props.activeId.length > 0) {
    return link.from === props.activeId || link.to === props.activeId
  }
  return false
}

const clipLabel = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

const bindHost = (el: Element | ComponentPublicInstance | null) => {
  if (!(el instanceof HTMLElement)) {
    hostEl.value = none
    return
  }
  hostEl.value = some(el)
  if (resizeObserver.tag === 'some') resizeObserver.value.disconnect()
  const ro = new ResizeObserver(() => rebuild())
  ro.observe(el)
  resizeObserver = some(ro)
  rebuild()
}

const resetZoom = () => {
  if (svgRoot.tag === 'none' || zoomBehavior.tag === 'none') return
  svgRoot.value.transition().duration(350).call(zoomBehavior.value.transform, zoomIdentity)
}

const nodeMap = (): Map<DocId, HudNode> => {
  const map = new Map<DocId, HudNode>()
  if (stage.tag === 'none') return map
  for (const n of [...stage.value.hubs, ...stage.value.bridges, ...stage.value.subs]) {
    map.set(n.id, n)
  }
  return map
}

const updateWires = (wires: WireSel) => {
  const nodes = nodeMap()
  wires.each(function (d) {
    const s = nodes.get(d.from)
    const t = nodes.get(d.to)
    if (!s || !t) return
    const from = portOf(s, 'out')
    const to = portOf(t, 'in')
    const path = orthoPath(from, to)
    const g = select(this)
    g.selectAll<SVGPathElement, string>('path.glow')
      .data([path])
      .join('path')
      .attr('class', 'glow')
      .attr('fill', 'none')
      .attr('stroke', '#c02323')
      .attr('stroke-width', 4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#wire-glow)')
      .attr('d', (p) => p)
    g.selectAll<SVGPathElement, string>('path.strand')
      .data([path])
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke-width', 1.25)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-dasharray', d.real ? null : '3 4')
      .attr('d', (p) => p)
    // Port anchors at endpoints
    g.selectAll<SVGCircleElement, Point>('circle.port')
      .data([from, to])
      .join('circle')
      .attr('class', 'port')
      .attr('r', 3.2)
      .attr('cx', (p) => p.x)
      .attr('cy', (p) => p.y)
      .attr('fill', '#c02323')
      .attr('stroke', '#f4f4f6')
      .attr('stroke-width', 1.2)
  })
}

const paintFocus = () => {
  if (wireSel.tag === 'none' || nodeSel.tag === 'none') return
  wireSel.value.each(function (d) {
    const hot = isWireHot(d)
    const dim = (hoveredId.value.length > 0 || props.activeId.length > 0) && !hot
    const g = select(this)
    g.attr('opacity', dim ? 0.08 : hot ? 1 : d.fork ? 0.55 : 0.38)
    g.selectAll<SVGPathElement, string>('path.strand').attr(
      'stroke',
      hot ? '#c02323' : d.missing ? 'rgba(18,18,20,0.2)' : 'rgba(18,18,20,0.45)',
    )
    g.selectAll<SVGPathElement, string>('path.glow').attr('stroke-opacity', hot ? 0.28 : 0)
    g.selectAll<SVGCircleElement, Point>('circle.port').attr('opacity', hot ? 1 : 0.7)
  })

  nodeSel.value.attr('opacity', (d) => (isDimmed(d.id) ? 0.22 : 1))
  nodeSel.value.selectAll<SVGRectElement, HudNode>('.chip-body').attr('stroke', (d) => {
    if (d.id === props.activeId) return '#c02323'
    if (d.id === hoveredId.value) return '#121214'
    if (d.kind === 'missing') return '#9a9aa4'
    if (d.tier === HudTier.Hub) return 'rgba(18,18,20,0.55)'
    return 'rgba(18,18,20,0.28)'
  })
  nodeSel.value
    .selectAll<SVGCircleElement, HudNode>('circle.port-out')
    .attr('fill', (d) => (d.id === props.activeId || d.id === hoveredId.value ? '#c02323' : '#121214'))
  nodeSel.value
    .selectAll<SVGRectElement, HudNode>('rect.chip-active')
    .attr('opacity', (d) => (d.id === props.activeId ? 1 : 0))
}

/** Compact pill node — graph vocabulary, not marketing cards. */
const drawPill = (g: Selection<SVGGElement, HudNode, null, undefined>, d: HudNode) => {
  const { w, h } = sizeOf(d)
  const x0 = -w / 2
  const y0 = -h / 2
  const r = h / 2
  const isHub = d.tier === HudTier.Hub
  const maxLen = isHub ? 14 : d.tier === HudTier.Bridge ? 12 : 11
  const title = clipLabel(labelOf(d.id), maxLen)

  g.append('rect')
    .attr('class', 'chip-active')
    .attr('x', x0 - 5)
    .attr('y', y0 - 5)
    .attr('width', w + 10)
    .attr('height', h + 10)
    .attr('rx', r + 5)
    .attr('fill', 'none')
    .attr('stroke', '#c02323')
    .attr('stroke-width', 1.2)
    .attr('opacity', 0)

  g.append('rect')
    .attr('class', 'chip-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', w)
    .attr('height', h)
    .attr('rx', r)
    .attr(
      'fill',
      d.kind === 'missing' ? '#ececef' : isHub ? '#fafafa' : '#f4f4f6',
    )
    .attr('stroke', isHub ? 'rgba(18,18,20,0.55)' : 'rgba(18,18,20,0.28)')
    .attr('stroke-width', isHub ? 1.4 : 1.1)

  // In / out ports
  g.append('circle')
    .attr('class', 'port-in')
    .attr('cx', x0)
    .attr('cy', 0)
    .attr('r', 3)
    .attr('fill', '#f4f4f6')
    .attr('stroke', '#c02323')
    .attr('stroke-width', 1.2)
  g.append('circle')
    .attr('class', 'port-out')
    .attr('cx', x0 + w)
    .attr('cy', 0)
    .attr('r', 3)
    .attr('fill', '#121214')
    .attr('stroke', '#f4f4f6')
    .attr('stroke-width', 1.1)

  if (isHub) {
    g.append('text')
      .attr('x', x0 + 14)
      .attr('y', -5)
      .attr('fill', '#8a8a96')
      .attr('font-size', 7)
      .attr('letter-spacing', '0.1em')
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .text(`${d.code} · ${d.degree}`)
    g.append('text')
      .attr('x', x0 + 14)
      .attr('y', 9)
      .attr('fill', '#121214')
      .attr('font-size', 12)
      .attr('font-weight', 650)
      .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
      .text(title)
  } else {
    g.append('text')
      .attr('x', 0)
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#121214')
      .attr('font-size', d.tier === HudTier.Bridge ? 10 : 9)
      .attr('font-weight', 600)
      .attr('letter-spacing', '0.04em')
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .text(title.toUpperCase())
  }
}

const rebuild = () => {
  if (hostEl.value.tag === 'none') return
  const el = hostEl.value.value
  const width = el.clientWidth > 0 ? el.clientWidth : 1100
  const height = el.clientHeight > 0 ? el.clientHeight : 640

  const built = buildHudStage(view.value.nodes, view.value.edges, props.activeId, width, height)
  for (const n of [...built.hubs, ...built.bridges, ...built.subs]) {
    const off = dragOffsets.get(n.id)
    if (off) {
      n.x = off.x
      n.y = off.y
    }
  }
  stage = some(built)
  stageStats.value = {
    hubs: built.hubs.length,
    bridges: built.bridges.length,
    subs: built.subs.length,
  }

  el.replaceChildren()

  const svg = select(el)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'hud-svg')
  svgRoot = some(svg)

  const defs = svg.append('defs')
  const glow = defs
    .append('filter')
    .attr('id', 'wire-glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
  glow.append('feGaussianBlur').attr('stdDeviation', '2.4').attr('result', 'blur')
  const merge = glow.append('feMerge')
  merge.append('feMergeNode').attr('in', 'blur')

  const haze = defs
    .append('radialGradient')
    .attr('id', 'haze')
    .attr('cx', '42%')
    .attr('cy', '48%')
    .attr('r', '72%')
  haze.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff').attr('stop-opacity', 0.55)
  haze.append('stop').attr('offset', '100%').attr('stop-color', '#c4c4ca').attr('stop-opacity', 0.35)

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#e4e4e8')
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#haze)')

  // Subtle grid for graph readout
  const grid = svg.append('g').attr('class', 'grid').attr('opacity', 0.22)
  for (let x = 40; x < width; x += 40) {
    grid
      .append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#121214')
      .attr('stroke-width', 0.4)
  }
  for (let y = 40; y < height; y += 40) {
    grid
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', '#121214')
      .attr('stroke-width', 0.4)
  }

  const chrome = svg.append('g').attr('class', 'chrome')
  const mark = (x: number, y: number) => {
    chrome
      .append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 2.5)
      .attr('fill', 'none')
      .attr('stroke', '#c02323')
      .attr('stroke-width', 1)
  }
  mark(16, 16)
  mark(width - 16, 16)
  mark(16, height - 16)
  mark(width - 16, height - 16)

  const label = (x: number, text: string) => {
    chrome
      .append('text')
      .attr('x', x)
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b6b73')
      .attr('font-size', 9)
      .attr('letter-spacing', '0.18em')
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .text(text)
  }
  if (built.hubs[0]) label(built.hubs[0].x, '01  ROOT')
  if (built.bridges[0]) label(built.bridges[0].x, '02  LINK')
  if (built.subs[0]) label(built.subs[0].x, '03  NODE')

  const root = svg.append('g').attr('class', 'viewport')
  const zb = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 3])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
    })
  svg.call(zb)
  svg.on('dblclick.zoom', null)
  zoomBehavior = some(zb)

  const allNodes = [...built.hubs, ...built.bridges, ...built.subs]

  const wiresJoined = root
    .append('g')
    .attr('class', 'wires')
    .selectAll<SVGGElement, HudWire>('g.wire')
    .data(built.wires)
    .join('g')
    .attr('class', 'wire')

  const dragBehavior = drag<SVGGElement, HudNode>()
    .on('drag', (event, d) => {
      d.x = event.x
      d.y = event.y
      dragOffsets.set(d.id, { x: d.x, y: d.y })
      if (nodeSel.tag === 'some') {
        nodeSel.value.attr('transform', (n) => `translate(${n.x},${n.y})`)
      }
      updateWires(wiresJoined as WireSel)
    })

  const nodesJoined = root
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, HudNode>('g.chip')
    .data(allNodes, (d: HudNode) => d.id)
    .join('g')
    .attr('class', 'chip')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .call(dragBehavior)
    .on('mouseenter', (_e, d) => {
      hoveredId.value = d.id
      paintFocus()
    })
    .on('mouseleave', () => {
      hoveredId.value = ''
      paintFocus()
    })
    .on('click', (event, d) => {
      event.stopPropagation()
      emit('select', d.id)
    })
    .on('dblclick', (event, d) => {
      event.stopPropagation()
      emit('open', d.id)
    })

  nodesJoined.each(function (d) {
    const g = select(this) as Selection<SVGGElement, HudNode, null, undefined>
    drawPill(g, d)
  })

  wireSel = some(wiresJoined as WireSel)
  nodeSel = some(nodesJoined as NodeSel)
  updateWires(wiresJoined as WireSel)
  paintFocus()
}

watch(
  () => [
    props.index.nodes,
    props.index.edges,
    props.existingIds,
    props.activeId,
    scope.value,
    hops.value,
    showOrphans.value,
    query.value,
  ],
  () => rebuild(),
  { deep: true },
)

onMounted(() => {
  if (hostEl.value.tag === 'some') rebuild()
})

onBeforeUnmount(() => {
  if (resizeObserver.tag === 'some') {
    resizeObserver.value.disconnect()
    resizeObserver = none
  }
})
</script>

<template>
  <div class="hud-shell">
    <div class="toolbar">
      <div class="modes">
        <Button
          size="sm"
          :variant="scope === GraphScope.Global ? 'secondary' : 'ghost'"
          class="hud-btn"
          @click="scope = GraphScope.Global"
        >
          Global
        </Button>
        <Button
          size="sm"
          :variant="scope === GraphScope.Local ? 'secondary' : 'ghost'"
          class="hud-btn"
          :disabled="activeId.length === 0"
          @click="scope = GraphScope.Local"
        >
          Local
        </Button>
        <label v-if="scope === GraphScope.Local" class="hops">
          DEPTH
          <input v-model.number="hops" type="range" min="1" max="3" step="1" />
          <span>{{ hops }}</span>
        </label>
        <span class="sep" />
        <span class="readout">{{ scopeLabel }} · GRAPH</span>
      </div>

      <Input v-model="query" class="search" placeholder="FILTER…" autocomplete="off" />

      <div class="actions">
        <Button size="sm" variant="ghost" class="hud-btn" @click="showOrphans = !showOrphans">
          {{ showOrphans ? 'Hide orphans' : 'Show orphans' }}
        </Button>
        <Button size="sm" variant="outline" class="hud-btn" @click="resetZoom">Reset</Button>
      </div>
    </div>

    <div :ref="bindHost" class="canvas" />

    <div class="footer">
      <span class="mono">HUB {{ stageStats.hubs }}</span>
      <span class="mono">BRG {{ stageStats.bridges }}</span>
      <span class="mono">SUB {{ stageStats.subs }}</span>
      <span class="hint">CLICK FOCUS · DBL OPEN · DRAG NODES</span>
    </div>
  </div>
</template>

<style scoped>
.hud-shell {
  --hud-red: var(--hud-accent);
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  min-height: 0;
  background: transparent;
  color: var(--kube-ink);
  font-family: var(--font-mono);
}

.toolbar,
.footer {
  position: relative;
  z-index: 2;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.9rem;
  border-bottom: 1px solid var(--kube-line);
  background: color-mix(in srgb, var(--kube-wash-top) 70%, white);
}

.modes,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.hops {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--kube-mute);
}

.hops input {
  width: 70px;
}

.sep {
  width: 1px;
  height: 1rem;
  background: color-mix(in srgb, var(--hud-accent) 55%, transparent);
  margin: 0 0.25rem;
}

.readout {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  color: var(--hud-red);
}

.search {
  width: min(220px, 100%);
  background: #f4f4f6;
  border-color: var(--kube-line-strong);
  color: var(--kube-ink);
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
}

.hud-btn {
  font-family: inherit;
  letter-spacing: 0.04em;
}

.canvas {
  position: relative;
  z-index: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding: 0.4rem 0.9rem;
  border-top: 1px solid var(--kube-line);
  background: color-mix(in srgb, var(--kube-wash-top) 70%, white);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: var(--kube-mute);
}

.footer .mono {
  color: var(--kube-ink);
}

.footer .hint {
  margin-left: auto;
  opacity: 0.7;
}

.hud-shell :deep(.hud-svg) {
  display: block;
}
</style>
