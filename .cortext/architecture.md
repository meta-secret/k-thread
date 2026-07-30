# Architecture

## Shape

k-thread is a **single-page application** with three concerns:

1. **Shell** — Vue 3 UI (rail, dialogs, Structure / Note / Links switching).
2. **Domain** — vault, wikilinks, graph index, tree, structure model (pure TypeScript under `src/lib`).
3. **Islands** — BlockNote (React) for editing; D3 for Structure + Links canvases.

There is no remote API layer. Persistence is OPFS; deployment is static files.

## Module map

```
src/
  types.ts              # Option, Result, ViewMode, VaultStatus, Doc, GraphIndex, AppError
  main.ts / App.vue     # bootstrap + shell (Structure home, brand return)
  lib/
    opfs.ts             # low-level OPFS read/write/list/remove
    vault.ts            # vault load/import/persist orchestration
    vaultStore.ts       # reactive store (Vue reactive + computed)
    session.ts          # lastActiveId + lastView (localStorage)
    wikilink.ts         # parse/resolve [[links]], id/path helpers
    graph.ts            # build/serialize/parse index.yaml (wikilinks)
    graphView.ts        # Links view graph + layout helpers
    graphHudDraw.ts     # Links pastel pill drawing
    structureGraph.ts   # hierarchy graph + tidy-tree placement
    structureDraw.ts    # Structure workflow widget drawing
    tree.ts             # Files drawer folder tree
    obsidian.ts         # markdown ↔ BlockNote dialect bridge
    markdown.ts         # preview helpers
  editor/
    BlockNoteApp.ts     # React mount/unmount
    obsidianSchema.ts   # custom BlockNote schema
    obsidianInline.ts   # wikilinks, tags, highlights
    obsidianBlocks.ts   # callouts, frontmatter, comments, fences
  components/
    shell/
      ToolRail.vue      # View (Note/Links/Files/Preview) + Create + Manage
      EditorStage.vue   # center stage (BlockNote / empty)
      Inspector.vue     # right panel (tags / links / preview)
    NoteSidebar.vue     # tree (Files drawer peek)
    StructureView.vue   # hierarchy workflow (main / home)
    BlockNoteEditor.vue # Vue wrapper around React island
    GraphView.vue       # Links mode (wikilink flowchart)
    *Dialog.vue         # create / rename / delete
    MarkdownPreview.vue # optional HTML preview + link navigate
```

## Data flow

```mermaid
flowchart LR
  UI[Vue shell] --> Store[vaultStore]
  Store --> OPFS[(OPFS vault/)]
  Store --> Index[index.yaml]
  Store --> Editor[BlockNote island]
  Store --> Structure[StructureView]
  Store --> Links[GraphView Links]
  Import[File System Access] --> Vault[vault.ts] --> OPFS
  Editor -->|markdown body| Store
  Store -->|wikilinks| Index
```

1. On boot, `hydrateFromOpfs()` loads markdown + folders into `vaultStore`.
2. Ready vault → `ViewMode.Structure` (home). Last note id may be restored for highlight / Note mode only.
3. Edits update `Doc.body` and persist via `saveDoc` → OPFS.
4. `buildIndex(docs, folders)` recomputes **wikilink** edges for Links; Structure uses folders/docs hierarchy only.
5. Index is written to `index.yaml` alongside notes.
6. Structure, Links, and Files tree derive from store data — no second source of truth.

## State ownership

| Concern | Owner |
| --- | --- |
| Docs, folders, active note, view mode | `vaultStore.state` |
| Session (last note / last view) | `session.ts` → localStorage |
| Wikilink index | `computed` from docs (`buildIndex`) |
| Structure graph | `structureGraph.ts` inside `StructureView` |
| Sidebar tree | `computed` (`buildNoteTree`) |
| Editor document | React island; synced through Vue props/events |
| Links layout | local to `GraphView.vue` (D3); selection emits upward |

## Boundaries

- **OPFS vs import**: OPFS is the working vault. “Import vault” copies a user-picked directory into OPFS (skipping `.obsidian`, `.git`, etc.).
- **Structure vs Links**: folder parent edges vs wikilink edges — separate modules and canvases.
- **Vue vs React**: only the editor is React. The rest of the app stays Vue.
- **Markdown as interchange**: BlockNote is the editing surface; disk format remains Obsidian-friendly markdown.

## Error model

I/O and parse paths return `Result<T, AppError>` with tagged `kind`s (`unsupported` | `io` | `parse`). UI reads `tag` and surfaces `message` on the store — never silent `null` returns.
