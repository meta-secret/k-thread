<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Crosshair,
  ExternalLink,
  FileText,
  FolderTree,
  GitBranch,
  Home,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Search,
  X,
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
  type ThemeMode,
} from '@/lib/structureDraw'
import {
  buildStructureGraph,
  placeStructureStage,
  StructureEdgeKind,
  StructureKind,
  type PlacedStructureNode,
  type StructureEdge,
} from '@/lib/structureGraph'
import { extractWikilinks, resolveWikilink } from '@/lib/wikilink'
import { none, some, type Doc, type DocId, type Option } from '@/types'

const props = withDefaults(
  defineProps<{
    docs: readonly Doc[]
    folders: readonly string[]
    activeId: DocId | ''
    seedFolder?: string
    themeMode?: ThemeMode
  }>(),
  {
    themeMode: 'light',
  },
)

const emit = defineEmits<{
  openNote: [id: DocId]
  focusNote: [id: DocId]
}>()

const query = ref('')
const focusFolder = ref('')
const hoveredId = ref('')
const pinnedId = ref('')
const collapsedFolders = ref<Set<string>>(new Set())
const stageBounds = ref<{ minX: number; maxX: number; minY: number; maxY: number; contentW: number; contentH: number } | null>(null)
const hostEl = ref<Option<HTMLElement>>(none)

const GraphLayer = {
  Hierarchy: 'hierarchy',
  Links: 'links',
  Combined: 'combined',
} as const
type GraphLayer = (typeof GraphLayer)[keyof typeof GraphLayer]

const graphLayer = ref<GraphLayer>('hierarchy')

const themeMode = computed(() => props.themeMode || 'light')

watch(
  () => props.seedFolder ?? '',
  (seed) => {
    if (seed === focusFolder.value) return
    focusFolder.value = seed
  },
  { immediate: true },
)

watch(graphLayer, () => {
  rebuild()
})

let zoomBehavior: Option<ZoomBehavior<SVGSVGElement, unknown>> = none
let svgRoot: Option<Selection<SVGSVGElement, unknown, null, undefined>> = none
let wireSel: Option<StructWireSel> = none
let nodeSel: Option<StructNodeSel> = none
let resizeObserver: Option<ResizeObserver> = none
const dragOffsets = new Map<string, { x: number; y: number }>()
const stats = ref({ nodes: 0, links: 0 })
const stageNodes = ref<PlacedStructureNode[]>([])

const selectedNode = computed(() => {
  if (!pinnedId.value) return null
  return stageNodes.value.find((n) => n.id === pinnedId.value) || null
})

const selectedDoc = computed(() => {
  const node = selectedNode.value
  if (!node || node.kind !== StructureKind.Note || !node.noteId) return null
  return props.docs.find((d) => d.id === node.noteId) || null
})

const selectedNodeOutlinks = computed(() => {
  const doc = selectedDoc.value
  if (!doc) return []
  const known = new Set(props.docs.map((d) => d.id))
  return extractWikilinks(doc.body).map((raw) => resolveWikilink(raw, known))
})

