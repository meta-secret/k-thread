import { select, type Selection } from 'd3-selection'
import {
  HudTier,
  labelOf,
  NODE_H,
  NODE_W,
  roundedOrthoPath,
  type HudNode,
  type HudWire,
  type Point,
} from '@/lib/graphView'
import type { DocId } from '@/types'

/** Neon HUD palette — matches cyberpunk flow-diagram reference. */
export const HudPaint = {
  bg: '#050506',
  panel: '#0c0c0e',
  wireframe: 'rgba(255,255,255,0.16)',
  ink: '#f2f2f4',
  mute: '#7a7a84',
  dim: '#3a3a42',
  red: '#ff2a3a',
  redDeep: '#c01828',
  glowSoft: 0.45,
} as const

export type WireSel = Selection<SVGGElement, HudWire, SVGGElement, unknown>
export type NodeSel = Selection<SVGGElement, HudNode, SVGGElement, unknown>

export const sizeOf = (_d: HudNode): { w: number; h: number } => ({ w: NODE_W, h: NODE_H })

export const portOf = (d: HudNode, side: 'in' | 'out'): Point => {
  const { w } = sizeOf(d)
  return { x: d.x + (side === 'out' ? w / 2 : -w / 2), y: d.y }
}

export const clipLabel = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

export const attachHudDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')

  const glow = defs
    .append('filter')
    .attr('id', 'wire-glow')
    .attr('x', '-80%')
    .attr('y', '-80%')
    .attr('width', '260%')
    .attr('height', '260%')
  glow.append('feGaussianBlur').attr('stdDeviation', '3.2').attr('result', 'blur')
  const merge = glow.append('feMerge')
  merge.append('feMergeNode').attr('in', 'blur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')

  const nodeGlow = defs
    .append('filter')
    .attr('id', 'node-glow')
    .attr('x', '-40%')
    .attr('y', '-40%')
    .attr('width', '180%')
    .attr('height', '180%')
  nodeGlow.append('feGaussianBlur').attr('stdDeviation', '2.2').attr('result', 'blur')
  const nMerge = nodeGlow.append('feMerge')
  nMerge.append('feMergeNode').attr('in', 'blur')
  nMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  const vignette = defs
    .append('radialGradient')
    .attr('id', 'hud-vignette')
    .attr('cx', '50%')
    .attr('cy', '48%')
    .attr('r', '72%')
  vignette.append('stop').attr('offset', '0%').attr('stop-color', '#121218').attr('stop-opacity', 0.35)
  vignette.append('stop').attr('offset', '100%').attr('stop-color', '#000000').attr('stop-opacity', 0.92)

  return defs
}

export const drawHudBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
) => {
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', HudPaint.bg)
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'url(#hud-vignette)')

  const grid = svg.append('g').attr('class', 'grid').attr('opacity', 0.14)
  for (let x = 48; x < width; x += 48) {
    grid
      .append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
  }
  for (let y = 48; y < height; y += 48) {
    grid
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
  }

  const chrome = svg.append('g').attr('class', 'chrome')
  const mark = (x: number, y: number) => {
    chrome
      .append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 3)
      .attr('fill', 'none')
      .attr('stroke', HudPaint.red)
      .attr('stroke-width', 1.2)
      .attr('filter', 'url(#wire-glow)')
  }
  mark(18, 18)
  mark(width - 18, 18)
  mark(18, height - 18)
  mark(width - 18, height - 18)

  return chrome
}

export const drawLayerLabels = (
  chrome: Selection<SVGGElement, unknown, null, undefined>,
  nodes: readonly HudNode[],
) => {
  const layers = [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b)
  for (const layer of layers) {
    const sample = nodes.find((n) => n.layer === layer)
    if (!sample) continue
    const label = chrome.append('g').attr('transform', `translate(${sample.x}, 30)`)
    label
      .append('circle')
      .attr('cx', -28)
      .attr('cy', -3)
      .attr('r', 2.4)
      .attr('fill', HudPaint.red)
      .attr('filter', 'url(#wire-glow)')
    label
      .append('line')
      .attr('x1', -22)
      .attr('x2', -14)
      .attr('y1', -3)
      .attr('y2', -3)
      .attr('stroke', HudPaint.red)
      .attr('stroke-width', 1.5)
    label
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('fill', HudPaint.ink)
      .attr('font-size', 10)
      .attr('letter-spacing', '0.22em')
      .attr('font-family', 'ui-monospace, Menlo, monospace')
      .text(layer === 0 ? 'FOCUS' : `L${layer}`)
  }
}

