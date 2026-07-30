<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildViewGraph,
  bundlePaths,
  CHIP_H,
  CHIP_W,
  folderOf,
  GraphScope,
  labelOf,
  type GraphScope as GraphScopeT,
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

type SimNode = SimulationNodeDatum & {
  id: DocId
  kind: 'note' | 'missing'
  degree: number
}
type SimLink = SimulationLinkDatum<SimNode> & {
  from: DocId
  to: DocId
  missing: boolean
}
type WireSel = Selection<SVGGElement, SimLink, SVGGElement, unknown>
type NodeSel = Selection<SVGGElement, SimNode, SVGGElement, unknown>

const scope = ref<GraphScopeT>(GraphScope.Global)
const hops = ref(1)
const showOrphans = ref(true)
const query = ref('')
const hoveredId = ref<DocId | ''>('')

const hostEl = ref<Option<HTMLElement>>(none)
let sim: Option<Simulation<SimNode, SimLink>> = none
let zoomBehavior: Option<ZoomBehavior<SVGSVGElement, unknown>> = none
let svgRoot: Option<Selection<SVGSVGElement, unknown, null, undefined>> = none
let wireSel: Option<WireSel> = none
let nodeSel: Option<NodeSel> = none
let resizeObserver: Option<ResizeObserver> = none
const positions = new Map<DocId, { x: number; y: number }>()

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

const num = (value: unknown): number => (typeof value === 'number' ? value : 0)

const portOf = (d: SimNode, side: 'in' | 'out'): { x: number; y: number } => ({
  x: num(d.x) + (side === 'out' ? CHIP_W / 2 : -CHIP_W / 2),
  y: num(d.y),
})

const isDimmed = (id: DocId): boolean => {
  const hover = hoveredId.value
  if (hover.length === 0) return false
  if (id === hover) return false
  return !(adjacency.value.get(hover)?.has(id) ?? false)
}

const isWireHot = (link: SimLink): boolean => {
  const hover = hoveredId.value
  const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source)
  const targetId = typeof link.target === 'object' ? link.target.id : String(link.target)
  if (hover.length > 0) return sourceId === hover || targetId === hover
  if (props.activeId.length > 0) {
    return sourceId === props.activeId || targetId === props.activeId
  }
  return false
}

const isWireDimmed = (link: SimLink): boolean => {
  const hover = hoveredId.value
  if (hover.length === 0 && props.activeId.length === 0) return false
  return !isWireHot(link)
}

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

const paintFocus = () => {
  if (wireSel.tag === 'none' || nodeSel.tag === 'none') return
  const wires = wireSel.value
  const nodes = nodeSel.value

  wires.each(function (d) {
    const hot = isWireHot(d)
    const dim = isWireDimmed(d)
    const g = select(this)
    g.attr('opacity', dim ? 0.08 : hot ? 1 : 0.55)
    g.selectAll<SVGPathElement, string>('path.strand').attr(
      'stroke',
      hot ? 'rgba(255,255,255,0.95)' : d.missing ? 'rgba(180,180,190,0.35)' : 'rgba(220,220,230,0.55)',
    )
    g.selectAll<SVGPathElement, string>('path.glow').attr('stroke-opacity', hot ? 0.55 : 0.18)
  })

  nodes.attr('opacity', (d) => (isDimmed(d.id) ? 0.18 : 1))
  nodes.selectAll<SVGRectElement, SimNode>('rect.chip-body').attr('stroke', (d) => {
    if (d.id === props.activeId) return '#ff2a2a'
    if (d.id === hoveredId.value) return '#ffffff'
    if (d.kind === 'missing') return '#555560'
    return '#2a2a32'
  })
  nodes
    .selectAll<SVGRectElement, SimNode>('rect.chip-active')
    .attr('opacity', (d) => (d.id === props.activeId ? 1 : 0))
  nodes
    .selectAll<SVGPathElement, SimNode>('path.active-ticks')
    .attr('opacity', (d) => (d.id === props.activeId ? 1 : 0))
  nodes
    .selectAll<SVGRectElement, SimNode>('rect.chip-notch')
    .attr('fill', (d) =>
      d.id === props.activeId ? '#ff2a2a' : d.kind === 'missing' ? '#44444c' : '#c8c8d0',
    )
}

