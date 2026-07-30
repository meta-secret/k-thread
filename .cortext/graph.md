# Graph

## Aesthetic

**GTD-style flowchart** on a light field (not a HUD / not dark):

```
Focus column → linked notes by BFS hop · one pastel pill per note · charcoal arrows
```

- Flat white canvas, generous space
- Soft **pastel pills** (peach / gray / pink / mint / lavender / sky) by folder + hop
- Thin **charcoal orthogonal** arrows with triangular heads
- One note = one node; missing targets = dashed gray links
- Staging from focus note via BFS (`buildHudStage`)

Stay light. Avoid neon glow, black fields, and cyberpunk chrome.

## Modules

| Layer | Responsibility |
| --- | --- |
| `graph.ts` | Canonical `GraphIndex` from docs → `index.yaml` |
| `graphView.ts` | Filter/scope + BFS stage + path helpers |
| `graphHudDraw.ts` | SVG defs, backdrop, pills, wires, focus paint |
| `GraphView.vue` | D3 zoom/drag wiring + toolbar chrome |

Keep each file ≤500 lines; split semantically (layout vs draw vs shell).

## Edge extraction

For each note body, extract `[[wikilinks]]`, resolve against known ids, emit unique `from → to` edges. Unresolved targets stay in `nodes` (muted pill; dashed strands).

## View modes

```ts
GraphScope.Global  // full vault (after orphan/query filters)
GraphScope.Local   // N-hop undirected closure around activeId
```

## Interaction

- Click → `focusNote` (stay on graph)
- Double-click → `open` note view
- Hover → brighten neighborhood arrows; dim the rest
- Drag pills · pan/zoom · filter · orphans · reset