/** One note = one wireframe pill (no separate action chips on edges). */
export const drawPill = (g: Selection<SVGGElement, HudNode, null, undefined>, d: HudNode) => {
  const { w, h } = sizeOf(d)
  const x0 = -w / 2
  const y0 = -h / 2
  const r = h / 2
  const isRoot = d.tier === HudTier.Root
  const title = clipLabel(labelOf(d.id), 14).toUpperCase()

  g.append('rect')
    .attr('class', 'chip-active')
    .attr('x', x0 - 6)
    .attr('y', y0 - 6)
    .attr('width', w + 12)
    .attr('height', h + 12)
    .attr('rx', r + 6)
    .attr('fill', 'none')
    .attr('stroke', HudPaint.red)
    .attr('stroke-width', 1.4)
    .attr('filter', 'url(#node-glow)')
    .attr('opacity', 0)

  g.append('rect')
    .attr('class', 'chip-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', w)
    .attr('height', h)
    .attr('rx', r)
    .attr('fill', d.kind === 'missing' ? '#101014' : isRoot ? '#141418' : HudPaint.panel)
    .attr('stroke', isRoot ? 'rgba(255,255,255,0.35)' : HudPaint.wireframe)
    .attr('stroke-width', isRoot ? 1.35 : 1.1)

  const port = (cx: number, cls: string) => {
    g.append('circle')
      .attr('class', cls)
      .attr('cx', cx)
      .attr('cy', 0)
      .attr('r', 3.4)
      .attr('fill', HudPaint.red)
      .attr('stroke', '#1a0508')
      .attr('stroke-width', 1)
      .attr('filter', 'url(#wire-glow)')
  }
  port(x0, 'port-in')
  port(x0 + w, 'port-out')

  g.append('text')
    .attr('x', 0)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .attr('fill', HudPaint.mute)
    .attr('font-size', 7)
    .attr('letter-spacing', '0.14em')
    .attr('font-family', 'ui-monospace, Menlo, monospace')
    .text(`${d.code} · L${d.layer}`)
  g.append('text')
    .attr('x', 0)
    .attr('y', 9)
    .attr('text-anchor', 'middle')
    .attr('fill', HudPaint.ink)
    .attr('font-size', 11)
    .attr('font-weight', 650)
    .attr('letter-spacing', '0.06em')
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
    const path = roundedOrthoPath(from, to, 18)
    const g = select(this)

    g.selectAll<SVGPathElement, string>('path.glow')
      .data([path])
      .join('path')
      .attr('class', 'glow')
      .attr('fill', 'none')
      .attr('stroke', HudPaint.red)
      .attr('stroke-width', 5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('filter', 'url(#wire-glow)')
      .attr('d', (p) => p)

    g.selectAll<SVGPathElement, string>('path.strand')
      .data([path])
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke', HudPaint.red)
      .attr('stroke-width', 1.6)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-dasharray', d.missing || !d.real ? '4 5' : null)
      .attr('d', (p) => p)

    g.selectAll<SVGCircleElement, Point>('circle.port')
      .data([from, to])
      .join('circle')
      .attr('class', 'port')
      .attr('r', 3.6)
      .attr('cx', (p) => p.x)
      .attr('cy', (p) => p.y)
      .attr('fill', HudPaint.red)
      .attr('filter', 'url(#wire-glow)')
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
    g.attr('opacity', dim ? 0.08 : hot ? 1 : 0.42)
    g.selectAll<SVGPathElement, string>('path.strand').attr(
      'stroke',
      hot ? HudPaint.red : d.missing ? HudPaint.dim : HudPaint.redDeep,
    )
    g.selectAll<SVGPathElement, string>('path.glow').attr(
      'stroke-opacity',
      hot ? HudPaint.glowSoft : 0.12,
    )
    g.selectAll<SVGCircleElement, Point>('circle.port').attr('opacity', hot ? 1 : 0.55)
  })

  nodeSel.attr('opacity', (d) => (isDimmed(d.id) ? 0.18 : 1))
  nodeSel.selectAll<SVGRectElement, HudNode>('.chip-body').attr('stroke', (d) => {
    if (d.id === activeId) return HudPaint.red
    if (d.id === hoveredId) return 'rgba(255,255,255,0.55)'
    if (d.kind === 'missing') return HudPaint.dim
    if (d.tier === HudTier.Root) return 'rgba(255,255,255,0.35)'
    return HudPaint.wireframe
  })
  nodeSel
    .selectAll<SVGRectElement, HudNode>('rect.chip-active')
    .attr('opacity', (d) => (d.id === activeId ? 1 : 0))
}