const selectedNodeBacklinks = computed(() => {
  const doc = selectedDoc.value
  if (!doc) return []
  const known = new Set(props.docs.map((d) => d.id))
  const backlinks: DocId[] = []
  for (const other of props.docs) {
    if (other.id === doc.id) continue
    const out = extractWikilinks(other.body).map((raw) => resolveWikilink(raw, known))
    if (out.includes(doc.id)) {
      backlinks.push(other.id)
    }
  }
  return backlinks
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

const fitToScreen = () => {
  if (svgRoot.tag === 'none' || zoomBehavior.tag === 'none' || !stageBounds.value) return
  const b = stageBounds.value
  const el = hostEl.value.tag === 'some' ? hostEl.value.value : null
  const width = el && el.clientWidth > 0 ? el.clientWidth : 1100
  const height = el && el.clientHeight > 0 ? el.clientHeight : 640

  const scale = Math.min(1.0, Math.min((width - 90) / b.contentW, (height - 130) / b.contentH))
  const tx = (width - b.contentW * scale) / 2 - b.minX * scale
  const ty = (height - b.contentH * scale) / 2 - b.minY * scale + 15

  const transform = zoomIdentity.translate(tx, ty).scale(scale)
  svgRoot.value.transition().duration(450).call(zoomBehavior.value.transform, transform)
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
  pinnedId.value = ''
  rebuild()
}

const toggleFolderCollapse = (folderPath: string) => {
  const next = new Set(collapsedFolders.value)
  if (next.has(folderPath)) {
    next.delete(folderPath)
  } else {
    next.add(folderPath)
  }
  collapsedFolders.value = next
  rebuild()
}



const nodeMap = (nodes: readonly PlacedStructureNode[]) => {
  const map = new Map<string, PlacedStructureNode>()
  for (const n of nodes) map.set(n.id, n)
  return map
}

const activeFocusTarget = computed(() => {
  return hoveredId.value || pinnedId.value || ''
})

const refreshFocus = () => {
  if (wireSel.tag === 'none' || nodeSel.tag === 'none') return
  paintStructureFocus(
    wireSel.value,
    nodeSel.value,
    activeFocusTarget.value,
    focusFolder.value,
    props.activeId,
    themeMode.value,
    graphLayer.value,
  )
}

const rebuild = () => {
  if (hostEl.value.tag === 'none') return
  const el = hostEl.value.value
  const width = el.clientWidth > 0 ? el.clientWidth : 1100
  const height = el.clientHeight > 0 ? el.clientHeight : 640

  const fullGraph = buildStructureGraph(filteredDocs.value, props.folders, focusFolder.value, collapsedFolders.value)
  const filteredEdges = fullGraph.edges.filter((e) => {
    if (graphLayer.value === 'hierarchy') return e.kind === StructureEdgeKind.Hierarchy
    if (graphLayer.value === 'links') return e.kind === StructureEdgeKind.Wikilink
    return true
  })
  // In links mode, only show Note nodes (drop Root/Folder orphans)
  const filteredNodes =
    graphLayer.value === 'links'
      ? fullGraph.nodes.filter((n) => n.kind === StructureKind.Note)
      : fullGraph.nodes
  const graph = { ...fullGraph, nodes: filteredNodes, edges: filteredEdges }
  const stage = placeStructureStage(graph, width, height)
  stageNodes.value = stage.nodes
  stageBounds.value = stage.bounds

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
  drawStructureBackdrop(svg, width, height, themeMode.value)

  // Clicking backdrop unpins selection
  svg.on('click', () => {
    pinnedId.value = ''
    refreshFocus()
  })

  const root = svg.append('g').attr('class', 'viewport')
  const zb = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 3])
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
      updateStructureWires(wiresJoined as StructWireSel, nodeMap(stage.nodes), themeMode.value)
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
      pinnedId.value = d.id
      refreshFocus()
      if (d.kind === StructureKind.Note && d.noteId.length > 0) {
        emit('openNote', d.noteId)
      } else if (d.kind === StructureKind.Folder) {
        toggleFolderCollapse(d.folderPath)
      }
    })
    .on('dblclick', (event, d) => {
      event.stopPropagation()
      if (d.kind === StructureKind.Note && d.noteId.length > 0) {
        emit('openNote', d.noteId)
      } else if (d.kind === StructureKind.Folder) {
        focusFolder.value = d.folderPath
        rebuild()
      }
    })

  nodesJoined.each(function (d) {
    const sel = select(this) as Selection<SVGGElement, PlacedStructureNode, null, undefined>
    drawStructureWidget(sel, d, themeMode.value)
  })

  wireSel = some(wiresJoined as StructWireSel)
  nodeSel = some(nodesJoined as StructNodeSel)
  updateStructureWires(wiresJoined as StructWireSel, nodeMap(stage.nodes), themeMode.value)
  refreshFocus()
  fitToScreen()
}

watch(
  () => [props.docs, props.folders, props.activeId, query.value, focusFolder.value, themeMode.value],
  () => rebuild(),
  { deep: true },
)

