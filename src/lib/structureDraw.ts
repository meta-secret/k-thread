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

/** Light workflow language from design refs — not a Links-graph restyle. */
const Paint = {
  bg: '#f6f6f8',
  card: '#ffffff',
  ink: '#1c1c22',
  mute: '#7a7a86',
  line: 'rgba(28, 28, 34, 0.12)',
  arrow: '#5c5c68',
  arrowHot: '#c45a2a',
  accent: '#e07a3a',
  rootIcon: '#FFE0C2',
  folderIcon: '#E4E8F0',
  noteIcon: '#E8E0F5',
  port: '#ffffff',
  grid: 'rgba(28, 28, 34, 0.06)',
} as const

export type StructWireSel = Selection<SVGGElement, StructureEdge, SVGGElement, unknown>
export type StructNodeSel = Selection<SVGGElement, PlacedStructureNode, SVGGElement, unknown>

export const attachStructureDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')
  const marker = (id: string, fill: string) => {
    defs
      .append('marker')
      .attr('id', id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 1.2 L 10 5 L 0 8.8 z')
      .attr('fill', fill)
  }
  marker('struct-arrow', Paint.arrow)
  marker('struct-arrow-hot', Paint.arrowHot)

  // Soft card shadow
  const filter = defs
    .append('filter')
    .attr('id', 'struct-card-shadow')
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')
  filter
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 2)
    .attr('stdDeviation', 3)
    .attr('flood-color', 'rgba(28,28,34,0.10)')
  return defs
}

export const drawStructureBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
) => {
  const defs = svg.select('defs')
  const pattern = defs
    .append('pattern')
    .attr('id', 'struct-dot-grid')
    .attr('width', 28)
    .attr('height', 28)
    .attr('patternUnits', 'userSpaceOnUse')
  pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 1).attr('fill', Paint.grid)
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', Paint.bg)
  svg
    .append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'url(#struct-dot-grid)')
}

const iconFill = (d: PlacedStructureNode): string => {
  if (d.kind === StructureKind.Root) return Paint.rootIcon
  if (d.kind === StructureKind.Folder) return Paint.folderIcon
  return Paint.noteIcon
}

/** Simple line icons — vault / folder / note. */
const drawIconGlyph = (
  g: Selection<SVGGElement, PlacedStructureNode, null, undefined>,
  d: PlacedStructureNode,
  cx: number,
  cy: number,
) => {
  const stroke = Paint.ink
  if (d.kind === StructureKind.Root) {
    g.append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 9)
      .attr('fill', 'none')
      .attr('stroke', stroke)
      .attr('stroke-width', 1.6)
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3).attr('fill', Paint.accent)
    return
  }
  if (d.kind === StructureKind.Folder) {
    g.append('path')
      .attr(
        'd',
        `M${cx - 11},${cy - 2} h8 l2,-4 h10 a2,2 0 0 1 2,2 v12 a2,2 0 0 1 -2,2 h-20 a2,2 0 0 1 -2,-2 v-8 a2,2 0 0 1 2,-2 z`,
      )
      .attr('fill', 'none')
      .attr('stroke', stroke)
      .attr('stroke-width', 1.6)
      .attr('stroke-linejoin', 'round')
    return
  }
  g.append('rect')
    .attr('x', cx - 8)
    .attr('y', cy - 10)
    .attr('width', 16)
    .attr('height', 20)
    .attr('rx', 2)
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-width', 1.6)
  g.append('line')
    .attr('x1', cx - 4)
    .attr('y1', cy - 3)
    .attr('x2', cx + 4)
    .attr('y2', cy - 3)
    .attr('stroke', stroke)
    .attr('stroke-width', 1.4)
  g.append('line')
    .attr('x1', cx - 4)
    .attr('y1', cy + 2)
    .attr('x2', cx + 2)
    .attr('y2', cy + 2)
    .attr('stroke', stroke)
    .attr('stroke-width', 1.4)
}

