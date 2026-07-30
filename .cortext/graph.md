# Graph

Two separate canvases — never mixed in one view.

## Structure (main / home)

Project hierarchy as a light **workflow**:

```
Vault → folders → notes · widget cards · charcoal arrows down
```

- Default when the vault is ready and no note is open
- Edges = parent folder paths only (not wikilinks)
- Click note → Note mode; click folder → zoom subtree
- Modules: `structureGraph.ts`, `structureDraw.ts`, `StructureView.vue`

## Links (separate mode)

Wikilink graph (former “Graph” view):

```
Focus → Hop n · pastel pills · Global / Local scope
```

- Edges = `[[wikilinks]]` from `index.yaml`
- Modules: `graphView.ts`, `graphHudDraw.ts`, `GraphView.vue`

## View modes

```ts
ViewMode.Structure  // hierarchy home
ViewMode.Note       // editor
ViewMode.Links      // wikilink graph
```

Files tree drawer (⌘B) remains a secondary peek.

## Interaction (both canvases)

- Click → focus / open as defined above
- Drag · pan/zoom · filter · reset