const updateWires = (wires: WireSel) => {
  wires.each(function (d) {
    const s = typeof d.source === 'object' ? (d.source as SimNode) : undefined
    const t = typeof d.target === 'object' ? (d.target as SimNode) : undefined
    if (!s || !t) return
    const from = portOf(s, 'out')
    const to = portOf(t, 'in')
    const paths = bundlePaths(from, to)
    const g = select(this)
    g.selectAll<SVGPathElement, string>('path.glow')
      .data(paths)
      .join('path')
      .attr('class', 'glow')
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3.2)
      .attr('filter', 'url(#wire-glow)')
      .attr('d', (p) => p)
    g.selectAll<SVGPathElement, string>('path.strand')
      .data(paths)
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke-width', 0.85)
      .attr('stroke-dasharray', d.missing ? '3 3' : null)
      .attr('d', (p) => p)
  })
}

const rebuild = () => {
  if (hostEl.value.tag === 'none') return
  const el = hostEl.value.value

  if (sim.tag === 'some') {
    for (const n of sim.value.nodes()) {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        positions.set(n.id, { x: n.x, y: n.y })
      }
    }
    sim.value.stop()
    sim = none
  }

  const width = el.clientWidth > 0 ? el.clientWidth : 960
  const height = el.clientHeight > 0 ? el.clientHeight : 640
  const graph = view.value
  const known = existingSet.value

  const nodes: SimNode[] = graph.nodes.map((n) => {
    const prev = positions.get(n.id)
    return prev ? { ...n, x: prev.x, y: prev.y } : { ...n }
  })
  const links: SimLink[] = graph.edges.map((e) => ({
    source: e.from,
    target: e.to,
    from: e.from,
    to: e.to,
    missing: !known.has(e.from) || !known.has(e.to),
  }))

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
    .attr('x', '-40%')
    .attr('y', '-40%')
    .attr('width', '180%')
    .attr('height', '180%')
  glow.append('feGaussianBlur').attr('stdDeviation', '2.4').attr('result', 'blur')
  const merge = glow.append('feMerge')
  merge.append('feMergeNode').attr('in', 'blur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')

  const chipGlow = defs
    .append('filter')
    .attr('id', 'chip-glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
  chipGlow.append('feGaussianBlur').attr('stdDeviation', '1.6').attr('result', 'blur')
  const chipMerge = chipGlow.append('feMerge')
  chipMerge.append('feMergeNode').attr('in', 'blur')
  chipMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  // vignette bg
  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#050507')

  // subtle grid dots
  const grid = svg.append('g').attr('class', 'grid').attr('opacity', 0.35)
  const step = 28
  for (let x = 16; x < width; x += step) {
    for (let y = 16; y < height; y += step) {
      if ((x + y) % (step * 2) === 0) {
        grid
          .append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 0.6)
          .attr('fill', '#3a3a44')
      }
    }
  }

  // red + ticks
  const chrome = svg.append('g').attr('class', 'chrome')
  const mark = (x: number, y: number) => {
    chrome
      .append('path')
      .attr('d', `M${x - 3},${y} H${x + 3} M${x},${y - 3} V${y + 3}`)
      .attr('stroke', '#ff2a2a')
      .attr('stroke-width', 1)
      .attr('opacity', 0.85)
  }
  mark(18, 18)
  mark(width - 18, 18)
  mark(18, height - 18)
  mark(width - 18, height - 18)
  chrome
    .append('line')
    .attr('x1', 40)
    .attr('y1', 18)
    .attr('x2', 120)
    .attr('y2', 18)
    .attr('stroke', '#ff2a2a')
    .attr('stroke-width', 1)
    .attr('opacity', 0.5)

  const root = svg.append('g').attr('class', 'viewport')
  const zb = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 3.5])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
    })
  svg.call(zb)
  svg.on('dblclick.zoom', null)
  zoomBehavior = some(zb)

  const wiresJoined = root
    .append('g')
    .attr('class', 'wires')
    .selectAll<SVGGElement, SimLink>('g.wire')
    .data(links)
    .join('g')
    .attr('class', 'wire')

  const dragBehavior = drag<SVGGElement, SimNode>()
    .on('start', (event, d) => {
      if (!event.active && sim.tag === 'some') sim.value.alphaTarget(0.22).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on('drag', (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active && sim.tag === 'some') sim.value.alphaTarget(0)
      d.fx = null
      d.fy = null
    })

  const nodesJoined = root
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, SimNode>('g.chip')
    .data(nodes, (d: SimNode) => d.id)
    .join('g')
    .attr('class', 'chip')
    .style('cursor', 'pointer')
    .call(dragBehavior)
    .on('mouseenter', (_event, d) => {
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

  nodesJoined
    .append('rect')
    .attr('class', 'chip-active')
    .attr('x', -CHIP_W / 2 - 3)
    .attr('y', -CHIP_H / 2 - 3)
    .attr('width', CHIP_W + 6)
    .attr('height', CHIP_H + 6)
    .attr('rx', 5)
    .attr('fill', 'none')
    .attr('stroke', '#ff2a2a')
    .attr('stroke-width', 1.2)
    .attr('filter', 'url(#chip-glow)')
    .attr('opacity', 0)

  nodesJoined
    .append('rect')
    .attr('class', 'chip-body')
    .attr('x', -CHIP_W / 2)
    .attr('y', -CHIP_H / 2)
    .attr('width', CHIP_W)
    .attr('height', CHIP_H)
    .attr('rx', 3)
    .attr('fill', (d) => (d.kind === 'missing' ? '#121218' : '#16161c'))
    .attr('stroke', '#2a2a32')
    .attr('stroke-width', 1.2)

  nodesJoined
    .append('rect')
    .attr('class', 'chip-notch')
    .attr('x', -CHIP_W / 2 + 6)
    .attr('y', -CHIP_H / 2 + 6)
    .attr('width', 3)
    .attr('height', CHIP_H - 12)
    .attr('rx', 1)
    .attr('fill', (d) =>
      d.id === props.activeId ? '#ff2a2a' : d.kind === 'missing' ? '#44444c' : '#c8c8d0',
    )

  nodesJoined
    .append('circle')
    .attr('class', 'port-in')
    .attr('cx', -CHIP_W / 2)
    .attr('cy', 0)
    .attr('r', 2.4)
    .attr('fill', '#e8e8ee')

  nodesJoined
    .append('circle')
    .attr('class', 'port-out')
    .attr('cx', CHIP_W / 2)
    .attr('cy', 0)
    .attr('r', 2.4)
    .attr('fill', '#e8e8ee')

  nodesJoined
    .append('text')
    .attr('class', 'chip-title')
    .attr('x', -CHIP_W / 2 + 14)
    .attr('y', -2)
    .attr('fill', '#f2f2f6')
    .attr('font-size', 10)
    .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
    .attr('font-weight', 600)
    .text((d) => {
      const name = labelOf(d.id)
      return name.length > 14 ? `${name.slice(0, 13)}…` : name
    })

  nodesJoined
    .append('text')
    .attr('class', 'chip-meta')
    .attr('x', -CHIP_W / 2 + 14)
    .attr('y', 11)
    .attr('fill', '#7a7a86')
    .attr('font-size', 8)
    .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
    .text((d) => {
      const folder = folderOf(d.id)
      const base = folder.length > 0 ? folder : d.kind === 'missing' ? 'UNRESOLVED' : 'ROOT'
      const short = base.length > 12 ? `${base.slice(0, 11)}…` : base
      return `${short}  LNK·${d.degree}`
    })

  // red tick marks on active
  nodesJoined
    .append('path')
    .attr('class', 'active-ticks')
    .attr('d', `M${-CHIP_W / 2 + 8},${-CHIP_H / 2 - 5} h4 M${CHIP_W / 2 - 12},${-CHIP_H / 2 - 5} h4`)
    .attr('stroke', '#ff2a2a')
    .attr('stroke-width', 1.2)
    .attr('opacity', (d) => (d.id === props.activeId ? 1 : 0))

  wireSel = some(wiresJoined as WireSel)
  nodeSel = some(nodesJoined as NodeSel)

  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(160)
        .strength(0.35),
    )
    .force('charge', forceManyBody().strength(-420).distanceMax(520))
    .force('center', forceCenter(width / 2, height / 2))
    .force(
      'collide',
      forceCollide<SimNode>()
        .radius(Math.hypot(CHIP_W, CHIP_H) / 2 + 18)
        .strength(0.9),
    )
    .velocityDecay(0.3)
    .on('tick', () => {
      updateWires(wiresJoined as WireSel)
      nodesJoined.attr('transform', (d) => `translate(${num(d.x)},${num(d.y)})`)
    })

  sim = some(simulation)
  updateWires(wiresJoined as WireSel)
  paintFocus()
}

watch(
  () => [
    props.index.nodes,
    props.index.edges,
    props.existingIds,
    scope.value,
    hops.value,
    showOrphans.value,
    query.value,
  ],
  () => rebuild(),
  { deep: true },
)

watch(
  () => props.activeId,
  () => paintFocus(),
)

onMounted(() => {
  if (hostEl.value.tag === 'some') rebuild()
})

onBeforeUnmount(() => {
  if (sim.tag === 'some') {
    sim.value.stop()
    sim = none
  }
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
        <span class="readout">{{ scopeLabel }}</span>
      </div>

      <Input
        v-model="query"
        class="search"
        placeholder="FILTER…"
        autocomplete="off"
      />

      <div class="actions">
        <Button size="sm" variant="ghost" class="hud-btn" @click="showOrphans = !showOrphans">
          {{ showOrphans ? 'Hide orphans' : 'Show orphans' }}
        </Button>
        <Button size="sm" variant="outline" class="hud-btn" @click="resetZoom">Reset</Button>
      </div>
    </div>

    <div :ref="bindHost" class="canvas" />

    <div class="footer">
      <span class="mono">NOD {{ view.nodes.length }}</span>
      <span class="mono">EDG {{ view.edges.length }}</span>
      <span class="mono">{{ scopeLabel }}</span>
      <span class="hint">CLICK FOCUS · DBL OPEN · DRAG · SCROLL ZOOM</span>
    </div>
  </div>
</template>

<style scoped>
.hud-shell {
  --hud-red: #ff2a2a;
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  min-height: 0;
  background: #050507;
  color: #e8e8ee;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.hud-shell::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%);
  z-index: 1;
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
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid rgba(255, 42, 42, 0.35);
  background: rgba(8, 8, 12, 0.92);
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
  color: #8a8a96;
}

.hops input {
  width: 70px;
}

.sep {
  width: 1px;
  height: 1rem;
  background: rgba(255, 42, 42, 0.5);
  margin: 0 0.25rem;
}

.readout {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  color: var(--hud-red);
}

.search {
  width: min(220px, 100%);
  background: #101016;
  border-color: #2a2a32;
  color: #e8e8ee;
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
  padding: 0.4rem 0.85rem;
  border-top: 1px solid rgba(255, 42, 42, 0.28);
  background: rgba(8, 8, 12, 0.92);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: #8a8a96;
}

.footer .mono {
  color: #c8c8d0;
}

.footer .hint {
  margin-left: auto;
  opacity: 0.7;
}

.hud-shell :deep(.hud-svg) {
  display: block;
}
</style>
