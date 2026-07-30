<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  attachHudDefs,
  drawHudBackdrop,
  drawLayerLabels,
  drawPill,
  paintFocus,
  updateWires,
  type NodeSel,
  type WireSel,
} from '@/lib/graphHudDraw'
import {
  buildHudStage,
  buildViewGraph,
  GraphScope,
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
const stageStats = ref({ nodes: 0, links: 0 })
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
  for (const n of stage.value.nodes) map.set(n.id, n)
  return map
}

const refreshFocus = () => {
  if (wireSel.tag === 'none' || nodeSel.tag === 'none') return
  paintFocus(wireSel.value, nodeSel.value, {
    activeId: props.activeId,
    hoveredId: hoveredId.value,
    isDimmed,
    isWireHot,
  })
}

const rebuild = () => {
  if (hostEl.value.tag === 'none') return
  const el = hostEl.value.value
  const width = el.clientWidth > 0 ? el.clientWidth : 1100
  const height = el.clientHeight > 0 ? el.clientHeight : 640

  const built = buildHudStage(view.value.nodes, view.value.edges, props.activeId, width, height)
  for (const n of built.nodes) {
    const off = dragOffsets.get(n.id)
    if (off) {
      n.x = off.x
      n.y = off.y
    }
  }
  stage = some(built)
  stageStats.value = { nodes: built.nodes.length, links: built.wires.length }

  el.replaceChildren()

  const svg = select(el)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'hud-svg')
  svgRoot = some(svg)

  attachHudDefs(svg)
  const chrome = drawHudBackdrop(svg, width, height)
  drawLayerLabels(chrome, built.nodes)

  const root = svg.append('g').attr('class', 'viewport')
  const zb = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 3])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
    })
  svg.call(zb)
  svg.on('dblclick.zoom', null)
  zoomBehavior = some(zb)

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
      updateWires(wiresJoined as WireSel, nodeMap())
    })

  const nodesJoined = root
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, HudNode>('g.chip')
    .data(built.nodes, (d: HudNode) => d.id)
    .join('g')
    .attr('class', 'chip')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .call(dragBehavior)
    .on('mouseenter', (_e, d) => {
      hoveredId.value = d.id
      refreshFocus()
    })
    .on('mouseleave', () => {
      hoveredId.value = ''
      refreshFocus()
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
    drawPill(select(this) as Selection<SVGGElement, HudNode, null, undefined>, d)
  })

  wireSel = some(wiresJoined as WireSel)
  nodeSel = some(nodesJoined as NodeSel)
  updateWires(wiresJoined as WireSel, nodeMap())
  refreshFocus()
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
          Depth
          <input v-model.number="hops" type="range" min="1" max="3" step="1" />
          <span>{{ hops }}</span>
        </label>
        <span class="sep" />
        <span class="readout">{{ scopeLabel }} · Graph</span>
      </div>

      <Input v-model="query" class="search" placeholder="Filter notes…" autocomplete="off" />

      <div class="actions">
        <Button size="sm" variant="ghost" class="hud-btn" @click="showOrphans = !showOrphans">
          {{ showOrphans ? 'Hide orphans' : 'Show orphans' }}
        </Button>
        <Button size="sm" variant="outline" class="hud-btn" @click="resetZoom">Reset view</Button>
      </div>
    </div>

    <div :ref="bindHost" class="canvas" />

    <div class="footer">
      <span class="mono">{{ stageStats.nodes }} nodes</span>
      <span class="mono">{{ stageStats.links }} links</span>
      <span class="hint">Click to focus · double-click to open</span>
    </div>
  </div>
</template>

<style scoped>
.hud-shell {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  color: var(--kube-ink);
  font-family: var(--font-sans, "IBM Plex Sans", "Segoe UI", sans-serif);
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
  padding: 0.55rem 1rem;
  border-bottom: 1px solid rgba(18, 18, 20, 0.08);
  background: #ffffff;
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
  background: rgba(18, 18, 20, 0.12);
  margin: 0 0.25rem;
}

.readout {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--kube-mute);
  font-weight: 500;
}

.search {
  width: min(220px, 100%);
  background: #f4f4f6;
  border-color: rgba(18, 18, 20, 0.12);
  color: var(--kube-ink);
  font-family: inherit;
  font-size: 0.8rem;
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
  padding: 0.45rem 1rem;
  border-top: 1px solid rgba(18, 18, 20, 0.08);
  background: #ffffff;
  font-size: 0.7rem;
  letter-spacing: 0.02em;
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
