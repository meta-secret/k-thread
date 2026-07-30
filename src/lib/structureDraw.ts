import { select, type Selection } from 'd3-selection'
import {
  StructureEdgeKind,
  StructureKind,
  structurePort,
  WIDGET_H,
  WIDGET_W,
  type PlacedStructureNode,
  type StructureEdge,
} from '@/lib/structureGraph'

export type ThemeMode = 'dark' | 'light'

/** Dual-theme palette: Light (main page aligned) & Dark Obsidian. */
export const ThemePaints = {
  dark: {
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
    shadowId: 'dark-card-shadow',
  },
  light: {
    bg: '#efeff1',
    cardBg: '#ffffff',
    cardBorder: 'rgba(18, 18, 20, 0.14)',
    cardHoverBorder: '#f97316',
    inkPrimary: '#121214',
    inkMuted: '#6b6b73',
    inkOrdinal: '#8a8a96',
    accentOrange: '#f97316',
    accentGlow: '#ea580c',
    strandDefault: 'rgba(18, 18, 20, 0.18)',
    strandHot: '#f97316',
    portBorder: '#f97316',
    portBg: '#ffffff',
    gridDot: 'rgba(18, 18, 20, 0.08)',
    shadowId: 'light-card-shadow',
  },
} as const

export const getPaint = (mode: ThemeMode) => ThemePaints[mode]

export type StructWireSel = Selection<SVGGElement, StructureEdge, SVGGElement, unknown>
export type StructNodeSel = Selection<SVGGElement, PlacedStructureNode, SVGGElement, unknown>

/** Generate horizontal cubic bezier curve path for smooth left-to-right workflow strands. */
export const bezierPath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
): string => {
  const dx = Math.abs(to.x - from.x)
  const cpOffset = Math.max(28, dx * 0.5)
  return `M ${from.x} ${from.y} C ${from.x + cpOffset} ${from.y}, ${to.x - cpOffset} ${to.y}, ${to.x} ${to.y}`
}

export const attachStructureDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')

  // Glow filter
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

  // Dark card drop shadow
  const shadowDark = defs
    .append('filter')
    .attr('id', 'dark-card-shadow')
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')
  shadowDark
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 8)
    .attr('stdDeviation', 12)
    .attr('flood-color', 'rgba(0,0,0,0.65)')

  // Light card drop shadow
  const shadowLight = defs
    .append('filter')
    .attr('id', 'light-card-shadow')
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')
  shadowLight
    .append('feDropShadow')
    .attr('dx', 0)
    .attr('dy', 6)
    .attr('stdDeviation', 10)
    .attr('flood-color', 'rgba(18,18,20,0.08)')

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
  marker('struct-arrow', '#f97316')
  marker('struct-arrow-hot', '#ff6b00')
  marker('wikilink-arrow', '#06b6d4')
  marker('wikilink-arrow-hot', '#38bdf8')

  return defs
}

export const drawStructureBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
  mode: ThemeMode = 'light',
) => {
  const paint = getPaint(mode)
  const defs = svg.select('defs')

  // Dot matrix pattern
  const patternId = `dot-grid-${mode}`
  defs.select(`#${patternId}`).remove()

  const pattern = defs
    .append('pattern')
    .attr('id', patternId)
    .attr('width', 28)
    .attr('height', 28)
    .attr('patternUnits', 'userSpaceOnUse')
  pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 1.1).attr('fill', paint.gridDot)

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', paint.bg)

  // Ambient center glow
  const gradId = `ambient-glow-${mode}`
  defs.select(`#${gradId}`).remove()
  const radialGrad = defs.append('radialGradient').attr('id', gradId)
  radialGrad.append('stop').attr('offset', '0%').attr('stop-color', mode === 'dark' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.06)')
  radialGrad.append('stop').attr('offset', '70%').attr('stop-color', mode === 'dark' ? 'rgba(9, 9, 11, 0)' : 'rgba(239, 239, 241, 0)')

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', `url(#${gradId})`)
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', `url(#${patternId})`)
}

