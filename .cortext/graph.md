# Graph

## Aesthetic

The graph is a **cyberpunk HUD** with a **staged left→right flow** (not a soup of equal force nodes):

```
left rail records (≤3) → hub chips (≤3) → bridge chips (≤2) → FORK bundles → sub-component field
```

- Near-black field, vignette, sparse red `+` ticks, CHR-style rail readouts
- **Chip/slab nodes** with pins; smaller chips for subs
- **Bundled glowing wires**; forks use denser strand counts
- Neon **red** status; white/gray fiber strands
- Staging from degree + active note (`buildHudStage`)

Note mode uses a separate **kube** shell. Do not merge the two palettes.

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
