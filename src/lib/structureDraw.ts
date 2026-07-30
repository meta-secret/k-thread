import { select, type Selection } from 'd3-selection'
import { orthoPath } from '@/lib/graphView'
import {
  StructureKind,
  structurePort,
  WIDGET_H,
  WIDGET_W,
  type PlacedStructureNode,
  type StructureEdge,
} from '@/lib/structureGraph'

const Paint = {
  bg: '#ffffff',
  ink: '#3a3a42',
  mute: '#8a8a96',
  arrow: '#5a5a64',
  arrowHot: '#2e2e36',
  root: '#FFE8C8',
  folder: '#E8E8EC',
  note: '#E4DCF5',
  ring: '#3a3a42',
  iconBg: '#ffffff',
} as const

export type StructWireSel = Selection<SVGGElement, StructureEdge, SVGGElement, unknown>
export type StructNodeSel = Selection<SVGGElement, PlacedStructureNode, SVGGElement, unknown>

export const attachStructureDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')
  defs
    .append('marker')
    .attr('id', 'struct-arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 0 1 L 10 5 L 0 9 z')
    .attr('fill', Paint.arrow)
  defs
    .append('marker')
    .attr('id', 'struct-arrow-hot')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 0 1 L 10 5 L 0 9 z')
    .attr('fill', Paint.arrowHot)
  return defs
}

export const drawStructureBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
) => {
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', Paint.bg)
}

const fillFor = (d: PlacedStructureNode): string => {
  if (d.kind === StructureKind.Root) return Paint.root
  if (d.kind === StructureKind.Folder) return Paint.folder
  return Paint.note
}

const glyphFor = (d: PlacedStructureNode): string => {
  if (d.kind === StructureKind.Root) return '◆'
  if (d.kind === StructureKind.Folder) return '▣'
  return '◉'
}

export const drawStructureWidget = (
  g: Selection<SVGGElement, PlacedStructureNode, null, undefined>,
  d: PlacedStructureNode,
) => {
  const x0 = -WIDGET_W / 2
  const y0 = -WIDGET_H / 2
  const r = 14

  g.append('rect')
    .attr('class', 'widget-ring')
    .attr('x', x0 - 3)
    .attr('y', y0 - 3)
    .attr('width', WIDGET_W + 6)
    .attr('height', WIDGET_H + 6)
    .attr('rx', r + 3)
    .attr('fill', 'none')
    .attr('stroke', Paint.ring)
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)

  g.append('rect')
    .attr('class', 'widget-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', WIDGET_W)
    .attr('height', WIDGET_H)
    .attr('rx', r)
    .attr('fill', fillFor(d))
    .attr('stroke', 'none')

  g.append('rect')
    .attr('x', x0 + 12)
    .attr('y', y0 + 16)
    .attr('width', 40)
    .attr('height', 40)
    .attr('rx', 10)
    .attr('fill', Paint.iconBg)
    .attr('stroke', 'rgba(18,18,20,0.08)')
    .attr('stroke-width', 1)

  g.append('text')
    .attr('x', x0 + 32)
    .attr('y', y0 + 42)
    .attr('text-anchor', 'middle')
    .attr('fill', Paint.ink)
    .attr('font-size', 16)
    .text(glyphFor(d))

  const title = d.title.length > 16 ? `${d.title.slice(0, 15)}…` : d.title
  g.append('text')
    .attr('x', x0 + 64)
    .attr('y', y0 + 32)
    .attr('fill', Paint.ink)
    .attr('font-size', 14)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(title)

  g.append('text')
    .attr('x', x0 + 64)
    .attr('y', y0 + 50)
    .attr('fill', Paint.mute)
    .attr('font-size', 11)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(d.meta)
}

export const updateStructureWires = (
  wires: StructWireSel,
  nodes: Map<string, PlacedStructureNode>,
) => {
  wires.each(function (d) {
    const s = nodes.get(d.from)
    const t = nodes.get(d.to)
    if (!s || !t) return
    const from = structurePort(s, 'out')
    const to = structurePort(t, 'in')
    const path = orthoPath(from, { x: to.x, y: to.y - 4 })
    select(this)
      .selectAll<SVGPathElement, string>('path.strand')
      .data([path])
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke', Paint.arrow)
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('marker-end', 'url(#struct-arrow)')
      .attr('d', (p) => p)
  })
}

export const paintStructureFocus = (
  wireSel: StructWireSel,
  nodeSel: StructNodeSel,
  hotId: string,
  focusFolder: string,
) => {
  wireSel.attr('opacity', (d) => {
    if (hotId.length === 0) return 0.85
    return d.from === hotId || d.to === hotId ? 1 : 0.18
  })
  wireSel.selectAll<SVGPathElement, string>('path.strand').attr('stroke', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    return hot ? Paint.arrowHot : Paint.arrow
  })

  nodeSel.attr('opacity', (d) => {
    if (hotId.length === 0) return 1
    return d.id === hotId ? 1 : 0.35
  })
  nodeSel.selectAll<SVGRectElement, PlacedStructureNode>('rect.widget-ring').attr('opacity', (d) => {
    if (d.noteId.length > 0 && focusFolder.length === 0 && d.id === hotId) return 1
    if (d.folderPath.length > 0 && d.folderPath === focusFolder) return 1
    if (d.kind === StructureKind.Root && focusFolder.length === 0 && hotId === d.id) return 1
    return d.id === hotId ? 1 : 0
  })
}
