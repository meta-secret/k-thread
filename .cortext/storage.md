# Storage & vault

## OPFS

Notes persist under the browser **Origin Private File System**:

```
navigator.storage.getDirectory()
  └─ vault/                 # app root handle
       ├─ index.yaml
       ├─ Welcome.md
       └─ Projects/
            └─ Alpha.md
```

- Implemented in `src/lib/opfs.ts` (read/write/list/remove/ensureDir).
- Paths use `/` separators; folders are real directory handles.
- Capability failures return `err({ kind: 'unsupported', … })`.

## Document model

```ts
type Doc = {
  id: DocId      // e.g. "Projects/Alpha" (no .md)
  path: string   // e.g. "Projects/Alpha.md"
  title: string
  body: string   // full markdown text
}
```

`id` ↔ `path` helpers live in `wikilink.ts` (`idFromPath`, `pathFromId`, `titleFromPath`).

## index.yaml

Graph + folder inventory, versioned:

```yaml
version: 1
folders:
  - Projects
nodes:
  - Welcome
  - Projects/Alpha
edges:
  - from: Welcome
    to: Projects/Alpha
```

- Built by `buildIndex(docs, folders)` from wikilink extraction.
- Nodes include unresolved link targets (for graph “missing” nodes).
- Serialized with the `yaml` package; parse failures are `AppError` `parse`.

## Import

“Open local vault” uses the **File System Access API** (`showDirectoryPicker`), walks `.md` files, skips `.obsidian` / `.git` / `.trash` / `node_modules` / dot-dirs, then copies into OPFS.

## Lifecycle

| Event | Behavior |
| --- | --- |
| First visit | Empty / idle until user creates a note or imports |
| Create / edit | Write `.md` + refresh index |
| Rename | Rewrite file path + rewrite `[[wikilinks]]` across vault |
| Delete | Confirm → remove path → update active selection |
| Reload | `hydrateFromOpfs()` restores docs + folders |
