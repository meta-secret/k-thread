# Graph

## Aesthetic

The graph is a **cyberpunk HUD** inspired by neon UX-flow diagrams (black field, glowing red orthogonal wires, wireframe pills):

```
FOCUS column → linked notes by BFS hop · one pill per note · rounded neon wires
```

- Near-black field, vignette, faint grid, corner red ticks
- **One note = one node** (no mid-edge “TAP / OPEN” action chips)
- Dark wireframe **pills** with white labels + glowing red port dots
- **Rounded Manhattan** neon-red strands (`roundedOrthoPath`); missing links dashed
- Staging from focus note via BFS (`buildHudStage`)

Note mode uses a separate **kube** shell. Do not merge the two palettes.

## Modules

| Layer | Responsibility |
| --- | --- |
| `graph.ts` | Canonical `GraphIndex` from docs → `index.yaml` |
| `graphView.ts` | Filter/scope + BFS stage + path helpers |
| `graphHudDraw.ts` | SVG defs, backdrop, pills, wires, focus paint |
| `GraphView.vue` | D3 zoom/drag wiring + HUD chrome toolbar |

Keep each file ≤500 lines; split semantically (layout vs draw vs shell).

## Edge extraction

For each note body, extract `[[wikilinks]]`, resolve against known ids, emit unique `from → to` edges. Unresolved targets stay in `nodes` (hollow/missing stroke; dashed strands).

## View modes

```ts
GraphScope.Global  // full vault (after orphan/query filters)
GraphScope.Local   // N-hop undirected closure around activeId
```

## Interaction

- Click → `focusNote` (stay on graph)
- Double-click → `open` note view
- Hover → brighten neighborhood wires; dim the rest
- Drag pills · pan/zoom · filter · orphans · reset

## Why D3

Zoom/drag + SVG filters for neon glow without a second graph framework.
