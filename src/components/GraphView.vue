<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { Maximize2, Network, Search, ZoomIn, ZoomOut } from '@lucide/vue'
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
import type { ThemeMode } from '@/lib/structureDraw'
import { none, some, type DocId, type GraphIndex, type Option } from '@/types'

const props = withDefaults(
  defineProps<{
    index: GraphIndex
    activeId: DocId | ''
    existingIds: readonly DocId[]
    themeMode?: ThemeMode
  }>(),
  {
    themeMode: 'light',
  },
)

const emit = defineEmits<{
  select: [id: DocId]
  open: [id: DocId]
}>()

const scope = ref<GraphScopeT>(GraphScope.Global)
const hops = ref(1)
const showOrphans = ref(true)
const query = ref('')
const hoveredId = ref<DocId | ''>('')

const themeMode = computed(() => props.themeMode || 'light')

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

const zoomIn = () => {
  if (svgRoot.tag === 'none' || zoomBehavior.tag === 'none') return
  svgRoot.value.transition().duration(250).call(zoomBehavior.value.scaleBy, 1.25)
}

const zoomOut = () => {
  if (svgRoot.tag === 'none' || zoomBehavior.tag === 'none') return
  svgRoot.value.transition().duration(250).call(zoomBehavior.value.scaleBy, 0.8)
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
    mode: themeMode.value,
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
  const chrome = drawHudBackdrop(svg, width, height, themeMode.value)
  drawLayerLabels(chrome, built.nodes, themeMode.value)

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
      updateWires(wiresJoined as WireSel, nodeMap(), themeMode.value)
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
    drawPill(select(this) as Selection<SVGGElement, HudNode, null, undefined>, d, themeMode.value)
  })

  wireSel = some(wiresJoined as WireSel)
  nodeSel = some(nodesJoined as NodeSel)
  updateWires(wiresJoined as WireSel, nodeMap(), themeMode.value)
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
    themeMode.value,
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
  <div
    class="hud-shell relative grid grid-rows-[auto_1fr_auto] h-full min-h-0 overflow-hidden font-sans transition-colors duration-200"
    :class="themeMode === 'dark' ? 'bg-[#09090b] text-zinc-100' : 'bg-[#efeff1] text-zinc-900'"
  >
    <header
      class="z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 backdrop-blur-md border-b transition-colors duration-200"
      :class="themeMode === 'dark' ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-white/80 border-zinc-200/90 shadow-sm'"
    >
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
          <Network class="w-4 h-4" />
        </div>
        <div class="flex items-center gap-2">
          <Button
            size="sm"
            :variant="scope === GraphScope.Global ? 'secondary' : 'ghost'"
            class="h-7 text-xs"
            :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-200/70 border-zinc-300 text-zinc-800'"
            @click="scope = GraphScope.Global"
          >
            Global
          </Button>
          <Button
            size="sm"
            :variant="scope === GraphScope.Local ? 'secondary' : 'ghost'"
            class="h-7 text-xs"
            :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-200/70 border-zinc-300 text-zinc-800'"
            :disabled="activeId.length === 0"
            @click="scope = GraphScope.Local"
          >
            Local
          </Button>

          <label v-if="scope === GraphScope.Local" class="flex items-center gap-1.5 text-xs font-mono ml-2" :class="themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'">
            Depth
            <input v-model.number="hops" type="range" min="1" max="3" step="1" class="w-16 accent-orange-500" />
            <span class="text-orange-500 font-semibold">{{ hops }}</span>
          </label>

          <span class="w-px h-4 mx-1" :class="themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300'" />
          <span class="text-xs font-mono font-medium text-orange-500 uppercase tracking-wide">
            {{ scopeLabel }} · WIKILINKS
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative w-48 sm:w-60">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            v-model="query"
            class="pl-8 text-xs h-8 placeholder:text-zinc-400 focus:border-orange-500/50"
            :class="themeMode === 'dark' ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800 shadow-xs'"
            placeholder="Filter wikilinks…"
            autocomplete="off"
          />
        </div>

        <Button
          size="sm"
          variant="outline"
          class="h-8 text-xs font-medium"
          :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'"
          @click="showOrphans = !showOrphans"
        >
          {{ showOrphans ? 'Hide Orphans' : 'Show Orphans' }}
        </Button>


        <div class="flex items-center rounded-lg border p-0.5" :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'">
          <button type="button" class="p-1.5 rounded transition-colors" :class="themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'" title="Zoom In" @click="zoomIn">
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
          <button type="button" class="p-1.5 rounded transition-colors" :class="themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'" title="Zoom Out" @click="zoomOut">
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <button type="button" class="p-1.5 rounded transition-colors" :class="themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'" title="Reset View" @click="resetZoom">
            <Maximize2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <div :ref="bindHost" class="z-0 min-h-0 w-full h-full" />

    <footer
      class="z-10 flex items-center justify-between px-5 py-2.5 backdrop-blur-md border-t text-xs font-mono transition-colors duration-200"
      :class="themeMode === 'dark' ? 'bg-zinc-950/90 border-zinc-800/80 text-zinc-400' : 'bg-white/90 border-zinc-200 text-zinc-600 shadow-sm'"
    >
      <div class="flex items-center gap-4">
        <span class="font-medium" :class="themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'">{{ stageStats.nodes }} nodes</span>
        <span>·</span>
        <span class="font-medium" :class="themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-800'">{{ stageStats.links }} links</span>
      </div>
      <span class="text-[11px]" :class="themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'">Click node to focus · Double-click to open</span>
    </footer>
  </div>
</template>

<style scoped>
:deep(.hud-svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
