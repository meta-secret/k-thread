<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import {
  Crosshair,
  FileText,
  GitBranch,
  Maximize2,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  attachStructureDefs,
  drawStructureBackdrop,
  drawStructureWidget,
  paintStructureFocus,
  updateStructureWires,
  type StructNodeSel,
  type StructWireSel,
} from '@/lib/structureDraw'
import {
  buildStructureGraph,
  placeStructureStage,
  StructureKind,
  type PlacedStructureNode,
  type StructureEdge,
} from '@/lib/structureGraph'
import { none, some, type Doc, type DocId, type Option } from '@/types'

const props = defineProps<{
  docs: readonly Doc[]
  folders: readonly string[]
  activeId: DocId | ''
  seedFolder?: string
}>()

const emit = defineEmits<{
  openNote: [id: DocId]
  focusNote: [id: DocId]
}>()

const query = ref('')
const focusFolder = ref('')
const hoveredId = ref('')
const hostEl = ref<Option<HTMLElement>>(none)

watch(
  () => props.seedFolder ?? '',
  (seed) => {
    if (seed === focusFolder.value) return
    focusFolder.value = seed
  },
  { immediate: true },
)

let zoomBehavior: Option<ZoomBehavior<SVGSVGElement, unknown>> = none
let svgRoot: Option<Selection<SVGSVGElement, unknown, null, undefined>> = none
let wireSel: Option<StructWireSel> = none
let nodeSel: Option<StructNodeSel> = none
let resizeObserver: Option<ResizeObserver> = none
const dragOffsets = new Map<string, { x: number; y: number }>()
const stats = ref({ nodes: 0, links: 0 })

const selectedNode = computed<PlacedStructureNode | null>(() => {
  if (!hoveredId.value && !props.activeId) return null
  const targetId = hoveredId.value || `note:${props.activeId}`
  const graph = buildStructureGraph(filteredDocs.value, props.folders, focusFolder.value)
  const stage = placeStructureStage(graph, 1100, 640)
  return stage.nodes.find((n) => n.id === targetId || n.noteId === props.activeId) ?? null
})

const selectedDoc = computed(() => {
  if (!selectedNode.value || !selectedNode.value.noteId) return null
  return props.docs.find((d) => d.id === selectedNode.value?.noteId) ?? null
})

const filteredDocs = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length === 0) return props.docs
  return props.docs.filter(
    (d) => d.id.toLowerCase().includes(q) || d.title.toLowerCase().includes(q),
  )
})

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

const clearFocusFolder = () => {
  focusFolder.value = ''
  rebuild()
}

const nodeMap = (nodes: readonly PlacedStructureNode[]) => {
  const map = new Map<string, PlacedStructureNode>()
  for (const n of nodes) map.set(n.id, n)
  return map
}

const refreshFocus = () => {
  if (wireSel.tag === 'none' || nodeSel.tag === 'none') return
  paintStructureFocus(
    wireSel.value,
    nodeSel.value,
    hoveredId.value,
    focusFolder.value,
    props.activeId,
  )
}

const rebuild = () => {
  if (hostEl.value.tag === 'none') return
  const el = hostEl.value.value
  const width = el.clientWidth > 0 ? el.clientWidth : 1100
  const height = el.clientHeight > 0 ? el.clientHeight : 640

  const graph = buildStructureGraph(filteredDocs.value, props.folders, focusFolder.value)
  const stage = placeStructureStage(graph, width, height)
  for (const n of stage.nodes) {
    const off = dragOffsets.get(n.id)
    if (off) {
      n.x = off.x
      n.y = off.y
    }
  }
  stats.value = { nodes: stage.nodes.length, links: stage.edges.length }

  el.replaceChildren()
  const svg = select(el)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'structure-svg')
  svgRoot = some(svg)
  attachStructureDefs(svg)
  drawStructureBackdrop(svg, width, height)

  const root = svg.append('g').attr('class', 'viewport')
  const zb = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 3])
    .on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
    })
  svg.call(zb)
  svg.on('dblclick.zoom', null)
  zoomBehavior = some(zb)

  const wiresJoined = root
    .append('g')
    .attr('class', 'wires')
    .selectAll<SVGGElement, StructureEdge>('g.wire')
    .data(stage.edges)
    .join('g')
    .attr('class', 'wire')

  const dragBehavior = drag<SVGGElement, PlacedStructureNode>()
    .on('drag', (event, d) => {
      d.x = event.x
      d.y = event.y
      dragOffsets.set(d.id, { x: d.x, y: d.y })
      if (nodeSel.tag === 'some') {
        nodeSel.value.attr('transform', (n) => `translate(${n.x},${n.y})`)
      }
      updateStructureWires(wiresJoined as StructWireSel, nodeMap(stage.nodes))
    })

  const nodesJoined = root
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, PlacedStructureNode>('g.widget')
    .data(stage.nodes, (d) => d.id)
    .join('g')
    .attr('class', 'widget')
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
      if (d.kind === StructureKind.Note && d.noteId.length > 0) {
        emit('focusNote', d.noteId)
        emit('openNote', d.noteId)
        return
      }
      if (d.kind === StructureKind.Folder) {
        focusFolder.value = d.folderPath
        rebuild()
        return
      }
      if (d.kind === StructureKind.Root) {
        focusFolder.value = ''
        rebuild()
      }
    })
    .on('dblclick', (event, d) => {
      event.stopPropagation()
      if (d.kind === StructureKind.Note && d.noteId.length > 0) {
        emit('openNote', d.noteId)
      }
    })

  nodesJoined.each(function (d) {
    drawStructureWidget(select(this) as Selection<SVGGElement, PlacedStructureNode, null, undefined>, d)
  })

  wireSel = some(wiresJoined as StructWireSel)
  nodeSel = some(nodesJoined as StructNodeSel)
  updateStructureWires(wiresJoined as StructWireSel, nodeMap(stage.nodes))
  refreshFocus()
}