watch(
  () => pinnedId.value,
  () => fitToScreen(),
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
    class="structure-shell relative grid grid-rows-[auto_1fr_auto] h-full min-h-0 overflow-hidden font-sans transition-colors duration-200"
    :class="themeMode === 'dark' ? 'bg-[#09090b] text-zinc-100' : 'bg-[#efeff1] text-zinc-900'"
  >
    <!-- Top Glassmorphic Toolbar -->
    <header
      class="z-10 flex flex-wrap items-center justify-between gap-3 px-5 py-3 backdrop-blur-2xl border-b transition-colors duration-200"
      :class="themeMode === 'dark' ? 'bg-zinc-950/60 border-zinc-800/40' : 'bg-white/65 border-zinc-200/60 shadow-2xs'"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
          <GitBranch class="w-4 h-4" />
        </div>
        <div>
          <h2 class="m-0 text-sm font-semibold tracking-tight flex items-center gap-2" :class="themeMode === 'dark' ? 'text-zinc-100' : 'text-zinc-900'">
            <span>{{ focusFolder.length > 0 ? focusFolder : 'Vault Structure Funnel' }}</span>
            <span
              class="text-[10px] font-mono font-medium px-2 py-0.5 rounded border"
              :class="themeMode === 'dark' ? 'bg-zinc-800/80 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200'"
            >
              WORKFLOW GRAPH
            </span>
          </h2>
          <p class="m-0 text-xs font-mono tracking-wide" :class="themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-500'">
            Horizontal left-to-right tree · {{ stats.nodes }} nodes · {{ stats.links }} connections
          </p>
        </div>
      </div>

      <!-- Search & Controls -->
      <div class="flex items-center gap-2">
        <div class="relative w-52 sm:w-64">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            v-model="query"
            class="pl-8 text-xs h-8 placeholder:text-zinc-400 focus:border-orange-500/50"
            :class="themeMode === 'dark' ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800 shadow-xs'"
            placeholder="Search nodes or folders…"
            autocomplete="off"
          />
        </div>

        <!-- Graph Layer Mode Segmented Selector -->
        <div class="flex items-center rounded-lg border p-0.5" :class="themeMode === 'dark' ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xs'">
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer"
            :class="graphLayer === GraphLayer.Hierarchy ? 'bg-orange-500 text-white shadow-2xs font-semibold' : themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'"
            title="Display directory folder hierarchy tree only"
            @click="graphLayer = GraphLayer.Hierarchy"
          >
            Structure
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer flex items-center gap-1"
            :class="graphLayer === GraphLayer.Links ? 'bg-cyan-600 text-white shadow-2xs font-semibold' : themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'"
            title="Display note [[wikilink]] connections only"
            @click="graphLayer = GraphLayer.Links"
          >
            <span>Links</span>
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer flex items-center gap-1"
            :class="graphLayer === GraphLayer.Combined ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-white shadow-2xs font-semibold' : themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900'"
            title="Display both folder hierarchy and note [[wikilinks]] in one view"
            @click="graphLayer = GraphLayer.Combined"
          >
            <span>Combined</span>
          </button>
        </div>

        <div class="h-4 w-px mx-0.5" :class="themeMode === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300'" />

        <Button
          v-if="focusFolder.length > 0"
          size="sm"
          variant="outline"
          class="h-8 text-xs font-medium"
          :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'"
          @click="clearFocusFolder"
        >
          <RefreshCw class="w-3 h-3 mr-1 text-orange-500" />
          Whole Vault
        </Button>


        <div class="flex items-center rounded-lg border p-0.5" :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'">
          <button
            type="button"
            class="p-1.5 rounded transition-colors cursor-pointer"
            :class="themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'"
            title="Fit to Screen"
            @click="fitToScreen"
          >
            <Maximize2 class="w-3.5 h-3.5 text-orange-500" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded transition-colors cursor-pointer"
            :class="themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'"
            title="Zoom In"
            @click="zoomIn"
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded transition-colors cursor-pointer"
            :class="themeMode === 'dark' ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'"
            title="Zoom Out"
            @click="zoomOut"
          >
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Stage Layout Container (Full Width Canvas with Contextual Overlay) -->
    <div class="relative z-0 min-h-0 w-full h-full overflow-hidden">
      <!-- Full Width SVG Canvas Area -->
      <div :ref="bindHost" class="w-full h-full" />

      <!-- Prominent Top-Left Canvas Scope Navigator Widget -->
      <div
        class="absolute top-5 left-5 z-20 flex items-center gap-3.5 p-2 pl-3.5 pr-4 rounded-xl backdrop-blur-xl border shadow-xl transition-all duration-200"
        :class="themeMode === 'dark' ? 'bg-zinc-950/90 border-zinc-800 shadow-black/70 text-zinc-100' : 'bg-white/95 border-zinc-200 shadow-zinc-400/20 text-zinc-900'"
      >
        <div class="flex items-center gap-2.5">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]">
            <Home v-if="focusFolder.length === 0" class="w-4 h-4" />
            <FolderTree v-else class="w-4 h-4 text-orange-500" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] font-mono font-semibold uppercase tracking-wider text-orange-500">
              {{ focusFolder.length > 0 ? 'FOCUSED SUBTREE' : 'WHOLE VAULT ROOT' }}
            </span>
            <span class="text-xs font-semibold truncate max-w-[210px]">
              {{ focusFolder.length > 0 ? focusFolder : 'All Vault Notes & Folders' }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 ml-1">
          <Button
            size="sm"
            variant="outline"
            class="h-8 px-2.5 text-xs font-medium border-zinc-300 dark:border-zinc-700 shadow-2xs cursor-pointer"
            title="Fit graph to screen"
            @click="fitToScreen"
          >
            <Maximize2 class="w-3.5 h-3.5 mr-1 text-orange-500" />
            Fit Screen
          </Button>

          <Button
            v-if="focusFolder.length > 0"
            size="sm"
            class="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            title="Return to Whole Vault Root"
            @click="clearFocusFolder"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Whole Vault</span>
          </Button>
        </div>
      </div>

      <!-- Contextual Node Links & Management Widget Popover -->
      <div
        v-if="selectedNode"
        class="absolute top-20 right-5 z-30 w-80 rounded-2xl backdrop-blur-2xl border p-4 shadow-2xl transition-all duration-200"
        :class="themeMode === 'dark' ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-black/80' : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-400/20'"
        @click.stopPropagation
      >
        <!-- Widget Header -->
        <div class="flex items-start justify-between pb-3 border-b" :class="themeMode === 'dark' ? 'border-zinc-800/80' : 'border-zinc-200/80'">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 shrink-0">
              <FileText v-if="selectedNode.kind === StructureKind.Note" class="w-4 h-4" />
              <FolderTree v-else-if="selectedNode.kind === StructureKind.Folder" class="w-4 h-4 text-orange-500" />
              <Home v-else class="w-4 h-4 text-orange-500" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-sm truncate max-w-[140px]">{{ selectedNode.title }}</span>
                <span class="font-mono text-[9px] px-1 py-0.2 rounded border shrink-0" :class="themeMode === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'">
                  #{{ String(selectedNode.index).padStart(2, '0') }}
                </span>
              </div>
              <span class="text-[11px] truncate" :class="themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-500'">
                {{ selectedNode.meta }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="p-1 rounded-md transition-colors cursor-pointer hover:bg-zinc-500/20 text-zinc-400 hover:text-zinc-200"
            title="Close node inspector"
            @click="pinnedId = ''; refreshFocus()"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Layer Mode Toggles inside Node Widget -->
        <div class="my-3 flex items-center justify-between gap-1 p-1 rounded-xl border bg-zinc-900/40 border-zinc-800/60">
          <button
            type="button"
            class="flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
            :class="graphLayer === 'hierarchy' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
            @click="graphLayer = 'hierarchy'"
          >
            Structure
          </button>
          <button
            type="button"
            class="flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
            :class="graphLayer === 'links' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
            @click="graphLayer = 'links'"
          >
            Links
          </button>
          <button
            type="button"
            class="flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center"
            :class="graphLayer === 'combined' ? 'bg-gradient-to-r from-orange-500 to-cyan-500 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
            @click="graphLayer = 'combined'"
          >
            Combined
          </button>
        </div>

        <!-- Note Links Breakdown -->
        <template v-if="selectedNode.kind === StructureKind.Note">
          <!-- Outbound Links -->
          <div class="mb-2">
            <div class="flex items-center justify-between text-[11px] font-medium mb-1" :class="themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'">
              <span class="flex items-center gap-1">
                <ArrowUpRight class="w-3 h-3 text-cyan-400" />
                <span>Outbound Links</span>
              </span>
              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded-full" :class="themeMode === 'dark' ? 'bg-zinc-800 text-cyan-400' : 'bg-zinc-100 text-cyan-600'">
                {{ selectedNodeOutlinks.length }}
              </span>
            </div>
            <div v-if="selectedNodeOutlinks.length === 0" class="text-[11px] italic px-2 py-1 text-zinc-500">
              No outbound links
            </div>
            <div v-else class="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              <button
                v-for="targetId in selectedNodeOutlinks"
                :key="targetId"
                type="button"
                class="px-2 py-1 text-xs font-medium rounded-lg border flex items-center gap-1 transition-all cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-400 border-cyan-500/20 bg-cyan-500/5"
                @click="emit('openNote', targetId)"
              >
                <span>[[{{ targetId }}]]</span>
                <ExternalLink class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Backlinks -->
          <div class="mb-3">
            <div class="flex items-center justify-between text-[11px] font-medium mb-1" :class="themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'">
              <span class="flex items-center gap-1">
                <ArrowDownLeft class="w-3 h-3 text-orange-400" />
                <span>Backlinks</span>
              </span>
              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded-full" :class="themeMode === 'dark' ? 'bg-zinc-800 text-orange-400' : 'bg-zinc-100 text-orange-600'">
                {{ selectedNodeBacklinks.length }}
              </span>
            </div>
            <div v-if="selectedNodeBacklinks.length === 0" class="text-[11px] italic px-2 py-1 text-zinc-500">
              No backlinks
            </div>
            <div v-else class="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              <button
                v-for="sourceId in selectedNodeBacklinks"
                :key="sourceId"
                type="button"
                class="px-2 py-1 text-xs font-medium rounded-lg border flex items-center gap-1 transition-all cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/10 text-orange-400 border-orange-500/20 bg-orange-500/5"
                @click="emit('openNote', sourceId)"
              >
                <span>[[{{ sourceId }}]]</span>
                <ExternalLink class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Open Note Action -->
          <Button
            size="sm"
            class="w-full h-8 text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            @click="emit('openNote', selectedNode.noteId)"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Open Note in Editor</span>
          </Button>
        </template>

        <!-- Folder Actions -->
        <template v-else-if="selectedNode.kind === StructureKind.Folder">
          <div class="flex flex-col gap-2 mt-2">
            <Button
              size="sm"
              class="w-full h-8 text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              @click="toggleFolderCollapse(selectedNode.folderPath)"
            >
              <span>{{ selectedNode.isCollapsed ? 'Expand Subtree' : 'Collapse Subtree' }}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="w-full h-8 text-xs font-semibold rounded-lg border-zinc-700 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              @click="focusFolder = selectedNode.folderPath; rebuild()"
            >
              <Crosshair class="w-3.5 h-3.5 text-orange-500" />
              <span>Focus Subtree</span>
            </Button>
          </div>
        </template>
      </div>
    </div>

    <!-- Bottom Legend Bar -->
    <footer
      class="z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-2.5 backdrop-blur-md border-t text-xs font-mono transition-colors duration-200"
      :class="themeMode === 'dark' ? 'bg-zinc-950/90 border-zinc-800/80 text-zinc-400' : 'bg-white/90 border-zinc-200 text-zinc-600 shadow-sm'"
    >
      <div class="flex items-center gap-5">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-0.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span class="text-[11px]" :class="themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'">Sequence Flow</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full border border-orange-500" :class="themeMode === 'dark' ? 'bg-zinc-950' : 'bg-white'" />
          <span class="text-[11px]" :class="themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'">Hierarchy Port</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span class="text-[11px]" :class="themeMode === 'dark' ? 'text-zinc-300' : 'text-zinc-700'">Active Focus</span>
        </div>
      </div>

      <div class="flex items-center gap-4 text-[11px]" :class="themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400'">
        <span class="flex items-center gap-1">
          <Crosshair class="w-3 h-3 text-orange-500" />
          <span>Click folder to collapse/expand · Double-click to focus</span>
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
