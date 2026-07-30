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
import type { ThemeMode } from '@/lib/structureDraw'

export const HudThemePaints = {
  dark: {
    bg: '#09090b',
    cardBg: '#121217',
    ink: '#f4f4f5',
    mute: '#a1a1aa',
    dim: '#52525b',
    arrow: '#3f3f46',
    arrowHot: '#f97316',
    activeRing: '#f97316',
    gridDot: '#27272a',
  },
  light: {
    bg: '#efeff1',
    cardBg: '#ffffff',
    ink: '#121214',
    mute: '#6b6b73',
    dim: '#b4b4bc',
    arrow: 'rgba(18, 18, 20, 0.22)',
    arrowHot: '#f97316',
    activeRing: '#f97316',
    gridDot: 'rgba(18, 18, 20, 0.08)',
  },
} as const

const PASTELS_DARK = [
  '#f97316', // Orange focus
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Mint
  '#a855f7', // Purple
  '#06b6d4', // Cyan
] as const

const PASTELS_LIGHT = [
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
  const { h } = sizeOf(d)
  return { x: d.x, y: d.y + (side === 'out' ? h / 2 : -h / 2) }
}

export const clipLabel = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

const colorForNode = (d: HudNode, mode: ThemeMode): { bg: string; text: string; border: string } => {
  if (mode === 'dark') {
    if (d.kind === 'missing') return { bg: '#18181b', text: '#71717a', border: '#27272a' }
    if (d.tier === HudTier.Root) return { bg: 'rgba(249,115,22,0.2)', text: '#fb923c', border: '#f97316' }
    const hue = folderHue(folderOf(d.id))
    const color = PASTELS_DARK[(Math.floor(hue / 60) + d.layer) % PASTELS_DARK.length] ?? PASTELS_DARK[1]
    return { bg: `${color}18`, text: color, border: `${color}50` }
  }
  // Light mode
  if (d.kind === 'missing') return { bg: '#e8e8ec', text: '#6b6b73', border: 'rgba(18,18,20,0.14)' }
  if (d.tier === HudTier.Root) return { bg: '#FFE8C8', text: '#121214', border: '#f97316' }
  const hue = folderHue(folderOf(d.id))
  const color = PASTELS_LIGHT[(Math.floor(hue / 60) + d.layer) % PASTELS_LIGHT.length] ?? PASTELS_LIGHT[1]
  return { bg: color, text: '#121214', border: 'rgba(18,18,20,0.14)' }
}

export const attachHudDefs = (svg: Selection<SVGSVGElement, unknown, null, undefined>) => {
  const defs = svg.append('defs')

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
  marker('arrow-end', '#71717a')
  marker('arrow-end-hot', '#f97316')

  return defs
}

export const drawHudBackdrop = (
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
  mode: ThemeMode = 'light',
) => {
  const paint = HudThemePaints[mode]
  const defs = svg.select('defs')
  const patternId = `hud-dot-grid-${mode}`
  defs.select(`#${patternId}`).remove()

  const pattern = defs
    .append('pattern')
    .attr('id', patternId)
    .attr('width', 28)
    .attr('height', 28)
    .attr('patternUnits', 'userSpaceOnUse')
  pattern.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 1.1).attr('fill', paint.gridDot)

  svg.append('rect').attr('width', width).attr('height', height).attr('fill', paint.bg)
  svg.append('rect').attr('width', width).attr('height', height).attr('fill', `url(#${patternId})`)
  return svg.append('g').attr('class', 'chrome')
}

export const drawLayerLabels = (
  chrome: Selection<SVGGElement, unknown, null, undefined>,
  nodes: readonly HudNode[],
  mode: ThemeMode = 'light',
) => {
  const paint = HudThemePaints[mode]
  const layers = [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b)
  for (const layer of layers) {
    const sample = nodes.find((n) => n.layer === layer)
    if (!sample) continue
    chrome
      .append('text')
      .attr('x', 28)
      .attr('y', sample.y + 4)
      .attr('text-anchor', 'start')
      .attr('fill', paint.mute)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('font-family', '"IBM Plex Mono", monospace')
      .text(layer === 0 ? 'FOCUS NODE' : `HOP ${layer}`)
  }
}

export const drawPill = (
  g: Selection<SVGGElement, HudNode, null, undefined>,
  d: HudNode,
  mode: ThemeMode = 'light',
) => {
  const paint = HudThemePaints[mode]
  const { w, h } = sizeOf(d)
  const x0 = -w / 2
  const y0 = -h / 2
  const r = h / 2
  const title = clipLabel(labelOf(d.id), 18)
  const palette = colorForNode(d, mode)

  g.append('rect')
    .attr('class', 'chip-active')
    .attr('x', x0 - 3)
    .attr('y', y0 - 3)
    .attr('width', w + 6)
    .attr('height', h + 6)
    .attr('rx', r + 3)
    .attr('fill', 'none')
    .attr('stroke', paint.activeRing)
    .attr('stroke-width', 2)
    .attr('opacity', 0)

  g.append('rect')
    .attr('class', 'chip-body')
    .attr('x', x0)
    .attr('y', y0)
    .attr('width', w)
    .attr('height', h)
    .attr('rx', r)
    .attr('fill', palette.bg)
    .attr('stroke', palette.border)
    .attr('stroke-width', 1.2)

  g.append('text')
    .attr('x', 0)
    .attr('y', 5)
    .attr('text-anchor', 'middle')
    .attr('fill', palette.text)
    .attr('font-size', 13)
    .attr('font-weight', 600)
    .attr('font-family', '"IBM Plex Sans", "Segoe UI", sans-serif')
    .text(title)
}

export const updateWires = (
  wires: WireSel,
  nodes: Map<DocId, HudNode>,
  mode: ThemeMode = 'light',
) => {
  const paint = HudThemePaints[mode]
  wires.each(function (d) {
    const s = nodes.get(d.from)
    const t = nodes.get(d.to)
    if (!s || !t) return
    const from = portOf(s, 'out')
    const to = portOf(t, 'in')
    const target = { x: to.x, y: to.y - 4 }
    const path = orthoPath(from, target)
    const g = select(this)

    g.selectAll<SVGPathElement, string>('path.strand')
      .data([path])
      .join('path')
      .attr('class', 'strand')
      .attr('fill', 'none')
      .attr('stroke', paint.arrow)
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
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
  mode?: ThemeMode
}

export const paintFocus = (wireSel: WireSel, nodeSel: NodeSel, opts: FocusOpts) => {
  const { activeId, hoveredId, isDimmed, isWireHot, mode = 'light' } = opts
  const paint = HudThemePaints[mode]
  const focusing = hoveredId.length > 0 || activeId.length > 0

  wireSel.each(function (d) {
    const hot = isWireHot(d)
    const dim = focusing && !hot
    const g = select(this)
    g.attr('opacity', dim ? 0.14 : hot ? 1 : 0.85)
    g.selectAll<SVGPathElement, string>('path.strand')
      .attr('stroke', hot ? paint.arrowHot : d.missing ? paint.dim : paint.arrow)
      .attr('marker-end', hot ? 'url(#arrow-end-hot)' : 'url(#arrow-end)')
      .attr('stroke-width', hot ? 2 : 1.5)
  })

  nodeSel.attr('opacity', (d) => (isDimmed(d.id) ? 0.25 : 1))
  nodeSel
    .selectAll<SVGRectElement, HudNode>('rect.chip-active')
    .attr('opacity', (d) => (d.id === activeId ? 1 : 0))
}