const iconTileStyle = (kind: StructureKind, mode: ThemeMode) => {
  if (mode === 'dark') {
    if (kind === StructureKind.Root) return { bg: 'rgba(249, 115, 22, 0.15)', stroke: '#f97316', icon: '#ff6b00' }
    if (kind === StructureKind.Folder) return { bg: 'rgba(39, 39, 42, 0.8)', stroke: '#3f3f46', icon: '#fb923c' }
    return { bg: 'rgba(24, 24, 27, 0.9)', stroke: '#27272a', icon: '#a1a1aa' }
  }
  // Light theme
  if (kind === StructureKind.Root) return { bg: 'rgba(249, 115, 22, 0.12)', stroke: 'rgba(249, 115, 22, 0.4)', icon: '#ea580c' }
  if (kind === StructureKind.Folder) return { bg: '#e4e8f0', stroke: '#d0d5e0', icon: '#2563eb' }
  return { bg: '#e8e0f5', stroke: '#d8ccf0', icon: '#7c3aed' }
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

/** Draw high-tech sleek widget node card with action menu trigger. */
export const drawStructureWidget = (
  g: Selection<SVGGElement, PlacedStructureNode, null, undefined>,
  d: PlacedStructureNode,
  mode: ThemeMode = 'light',
) => {
  const paint = getPaint(mode)
  const x0 = -WIDGET_W / 2
  const y0 = -WIDGET_H / 2
  const r = 10
  const style = iconTileStyle(d.kind, mode)

  // Outer active glow ring
  g.append('rect')
    .attr('class', 'widget-ring')
    .attr('x', x0 - 2.5)
    .attr('y', y0 - 2.5)
    .attr('width', WIDGET_W + 5)
    .attr('height', WIDGET_H + 5)
    .attr('rx', r + 2.5)
    .attr('fill', 'none')
    .attr('stroke', paint.accentOrange)
    .attr('stroke-width', 2)
    .attr('filter', 'url(#orange-glow)')
    .attr('opacity', 0)

  // Main card body
  g.append('rect')
    .attr('class', 'widget-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', WIDGET_W)
    .attr('height', WIDGET_H)
    .attr('rx', r)
    .attr('fill', paint.cardBg)
    .attr('stroke', paint.cardBorder)
    .attr('stroke-width', 1.2)
    .attr('filter', `url(#${paint.shadowId})`)

  // Left icon tile box (34x34px)
  const ix = x0 + 10
  const iy = y0 + 10
  g.append('rect')
    .attr('x', ix)
    .attr('y', iy)
    .attr('width', 34)
    .attr('height', 34)
    .attr('rx', 7)
    .attr('fill', style.bg)
    .attr('stroke', style.stroke)
    .attr('stroke-width', 1)

  drawIconGlyph(g, d, ix + 17, iy + 17, style.icon)

  // Ordinal step badge (e.g. "01", "02")
  g.append('text')
    .attr('x', x0 + WIDGET_W - 10)
    .attr('y', y0 + 19)
    .attr('text-anchor', 'end')
    .attr('fill', paint.inkOrdinal)
    .attr('font-size', 9.5)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Mono", ui-monospace, monospace')
    .attr('letter-spacing', '0.06em')
    .text(String(d.index).padStart(2, '0'))

  // Kind badge tag (e.g. "VAULT", "DIR", "NOTE")
  const badgeW = 34
  const badgeH = 13
  const bx = x0 + WIDGET_W - 10 - badgeW - 16
  const by = y0 + 9
  const isRoot = d.kind === StructureKind.Root

  g.append('rect')
    .attr('x', bx)
    .attr('y', by)
    .attr('width', badgeW)
    .attr('height', badgeH)
    .attr('rx', 3.5)
    .attr('fill', isRoot ? 'rgba(249,115,22,0.15)' : mode === 'dark' ? 'rgba(39,39,42,0.6)' : 'rgba(18,18,20,0.06)')
    .attr('stroke', isRoot ? '#f97316' : mode === 'dark' ? '#3f3f46' : 'rgba(18,18,20,0.14)')
    .attr('stroke-width', 0.8)

  g.append('text')
    .attr('x', bx + badgeW / 2)
    .attr('y', by + 9.5)
    .attr('text-anchor', 'middle')
    .attr('fill', isRoot ? '#ea580c' : paint.inkMuted)
    .attr('font-size', 8)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Mono", monospace')
    .attr('letter-spacing', '0.04em')
    .text(badgeText(d.kind))

  // Node Title
  const maxTitleLen = 14
  const title = d.title.length > maxTitleLen ? `${d.title.slice(0, maxTitleLen - 1)}…` : d.title
  g.append('text')
    .attr('x', ix + 42)
    .attr('y', y0 + 26)
    .attr('fill', paint.inkPrimary)
    .attr('font-size', 12)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(title)

  // Node Subtitle / Meta
  const maxMetaLen = 18
  const meta = d.meta.length > maxMetaLen ? `${d.meta.slice(0, maxMetaLen - 1)}…` : d.meta
  g.append('text')
    .attr('x', ix + 42)
    .attr('y', y0 + 41)
    .attr('fill', d.isCollapsed ? paint.accentOrange : paint.inkMuted)
    .attr('font-size', 9.5)
    .attr('font-weight', d.isCollapsed ? 600 : 400)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(meta)

  // Collapse indicator badge if collapsed
  if (d.isCollapsed) {
    const cx = x0 + WIDGET_W - 54
    const cy = y0 + 33
    g.append('rect')
      .attr('x', cx)
      .attr('y', cy)
      .attr('width', 44)
      .attr('height', 15)
      .attr('rx', 3.5)
      .attr('fill', 'rgba(249,115,22,0.18)')
      .attr('stroke', '#f97316')
      .attr('stroke-width', 0.8)

    g.append('text')
      .attr('x', cx + 22)
      .attr('y', cy + 10.5)
      .attr('text-anchor', 'middle')
      .attr('fill', paint.accentOrange)
      .attr('font-size', 8.5)
      .attr('font-weight', 700)
      .attr('font-family', '"IBM Plex Sans", sans-serif')
      .text('▸ EXPAND')
  }

  // Connection port dots on left & right card edges
  for (const side of ['in', 'out'] as const) {
    const p = structurePort({ ...d, x: 0, y: 0 }, side)
    g.append('circle')
      .attr('cx', p.x)
      .attr('cy', p.y)
      .attr('r', 2.5)
      .attr('fill', paint.portBg)
      .attr('stroke', paint.portBorder)
      .attr('stroke-width', 1.2)
  }
}

/** Update wires with smooth glowing bezier paths and animated particles. */
export const updateStructureWires = (
  wires: StructWireSel,
  nodes: Map<string, PlacedStructureNode>,
  mode: ThemeMode = 'light',
) => {
  const paint = getPaint(mode)
  wires.each(function (d) {
    const s = nodes.get(d.from)
    const t = nodes.get(d.to)
    if (!s || !t) return
    const from = structurePort(s, 'out')
    const to = structurePort(t, 'in')
    const path = bezierPath(from, to)

    const isWikilink = d.kind === StructureEdgeKind.Wikilink
    const baseColor = isWikilink ? (mode === 'dark' ? '#0891b2' : '#06b6d4') : paint.strandDefault
    const hotColor = isWikilink ? '#38bdf8' : paint.strandHot
    const arrowUrl = isWikilink ? 'url(#wikilink-arrow)' : 'url(#struct-arrow)'

    const group = select(this)

    // Base strand line
    group
      .selectAll<SVGPathElement, string>('path.strand-base')
      .data([path])
      .join('path')
      .attr('class', 'strand-base')
      .attr('fill', 'none')
      .attr('stroke', baseColor)
      .attr('stroke-width', isWikilink ? 1.8 : 2)
      .attr('stroke-dasharray', isWikilink ? '5 5' : 'none')
      .attr('marker-end', arrowUrl)
      .attr('d', (p) => p)

    // Glowing flow strand line (animated pulse)
    group
      .selectAll<SVGPathElement, string>('path.strand-pulse')
      .data([path])
      .join('path')
      .attr('class', 'strand-pulse')
      .attr('fill', 'none')
      .attr('stroke', hotColor)
      .attr('stroke-width', 2.2)
      .attr('stroke-dasharray', '8 16')
      .attr('filter', 'url(#orange-glow)')
      .attr('opacity', mode === 'dark' ? 0.95 : 0.85)
      .attr('d', (p) => p)
  })
}

export const paintStructureFocus = (
  wireSel: StructWireSel,
  nodeSel: StructNodeSel,
  hotId: string,
  focusFolder: string,
  activeNoteId: string,
  mode: ThemeMode = 'light',
) => {
  const paint = getPaint(mode)
  wireSel.attr('opacity', (d) => {
    if (hotId.length === 0) return 0.95
    return d.from === hotId || d.to === hotId ? 1 : 0.18
  })

  wireSel.selectAll<SVGPathElement, string>('path.strand-base').attr('stroke', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    const isWikilink = edge.kind === StructureEdgeKind.Wikilink
    if (isWikilink) {
      return hot ? '#38bdf8' : mode === 'dark' ? '#0891b2' : '#06b6d4'
    }
    return hot ? paint.strandHot : paint.strandDefault
  })

  wireSel.selectAll<SVGPathElement, string>('path.strand-base').attr('marker-end', function () {
    const edge = select(this.parentNode as SVGGElement).datum() as StructureEdge
    const hot = hotId.length > 0 && (edge.from === hotId || edge.to === hotId)
    const isWikilink = edge.kind === StructureEdgeKind.Wikilink
    if (isWikilink) {
      return hot ? 'url(#wikilink-arrow-hot)' : 'url(#wikilink-arrow)'
    }
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
    if (d.noteId.length > 0 && d.noteId === activeNoteId) return paint.accentOrange
    if (d.folderPath.length > 0 && d.folderPath === focusFolder) return paint.accentOrange
    if (d.id === hotId) return paint.accentOrange
    return paint.cardBorder
  })
}
