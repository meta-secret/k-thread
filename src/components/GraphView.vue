<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildHudStage,
  buildViewGraph,
  bundlePaths,
  CHIP_H,
  CHIP_W,
  folderOf,
  FORK_STRANDS,
  GraphScope,
  HudTier,
  labelOf,
  SUB_H,
  SUB_W,
  type GraphScope as GraphScopeT,
  type HudNode,
  type HudStage,
  type HudWire,
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

const sizeOf = (d: HudNode): { w: number; h: number } =>
  d.tier === HudTier.Sub ? { w: SUB_W, h: SUB_H } : { w: CHIP_W, h: CHIP_H }

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
    const strands = d.fork ? FORK_STRANDS : 4
    const spread = d.fork ? 3.6 : 2.2
    const paths = bundlePaths(from, to, strands, spread)
    const g = select(this)
    g.selectAll<SVGPathElement, string>('path.glow')
      .data(paths)
      .join('path')
      .attr('class', 'glow')
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', d.fork ? 2.8 : 2.2)
      .attr('filter', 'url(#wire-glow)')
      .attr('d', (p) => p)
    g.selectAll<SVGPathElement, string>('path.strand')
      .data(paths)
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke-width', d.fork ? 0.75 : 0.9)
      .attr('stroke-dasharray', d.real ? null : '2 3')
      .attr('d', (p) => p)
  })
}