watch(
  () => [props.docs, props.folders, props.activeId, query.value, focusFolder.value],
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
  <div class="structure-shell relative grid grid-rows-[auto_1fr_auto] h-full min-h-0 overflow-hidden bg-[#09090b] text-zinc-100 font-sans">
    <!-- Top Glassmorphic High-Tech Toolbar -->
    <header class="z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
          <GitBranch class="w-4 h-4" />
        </div>
        <div>
          <h2 class="m-0 text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>{{ focusFolder.length > 0 ? focusFolder : 'Vault Structure Funnel' }}</span>
            <span class="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-800/80 text-orange-400 border border-orange-500/20">
              WORKFLOW GRAPH
            </span>
          </h2>
          <p class="m-0 text-xs text-zinc-400 font-mono tracking-wide">
            Parent-aligned workflow · {{ stats.nodes }} nodes · {{ stats.links }} connections
          </p>
        </div>
      </div>

      <!-- Search & Controls -->
      <div class="flex items-center gap-2">
        <div class="relative w-52 sm:w-64">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            v-model="query"
            class="pl-8 text-xs bg-zinc-900/90 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 h-8 focus:border-orange-500/50 focus:ring-orange-500/20"
            placeholder="Search nodes or folders…"
            autocomplete="off"
          />
        </div>

        <div class="h-4 w-px bg-zinc-800 mx-1" />

        <Button
          v-if="focusFolder.length > 0"
          size="sm"
          variant="outline"
          class="h-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          @click="clearFocusFolder"
        >
          <RefreshCw class="w-3 h-3 mr-1 text-orange-400" />
          Whole Vault
        </Button>

        <div class="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
          <button
            type="button"
            class="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
            title="Zoom In"
            @click="zoomIn"
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            class="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
            title="Zoom Out"
            @click="zoomOut"
          >
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            class="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
            title="Reset View"
            @click="resetZoom"
          >
            <Maximize2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main SVG Canvas Stage -->
    <div class="relative z-0 min-h-0 w-full h-full overflow-hidden">
      <div :ref="bindHost" class="w-full h-full" />

      <!-- Floating Interactive Inspector Card (Pic 3 style preview widget) -->
      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
        <div
          v-if="selectedNode"
          class="absolute bottom-4 right-4 z-20 w-80 rounded-xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/90 shadow-2xl p-4 text-xs"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-[10px] uppercase tracking-widest text-orange-400 font-semibold flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Node Inspector
            </span>
            <span class="font-mono text-[10px] text-zinc-500">#{String(selectedNode.index).padStart(2, '0')}</span>
          </div>

          <h3 class="font-semibold text-sm text-zinc-100 m-0 truncate">
            {{ selectedNode.title }}
          </h3>
          <p class="text-zinc-400 m-0 mt-0.5 truncate text-[11px]">
            {{ selectedNode.meta }}
          </p>

          <div v-if="selectedDoc" class="mt-3 pt-2.5 border-t border-zinc-800/80">
            <p class="text-zinc-300 font-mono text-[10.5px] line-clamp-3 bg-zinc-900/80 p-2 rounded border border-zinc-800">
              {{ selectedDoc.body || '(Empty note content)' }}
            </p>
            <div class="mt-2.5 flex items-center justify-between">
              <span class="text-zinc-500 text-[10px]">Click node to edit note</span>
              <Button
                size="sm"
                class="h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white font-medium px-2.5"
                @click="emit('openNote', selectedNode.noteId as DocId)"
              >
                <FileText class="w-3 h-3 mr-1" />
                Open Note
              </Button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- Bottom High-Tech Legend Bar (Pic 2 inspired) -->
    <footer class="z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 text-xs text-zinc-400 font-mono">
      <div class="flex items-center gap-5">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-0.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span class="text-zinc-300 text-[11px]">Sequence Flow</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full border border-orange-500 bg-zinc-950" />
          <span class="text-zinc-300 text-[11px]">Hierarchy Port</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span class="text-zinc-300 text-[11px]">Active Focus</span>
        </div>
      </div>

      <div class="flex items-center gap-4 text-[11px] text-zinc-500">
        <span class="flex items-center gap-1">
          <Crosshair class="w-3 h-3 text-orange-400" />
          <span>Click folder to focus subtree</span>
        </span>
        <span>·</span>
        <span>Double-click note to write</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.structure-svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
