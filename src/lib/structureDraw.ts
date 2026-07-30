import { select, type Selection } from 'd3-selection'
import {
  StructureKind,
  structurePort,
  WIDGET_H,
  WIDGET_W,
  type PlacedStructureNode,
  type StructureEdge,
} from '@/lib/structureGraph'

/** Dark Obsidian Tech Aesthetic (inspired by reference pictures 1, 2 & 3). */
const Paint = {
  bg: '#09090b',
  cardBg: '#121217',
  cardBorder: '#27272a',
  cardHoverBorder: '#f97316',
  inkPrimary: '#f4f4f5',
  inkMuted: '#a1a1aa',
  inkOrdinal: '#71717a',
  accentOrange: '#f97316',
  accentGlow: '#ff6b00',
  strandDefault: '#27272a',
  strandHot: '#f97316',
  portBorder: '#f97316',
  portBg: '#09090b',
  gridDot: '#27272a',
} as const

export type StructWireSel = Selection<SVGGElement, StructureEdge, SVGGElement, unknown>
export type StructNodeSel = Selection<SVGGElement, PlacedStructureNode, SVGGElement, unknown>

/** Generate cubic bezier curve path for smooth workflow strands. */
export const bezierPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
): string => {
  const dy = Math.abs(to.y - from.y)
  const cpOffset = Math.max(36, dy * 0.45)
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + cpOffset}, ${to.x} ${to.y - cpOffset}, ${to.x} ${to.y}`
}

export const attachStructureDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')

  // Glow filter for cards and active wires
  const glow = defs
    .append('filter')
    .attr('id', 'orange-glow')
    .attr('x', '-30%')
    .attr('y', '-30%')
    .attr('width', '160%')
    .attr('height', '160%')
  glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
  glow.append('feMerge').html(`
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  `)

  // Card drop shadow
  const shadow = defs
    .append('filter')
    .attr('id', 'dark-card-shadow')
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')
  shadow
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 8)
    .attr('stdDeviation', 12)
    .attr('flood-color', 'rgba(0,0,0,0.65)')

  // Arrow markers
  const marker = (id: string, fill: string) => {
    defs
      .append('marker')
      .attr('id', id)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 1.5 L 10 5 L 0 8.5 z')
      .attr('fill', fill)
  }
  marker('struct-arrow', '#3f3f46')
  marker('struct-arrow-hot', Paint.accentOrange)

  // Gradient for hot wire strands
  const grad = defs
    .append('linearGradient')
    .attr('id', 'strand-glow-grad')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%')
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#ff6b00')
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#f97316')

  return defs
}

export const drawStructureBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
) => {
  const defs = svg.select('defs')

  // Dot matrix grid pattern
  const pattern = defs
    .append('pattern')
    .attr('id', 'dark-dot-grid')
    .attr('width', 28)
    .attr('height', 28)
    .attr('patternUnits', 'userSpaceOnUse')
  pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 1.1).attr('fill', Paint.gridDot)

  // Background rect with subtle radial ambient glow
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', Paint.bg)

  // Ambient center glow
  const radialGrad = defs.append('radialGradient').attr('id', 'ambient-glow')
  radialGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(249, 115, 22, 0.04)')
  radialGrad.append('stop').attr('offset', '70%').attr('stop-color', 'rgba(9, 9, 11, 0)')

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#ambient-glow)')
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#dark-dot-grid)')
}

const iconTileStyle = (kind: StructureKind) => {
  if (kind === StructureKind.Root) return { bg: 'rgba(249, 115, 22, 0.15)', stroke: '#f97316', icon: '#ff6b00' }
  if (kind === StructureKind.Folder) return { bg: 'rgba(39, 39, 42, 0.8)', stroke: '#3f3f46', icon: '#fb923c' }
  return { bg: 'rgba(24, 24, 27, 0.9)', stroke: '#27272a', icon: '#a1a1aa' }
}

const badgeText = (kind: StructureKind) => {
  if (kind === StructureKind.Root) return 'VAULT'
  if (kind === StructureKind.Folder) return 'DIR'
  return 'NOTE'
}

/** Draw SVG glyph icon inside card. */
const drawIconGlyph = (
  g: Selection<SVGGElement, PlacedStructureNode, null, undefined>,
  d: PlacedStructureNode,
  cx: number,
  cy: number,
  color: string,
) => {
  if (d.kind === StructureKind.Root) {
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 8).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2)
    g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3).attr('fill', color)
    return
  }
  if (d.kind === StructureKind.Folder) {
    g.append('path')
      .attr('d', `M${cx - 10},${cy - 2} h7 l2,-3 h8 a2,2 0 0 1 2,2 v11 a2,2 0 0 1 -2,2 h-17 a2,2 0 0 1 -2,-2 v-8 a2,2 0 0 1 2,-2 z`)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.8)
      .attr('stroke-linejoin', 'round')
    return
  }
  g.append('rect')
    .attr('x', cx - 7)
    .attr('y', cy - 9)
    .attr('width', 14)
    .attr('height', 18)
    .attr('rx', 2)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 1.8)
  g.append('line').attr('x1', cx - 4).attr('y1', cy - 3).attr('x2', cx + 4).attr('y2', cy - 3).attr('stroke', color).attr('stroke-width', 1.4)
  g.append('line').attr('x1', cx - 4).attr('y1', cy + 2).attr('x2', cx + 2).attr('y2', cy + 2).attr('stroke', color).attr('stroke-width', 1.4)
}

/** Draw high-tech sleek widget node (pic2 / pic3 style). */
export const drawStructureWidget = (
  g: Selection<SVGGElement, PlacedStructureNode, null, undefined>,
  d: PlacedStructureNode,
) => {
  const x0 = -WIDGET_W / 2
  const y0 = -WIDGET_H / 2
  const r = 14
  const style = iconTileStyle(d.kind)

  // Outer active glow ring
  g.append('rect')
    .attr('class', 'widget-ring')
    .attr('x', x0 - 3)
    .attr('y', y0 - 3)
    .attr('width', WIDGET_W + 6)
    .attr('height', WIDGET_H + 6)
    .attr('rx', r + 3)
    .attr('fill', 'none')
    .attr('stroke', Paint.accentOrange)
    .attr('stroke-width', 2)
    .attr('filter', 'url(#orange-glow)')
    .attr('opacity', 0)

  // Main dark card body
  g.append('rect')
    .attr('class', 'widget-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', WIDGET_W)
    .attr('height', WIDGET_H)
    .attr('rx', r)
    .attr('fill', Paint.cardBg)
    .attr('stroke', Paint.cardBorder)
    .attr('stroke-width', 1.2)
    .attr('filter', 'url(#dark-card-shadow)')

  // Left icon tile box (Pic 2)
  const ix = x0 + 14
  const iy = y0 + (WIDGET_H - 52) / 2
  g.append('rect')
    .attr('x', ix)
    .attr('y', iy)
    .attr('width', 52)
    .attr('height', 52)
    .attr('rx', 10)
    .attr('fill', style.bg)
    .attr('stroke', style.stroke)
    .attr('stroke-width', 1)

  drawIconGlyph(g, d, ix + 26, iy + 26, style.icon)

  // Ordinal step badge (e.g. "01", "02")
  g.append('text')
    .attr('x', x0 + WIDGET_W - 14)
    .attr('y', y0 + 22)
    .attr('text-anchor', 'end')
    .attr('fill', Paint.inkOrdinal)
    .attr('font-size', 11)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Mono", ui-monospace, monospace')
    .attr('letter-spacing', '0.06em')
    .text(String(d.index).padStart(2, '0'))

  // Kind badge tag (e.g. "VAULT", "DIR", "NOTE")
  const badgeW = 44
  const badgeH = 16
  const bx = x0 + WIDGET_W - 14 - badgeW - 24
  const by = y0 + 10
  g.append('rect')
    .attr('x', bx)
    .attr('y', by)
    .attr('width', badgeW)
    .attr('height', badgeH)
    .attr('rx', 4)
    .attr('fill', d.kind === StructureKind.Root ? 'rgba(249,115,22,0.2)' : 'rgba(39,39,42,0.6)')
    .attr('stroke', d.kind === StructureKind.Root ? '#f97316' : '#3f3f46')
    .attr('stroke-width', 0.8)

  g.append('text')
    .attr('x', bx + badgeW / 2)
    .attr('y', by + 11)
    .attr('text-anchor', 'middle')
    .attr('fill', d.kind === StructureKind.Root ? '#fb923c' : '#a1a1aa')
    .attr('font-size', 9)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Mono", monospace')
    .attr('letter-spacing', '0.05em')
    .text(badgeText(d.kind))

  // Node Title
  const title = d.title.length > 17 ? `${d.title.slice(0, 16)}…` : d.title
  g.append('text')
    .attr('x', ix + 64)
    .attr('y', y0 + 42)
    .attr('fill', Paint.inkPrimary)
    .attr('font-size', 14)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(title)

  // Node Subtitle / Meta
  const meta = d.meta.length > 26 ? `${d.meta.slice(0, 25)}…` : d.meta
  g.append('text')
    .attr('x', ix + 64)
    .attr('y', y0 + 62)
    .attr('fill', Paint.inkMuted)
    .attr('font-size', 11)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(meta)

  // Connection port dots on top & bottom card edges (Pic 2)
  for (const side of ['in', 'out'] as const) {
    const p = structurePort({ ...d, x: 0, y: 0 }, side)
    g.append('circle')
      .attr('cx', p.x)
      .attr('cy', p.y)
      .attr('r', 4)
      .attr('fill', Paint.portBg)
      .attr('stroke', Paint.portBorder)
      .attr('stroke-width', 1.5)
  }
}

/** Update wires with smooth glowing bezier paths and animated particles. */
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
    const path = bezierPath(from, to)

    const group = select(this)

    // Base dark strand line
    group
      .selectAll<SVGPathElement, string>('path.strand-base')
      .data([path])
      .join('path')
      .attr('class', 'strand-base')
      .attr('fill', 'none')
      .attr('stroke', Paint.strandDefault)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#struct-arrow)')
      .attr('d', (p) => p)

    // Glowing flow strand line (animated pulse)
    group
      .selectAll<SVGPathElement, string>('path.strand-pulse')
      .data([path])
      .join('path')
      .attr('class', 'strand-pulse')
      .attr('fill', 'none')
      .attr('stroke', Paint.strandHot)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8 16')
      .attr('opacity', 0.6)
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
    if (hotId.length === 0) return 0.95
    return d.from === hotId || d.to === hotId ? 1 : 0.18
  })

  wireSel.selectAll<SVGPathElement, string>('path.strand-base').attr('stroke', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    return hot ? Paint.strandHot : Paint.strandDefault
  })

  wireSel.selectAll<SVGPathElement, string>('path.strand-base').attr('marker-end', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    return hot ? 'url(#struct-arrow-hot)' : 'url(#struct-arrow)'
  })

  wireSel.selectAll<SVGPathElement, string>('path.strand-pulse').attr('opacity', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    return hot ? 1 : 0.4
  })

  nodeSel.attr('opacity', (d) => {
    if (hotId.length === 0) return 1
    return d.id === hotId ? 1 : 0.35
  })

  nodeSel.selectAll<SVGRectElement, PlacedStructureNode>('rect.widget-ring').attr('opacity', (d) => {
    if (d.noteId.length > 0 && d.noteId === activeNoteId) return 1
    if (d.folderPath.length > 0 && d.folderPath === focusFolder) return 1
    if (d.id === hotId) return 1
    return 0
  })

  nodeSel.selectAll<SVGRectElement, PlacedStructureNode>('rect.widget-body').attr('stroke', (d) => {
    if (d.noteId.length > 0 && d.noteId === activeNoteId) return Paint.accentOrange
    if (d.folderPath.length > 0 && d.folderPath === focusFolder) return Paint.accentOrange
    if (d.id === hotId) return Paint.accentOrange
    return Paint.cardBorder
  })
}
