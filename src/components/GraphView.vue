<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { select } from 'd3-selection'
import { zoom } from 'd3-zoom'
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { none, some, type GraphIndex, type DocId, type Option } from '../types'

const props = defineProps<{
  index: GraphIndex
  activeId: DocId | ''
}>()

const emit = defineEmits<{
  select: [id: DocId]
}>()

type Node = SimulationNodeDatum & { id: DocId }
type Link = SimulationLinkDatum<Node>

let host: Option<HTMLElement> = none
let sim: Option<ReturnType<typeof forceSimulation<Node>>> = none

const num = (value: unknown): number => (typeof value === 'number' ? value : 0)

const labelOf = (id: DocId): string => {
  const parts = id.split('/')
  const last = parts[parts.length - 1]
  return typeof last === 'string' ? last : id
}

const nodePoint = (end: Link['source'] | Link['target']): { x: number; y: number } => {
  if (typeof end === 'object') {
    return { x: num(end.x), y: num(end.y) }
  }
  return { x: 0, y: 0 }
}

const bindHost = (el: unknown) => {
  host = el instanceof HTMLElement ? some(el) : none
  if (host.tag === 'some') render()
}

const render = () => {
  if (host.tag === 'none') return
  const el = host.value
  el.replaceChildren()

  if (sim.tag === 'some') {
    sim.value.stop()
    sim = none
  }

  const width = el.clientWidth > 0 ? el.clientWidth : 800
  const height = el.clientHeight > 0 ? el.clientHeight : 600

  const nodes: Node[] = props.index.nodes.map((id) => ({ id }))
  const links: Link[] = props.index.edges.map((e) => ({ source: e.from, target: e.to }))

  const svg = select(el)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)

  const root = svg.append('g')
  svg.call(
    zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      root.attr('transform', event.transform.toString())
    }),
  )

  const link = root
    .append('g')
    .attr('stroke', 'var(--line-strong)')
    .attr('stroke-opacity', 0.9)
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke-width', 1.2)

  const node = root
    .append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')
    .on('click', (_event, d) => emit('select', d.id))

  node
    .append('circle')
    .attr('r', (d) => (d.id === props.activeId ? 8 : 6))
    .attr('fill', (d) => (d.id === props.activeId ? 'var(--accent)' : 'var(--accent-2)'))
    .attr('stroke', 'var(--bg)')
    .attr('stroke-width', 2)

  node
    .append('text')
    .text((d) => labelOf(d.id))
    .attr('x', 10)
    .attr('y', 4)
    .attr('fill', 'var(--ink)')
    .attr('font-size', 12)
    .attr('font-family', 'var(--font-sans)')

  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<Node, Link>(links)
        .id((d) => d.id)
        .distance(90),
    )
    .force('charge', forceManyBody().strength(-220))
    .force('center', forceCenter(width / 2, height / 2))
    .on('tick', () => {
      link
        .attr('x1', (d) => nodePoint(d.source).x)
        .attr('y1', (d) => nodePoint(d.source).y)
        .attr('x2', (d) => nodePoint(d.target).x)
        .attr('y2', (d) => nodePoint(d.target).y)
      node.attr('transform', (d) => `translate(${num(d.x)},${num(d.y)})`)
    })

  sim = some(simulation)
}

watch(
  () => [props.index.nodes, props.index.edges, props.activeId] as const,
  () => render(),
  { deep: true },
)

onBeforeUnmount(() => {
  if (sim.tag === 'some') {
    sim.value.stop()
    sim = none
  }
})
</script>

<template>
  <div :ref="bindHost" class="graph" />
</template>

<style scoped>
.graph {
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 40%),
    radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--accent-2) 10%, transparent), transparent 45%),
    var(--bg);
}
</style>
