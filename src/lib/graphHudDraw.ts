import { select, type Selection } from 'd3-selection'
import {
  folderHue,
  folderOf,
  HudTier,
  labelOf,
  NODE_H,
  NODE_W,
  orthoPath,
  type HudNode,
  type HudWire,
  type Point,
} from '@/lib/graphView'
import type { DocId } from '@/types'

/** GTD-style flowchart palette — soft pastels on white, charcoal arrows. */
export const HudPaint = {
  bg: '#ffffff',
  ink: '#3a3a42',
  mute: '#8a8a96',
  dim: '#b4b4bc',
  arrow: '#5a5a64',
  arrowHot: '#2e2e36',
  activeRing: '#3a3a42',
} as const

/** Soft fills like the GTD chart — rotated by folder / layer. */
const PASTELS = [
  '#FFE8C8', // peach
  '#E8E8EC', // gray
  '#F5D0D8', // pink
  '#D4F0E0', // mint
  '#E4DCF5', // lavender
  '#D6E8F5', // sky
] as const

export type WireSel = Selection<SVGGElement, HudWire, SVGGElement, unknown>
export type NodeSel = Selection<SVGGElement, HudNode, SVGGElement, unknown>

export const sizeOf = (_d: HudNode): { w: number; h: number } => ({ w: NODE_W, h: NODE_H })

export const portOf = (d: HudNode, side: 'in' | 'out'): Point => {
  const { w } = sizeOf(d)
  return { x: d.x + (side === 'out' ? w / 2 : -w / 2), y: d.y }
}

export const clipLabel = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

const pastelFor = (d: HudNode): string => {
  if (d.kind === 'missing') return '#F0F0F2'
  if (d.tier === HudTier.Root) return PASTELS[0]
  const hue = folderHue(folderOf(d.id))
  return PASTELS[(Math.floor(hue / 60) + d.layer) % PASTELS.length] ?? PASTELS[1]
}

export const attachHudDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')

  defs
    .append('marker')
    .attr('id', 'arrow-end')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', HudPaint.arrow)

  defs
    .append('marker')
    .attr('id', 'arrow-end-hot')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', HudPaint.arrowHot)

  return defs
}

export const drawHudBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
) => {
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', HudPaint.bg)
  return svg.append('g').attr('class', 'chrome')
}

export const drawLayerLabels = (
  chrome: Selection<SVGGElement, unknown, null, undefined>,
  nodes: readonly HudNode[],
) => {
  const layers = [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b)
  for (const layer of layers) {
    const sample = nodes.find((n) => n.layer === layer)
    if (!sample) continue
    chrome
      .append('text')
      .attr('x', sample.x)
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', HudPaint.mute)
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
      .text(layer === 0 ? 'Focus' : `Hop ${layer}`)
  }
}

/** One note = one pastel pill (GTD flowchart language). */
export const drawPill = (g: Selection<SVGGElement, HudNode, null, undefined>, d: HudNode) => {
  const { w, h } = sizeOf(d)
  const x0 = -w / 2
  const y0 = -h / 2
  const r = h / 2
  const title = clipLabel(labelOf(d.id), 16)

  g.append('rect')
    .attr('class', 'chip-active')
    .attr('x', x0 - 3)
    .attr('y', y0 - 3)
    .attr('width', w + 6)
    .attr('height', h + 6)
    .attr('rx', r + 3)
    .attr('fill', 'none')
    .attr('stroke', HudPaint.activeRing)
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)

  g.append('rect')
    .attr('class', 'chip-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', w)
    .attr('height', h)
    .attr('rx', r)
    .attr('fill', pastelFor(d))
    .attr('stroke', 'none')

  g.append('text')
    .attr('x', 0)
    .attr('y', 5)
    .attr('text-anchor', 'middle')
    .attr('fill', HudPaint.ink)
    .attr('font-size', 13)
    .attr('font-weight', 500)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(title)
}

export const updateWires = (wires: WireSel, nodes: Map<DocId, HudNode>) => {
  wires.each(function (d) {
    const s = nodes.get(d.from)
    const t = nodes.get(d.to)
    if (!s || !t) return
    const from = portOf(s, 'out')
    const to = portOf(t, 'in')
    // Nudge target so arrowhead sits just before the pill edge
    const path = orthoPath(from, { x: to.x - 2, y: to.y })
    const g = select(this)

    g.selectAll<SVGPathElement, string>('path.glow').remove()
    g.selectAll<SVGCircleElement, Point>('circle.port').remove()

    g.selectAll<SVGPathElement, string>('path.strand')
      .data([path])
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke', HudPaint.arrow)
      .attr('stroke-width', 1.35)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'miter')
      .attr('marker-end', 'url(#arrow-end)')
      .attr('stroke-dasharray', d.missing || !d.real ? '4 5' : null)
      .attr('d', (p) => p)
  })
}

export type FocusOpts = {
  activeId: DocId | ''
  hoveredId: DocId | ''
  isDimmed: (id: DocId) => boolean
  isWireHot: (link: HudWire) => boolean
}

export const paintFocus = (wireSel: WireSel, nodeSel: NodeSel, opts: FocusOpts) => {
  const { activeId, hoveredId, isDimmed, isWireHot } = opts
  const focusing = hoveredId.length > 0 || activeId.length > 0

  wireSel.each(function (d) {
    const hot = isWireHot(d)
    const dim = focusing && !hot
    const g = select(this)
    g.attr('opacity', dim ? 0.12 : hot ? 1 : 0.75)
    g.selectAll<SVGPathElement, string>('path.strand')
      .attr('stroke', hot ? HudPaint.arrowHot : d.missing ? HudPaint.dim : HudPaint.arrow)
      .attr('marker-end', hot ? 'url(#arrow-end-hot)' : 'url(#arrow-end)')
      .attr('stroke-width', hot ? 1.7 : 1.35)
  })

  nodeSel.attr('opacity', (d) => (isDimmed(d.id) ? 0.28 : 1))
  nodeSel
    .selectAll<SVGRectElement, HudNode>('rect.chip-active')
    .attr('opacity', (d) => (d.id === activeId ? 1 : 0))
}
