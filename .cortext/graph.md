# Graph

## Aesthetic

**GTD-style flowchart** on a white field:

```
Focus (top) → Hop 1 row → Hop 2 row · pastel pills · charcoal arrows down
```

- Flat white canvas, generous vertical rhythm
- Soft **pastel pills** (peach focus; mint / lavender / sky / pink by folder)
- Thin **charcoal orthogonal** arrows with triangular heads, parent → child
- One note = one node; missing targets = dashed gray links
- Layout: BFS hop = **row** (top-down), siblings fan horizontally

Stay light. Avoid neon glow, black fields, left→right “spine” wires through a column.

## Modules

| Layer | Responsibility |
| --- | --- |
| `graph.ts` | Canonical `GraphIndex` from docs → `index.yaml` |
| `graphView.ts` | Filter/scope + BFS stage + path helpers |
| `graphHudDraw.ts` | SVG defs, backdrop, pills, wires, focus paint |
| `GraphView.vue` | D3 zoom/drag wiring + toolbar chrome |

Keep each file ≤500 lines.

## Interaction

- Click → `focusNote` (stay on graph)
- Double-click → `open` note view
- Hover → brighten neighborhood arrows; dim the rest
- Drag pills · pan/zoom · filter · orphans · reset
