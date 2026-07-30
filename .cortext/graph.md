# Graph

## Aesthetic

The graph is a **cyberpunk HUD**, not a plain force-dot plot and not an n8n card board:

- Near-black field, vignette, sparse red `+` ticks
- **Chip/slab nodes** (rounded rect + notch + ports)
- **Bundled glowing wires** — each edge is several parallel cubic beziers with SVG blur
- Neon **red** for active/status; white/gray for fiber strands
- Monospaced readouts: `NOD`, `EDG`, `GLOBAL` / `LOCAL·depth`

Note mode uses a separate **kube** shell (gray/black/white). Do not merge the two palettes.

## Index vs view

| Layer | Responsibility |
| --- | --- |
| `graph.ts` | Canonical `GraphIndex` from docs → `index.yaml` |
| `graphView.ts` | Filter/scope + `bundlePaths` / `noteLinks` helpers |
| `GraphView.vue` | D3 force simulation, HUD SVG, interaction |

## Edge extraction

For each note body, extract `[[wikilinks]]`, resolve against known ids, emit unique `from → to` edges. Unresolved targets stay in `nodes` (hollow chips; dashed strands).

## View modes

```ts
GraphScope.Global  // full vault (after orphan/query filters)
GraphScope.Local   // N-hop undirected closure around activeId
```

## Interaction

- Click → `focusNote` (stay on graph)
- Double-click → `open` note view
- Hover → brighten neighborhood wires; dim the rest
- Drag chips · pan/zoom · filter · orphans · reset

## Why D3

Force layout + zoom/drag + SVG filters for glow/bundles without a second graph framework.
