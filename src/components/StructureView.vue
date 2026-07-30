<script setup lang="ts">
import 'd3-transition'
import { drag } from 'd3-drag'
import { select, type Selection } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
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
  /** When set (e.g. jump from Note), focus this folder subtree. */
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
    .scaleExtent([0.25, 2.5])
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
  <div class="structure-shell">
    <div class="toolbar">
      <div class="heading">
        <h2 class="title">{{ focusFolder.length > 0 ? focusFolder : 'Project structure' }}</h2>
        <p class="sub">Folders and notes · click a note to write</p>
      </div>
      <Input v-model="query" class="search" placeholder="Filter notes…" autocomplete="off" />
      <div class="actions">
        <Button
          size="sm"
          variant="ghost"
          :disabled="focusFolder.length === 0"
          @click="clearFocusFolder"
        >
          Whole vault
        </Button>
        <Button size="sm" variant="outline" @click="resetZoom">Reset</Button>
      </div>
    </div>
    <div :ref="bindHost" class="canvas" />
    <div class="footer">
      <span>{{ stats.nodes }} steps</span>
      <span>{{ stats.links }} links</span>
      <span class="hint">Folder → focus subtree · Note → open editor</span>
    </div>
  </div>
</template>

<style scoped>
.structure-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  min-height: 0;
  background: var(--kube-wash-top);
  color: var(--kube-ink);
  font-family: var(--font-sans, "IBM Plex Sans", "Segoe UI", sans-serif);
}

.toolbar,
.footer {
  z-index: 2;
  background: color-mix(in srgb, var(--kube-wash-top) 92%, white);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--kube-line);
}

.heading {
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.sub {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--kube-mute);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.search {
  width: min(220px, 100%);
  background: var(--card, #fff);
  border-color: var(--kube-line);
  font-size: 0.8rem;
}

.canvas {
  min-height: 0;
  width: 100%;
  height: 100%;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem 1.25rem;
  border-top: 1px solid var(--kube-line);
  font-size: 0.7rem;
  color: var(--kube-mute);
}

.footer .hint {
  margin-left: auto;
}

.structure-shell :deep(.structure-svg) {
  display: block;
}
</style>