export const drawStructureWidget = (
  g: Selection<SVGGElement, PlacedStructureNode, null, undefined>,
  d: PlacedStructureNode,
) => {
  const x0 = -WIDGET_W / 2
  const y0 = -WIDGET_H / 2
  const r = 16

  g.append('rect')
    .attr('class', 'widget-ring')
    .attr('x', x0 - 4)
    .attr('y', y0 - 4)
    .attr('width', WIDGET_W + 8)
    .attr('height', WIDGET_H + 8)
    .attr('rx', r + 4)
    .attr('fill', 'none')
    .attr('stroke', Paint.accent)
    .attr('stroke-width', 2)
    .attr('opacity', 0)

  g.append('rect')
    .attr('class', 'widget-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', WIDGET_W)
    .attr('height', WIDGET_H)
    .attr('rx', r)
    .attr('fill', Paint.card)
    .attr('stroke', Paint.line)
    .attr('stroke-width', 1)
    .attr('filter', 'url(#struct-card-shadow)')

  // Icon tile (pic2)
  const ix = x0 + 14
  const iy = y0 + (WIDGET_H - 52) / 2
  g.append('rect')
    .attr('x', ix)
    .attr('y', iy)
    .attr('width', 52)
    .attr('height', 52)
    .attr('rx', 12)
    .attr('fill', iconFill(d))
  drawIconGlyph(g, d, ix + 26, iy + 26)

  // Step index
  g.append('text')
    .attr('x', x0 + WIDGET_W - 16)
    .attr('y', y0 + 22)
    .attr('text-anchor', 'end')
    .attr('fill', Paint.mute)
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Mono", ui-monospace, monospace')
    .attr('letter-spacing', '0.06em')
    .text(String(d.index).padStart(2, '0'))

  const title = d.title.length > 18 ? `${d.title.slice(0, 17)}…` : d.title
  g.append('text')
    .attr('x', ix + 64)
    .attr('y', y0 + 36)
    .attr('fill', Paint.ink)
    .attr('font-size', 15)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(title)

  const meta = d.meta.length > 28 ? `${d.meta.slice(0, 27)}…` : d.meta
  g.append('text')
    .attr('x', ix + 64)
    .attr('y', y0 + 56)
    .attr('fill', Paint.mute)
    .attr('font-size', 12)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(meta)

  // Ports (pic2)
  for (const side of ['in', 'out'] as const) {
    const p = structurePort({ ...d, x: 0, y: 0 }, side)
    g.append('circle')
      .attr('cx', p.x)
      .attr('cy', p.y)
      .attr('r', 4)
      .attr('fill', Paint.port)
      .attr('stroke', Paint.arrow)
      .attr('stroke-width', 1.4)
  }
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
    const path = orthoPath(from, { x: to.x, y: to.y - 5 })
    select(this)
      .selectAll<SVGPathElement, string>('path.strand')
      .data([path])
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke', Paint.arrow)
      .attr('stroke-width', 1.75)
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
  activeNoteId: string,
) => {
  wireSel.attr('opacity', (d) => {
    if (hotId.length === 0) return 0.9
    return d.from === hotId || d.to === hotId ? 1 : 0.16
  })
  wireSel.selectAll<SVGPathElement, string>('path.strand').attr('stroke', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    return hot ? Paint.arrowHot : Paint.arrow
  })
  wireSel.selectAll<SVGPathElement, string>('path.strand').attr('marker-end', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    return hot ? 'url(#struct-arrow-hot)' : 'url(#struct-arrow)'
  })

  nodeSel.attr('opacity', (d) => {
    if (hotId.length === 0) return 1
    return d.id === hotId ? 1 : 0.4
  })
  nodeSel.selectAll<SVGRectElement, PlacedStructureNode>('rect.widget-ring').attr('opacity', (d) => {
    if (d.noteId.length > 0 && d.noteId === activeNoteId) return 1
    if (d.folderPath.length > 0 && d.folderPath === focusFolder) return 1
    if (d.id === hotId) return 1
    return 0
  })
}
