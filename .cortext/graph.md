# Graph

## Aesthetic

Light **kube** field with flow-diagram wiring (not a dark HUD):

```
FOCUS column → linked notes by BFS hop · one pill per note · rounded red wires
```

- Cool gray wash + faint grid, corner red ticks
- **One note = one node** (no mid-edge “TAP / OPEN” action chips)
- Light wireframe **pills**, dark labels, red port dots
- **Rounded Manhattan** red strands (`roundedOrthoPath`); missing links dashed
- Staging from focus note via BFS (`buildHudStage`)

Stay on the light shell. Do not reintroduce black / neon-on-black graph chrome.

## Modules

| Layer | Responsibility |
| --- | --- |
| `graph.ts` | Canonical `GraphIndex` from docs → `index.yaml` |
| `graphView.ts` | Filter/scope + BFS stage + path helpers |
| `graphHudDraw.ts` | SVG defs, backdrop, pills, wires, focus paint |
| `GraphView.vue` | D3 zoom/drag wiring + toolbar chrome |

Keep each file ≤500 lines; split semantically (layout vs draw vs shell).

## Edge extraction

For each note body, extract `[[wikilinks]]`, resolve against known ids, emit unique `from → to` edges. Unresolved targets stay in `nodes` (missing stroke; dashed strands).

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