const paintFocus = () => {
  if (wireSel.tag === 'none' || nodeSel.tag === 'none') return
  wireSel.value.each(function (d) {
    const hot = isWireHot(d)
    const dim =
      (hoveredId.value.length > 0 || props.activeId.length > 0) && !hot
    const g = select(this)
    g.attr('opacity', dim ? 0.06 : hot ? 1 : d.fork ? 0.7 : 0.45)
    g.selectAll<SVGPathElement, string>('path.strand').attr(
      'stroke',
      hot
        ? 'rgba(255,255,255,0.95)'
        : d.missing
          ? 'rgba(180,180,190,0.3)'
          : d.real
            ? 'rgba(220,220,230,0.65)'
            : 'rgba(160,160,170,0.35)',
    )
    g.selectAll<SVGPathElement, string>('path.glow').attr('stroke-opacity', hot ? 0.5 : 0.14)
  })

  nodeSel.value.attr('opacity', (d) => (isDimmed(d.id) ? 0.16 : 1))
  nodeSel.value.selectAll<SVGRectElement, HudNode>('rect.chip-body').attr('stroke', (d) => {
    if (d.id === props.activeId) return '#ff2a2a'
    if (d.id === hoveredId.value) return '#ffffff'
    if (d.kind === 'missing') return '#555560'
    return d.tier === HudTier.Sub ? '#2e2e36' : '#3a3a44'
  })
  nodeSel.value
    .selectAll<SVGRectElement, HudNode>('rect.chip-active')
    .attr('opacity', (d) => (d.id === props.activeId ? 1 : 0))
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
  glow.append('feGaussianBlur').attr('stdDeviation', '2.2').attr('result', 'blur')
  const merge = glow.append('feMerge')
  merge.append('feMergeNode').attr('in', 'blur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#050507')

  // depth haze
  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'url(#haze)')
  const haze = defs
    .append('radialGradient')
    .attr('id', 'haze')
    .attr('cx', '42%')
    .attr('cy', '48%')
    .attr('r', '70%')
  haze.append('stop').attr('offset', '0%').attr('stop-color', '#0c0c12').attr('stop-opacity', 0.2)
  haze.append('stop').attr('offset', '100%').attr('stop-color', '#000').attr('stop-opacity', 0.75)

  const chrome = svg.append('g').attr('class', 'chrome')
  const mark = (x: number, y: number) => {
    chrome
      .append('path')
      .attr('d', `M${x - 3},${y} H${x + 3} M${x},${y - 3} V${y + 3}`)
      .attr('stroke', '#ff2a2a')
      .attr('stroke-width', 1)
  }
  mark(16, 16)
  mark(width - 16, 16)
  mark(16, height - 16)
  mark(width - 16, height - 16)

  // left record rail (3 → feeds hubs)
  const rail = chrome.append('g').attr('transform', 'translate(18,0)')
  rail
    .append('line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', height * 0.18)
    .attr('y2', height * 0.82)
    .attr('stroke', '#ff2a2a')
    .attr('stroke-width', 2)
  built.records.forEach((rec, i) => {
    const y = height * 0.28 + i * 54
    const g = rail.append('g').attr('transform', `translate(10,${y})`)
    g.append('text')
      .attr('fill', '#f2f2f6')
      .attr('font-size', 10)
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .attr('font-weight', 600)
      .text(rec.code)
    g.append('text')
      .attr('y', 14)
      .attr('fill', '#8a8a96')
      .attr('font-size', 8)
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .text(`${rec.degree} ▢  LINK  ${rec.rate}`)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', 150)
      .attr('y1', 22)
      .attr('stroke', '#ff2a2a')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 3')
      .attr('opacity', 0.7)
  })

  // stage labels
  const label = (x: number, text: string) => {
    chrome
      .append('text')
      .attr('x', x)
      .attr('y', 36)
      .attr('fill', '#6a6a74')
      .attr('font-size', 9)
      .attr('letter-spacing', '0.18em')
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .text(text)
  }
  label(built.hubs[0]?.x ?? 210, '01  RECORDS')
  label(built.bridges[0]?.x ?? 380, '02  BRIDGE')
  label(built.subs[0]?.x ?? 560, '03  FORK · SUBS')

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
    const g = select(this)
    const { w, h } = sizeOf(d)
    g.append('rect')
      .attr('class', 'chip-active')
      .attr('x', -w / 2 - 3)
      .attr('y', -h / 2 - 3)
      .attr('width', w + 6)
      .attr('height', h + 6)
      .attr('rx', 4)
      .attr('fill', 'none')
      .attr('stroke', '#ff2a2a')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0)
    g.append('rect')
      .attr('class', 'chip-body')
      .attr('x', -w / 2)
      .attr('y', -h / 2)
      .attr('width', w)
      .attr('height', h)
      .attr('rx', 2)
      .attr('fill', d.kind === 'missing' ? '#101016' : d.tier === HudTier.Sub ? '#121218' : '#18181f')
      .attr('stroke', '#2e2e36')
      .attr('stroke-width', 1.2)
    // pin notches
    g.append('rect')
      .attr('x', -w / 2 - 3)
      .attr('y', -4)
      .attr('width', 3)
      .attr('height', 8)
      .attr('fill', '#c8c8d0')
    g.append('rect')
      .attr('x', w / 2)
      .attr('y', -4)
      .attr('width', 3)
      .attr('height', 8)
      .attr('fill', '#c8c8d0')
    g.append('rect')
      .attr('x', -w / 2 + 6)
      .attr('y', -h / 2 + 5)
      .attr('width', 2.5)
      .attr('height', h - 10)
      .attr('fill', d.id === props.activeId ? '#ff2a2a' : '#bdbdc8')
    g.append('text')
      .attr('x', -w / 2 + 12)
      .attr('y', d.tier === HudTier.Sub ? 3 : -2)
      .attr('fill', '#f2f2f6')
      .attr('font-size', d.tier === HudTier.Sub ? 9 : 10)
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .attr('font-weight', 600)
      .text(() => {
        const name = labelOf(d.id)
        const max = d.tier === HudTier.Sub ? 11 : 13
        return name.length > max ? `${name.slice(0, max - 1)}…` : name
      })
    if (d.tier !== HudTier.Sub) {
      g.append('text')
        .attr('x', -w / 2 + 12)
        .attr('y', 11)
        .attr('fill', '#7a7a86')
        .attr('font-size', 8)
        .attr('font-family', 'ui-monospace, Menlo, monospace')
        .text(() => {
          const folder = folderOf(d.id)
          const base = folder.length > 0 ? folder : d.kind === 'missing' ? 'UNRESOLVED' : 'ROOT'
          const short = base.length > 10 ? `${base.slice(0, 9)}…` : base
          return `${d.code}  ${short}`
        })
    }
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
        <span class="readout">{{ scopeLabel }} · 3→2→FORK</span>
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
      <span class="hint">3 RECORDS → 2 BRIDGE → FORK SUBS · CLICK FOCUS · DBL OPEN</span>
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
  background: radial-gradient(ellipse at 40% 45%, transparent 30%, rgba(0, 0, 0, 0.55) 100%);
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
