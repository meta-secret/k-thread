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

**Links** graph inventory (wikilinks + folders list), versioned — not the Structure tree:

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
- Nodes include unresolved link targets (for Links “missing” chips).
- Serialized with the `yaml` package; parse failures are `AppError` `parse`.
- **Structure** does not read edges from this file; it builds parent-path edges from `docs` + `folders` in memory.

## Import

“Open local vault” uses the **File System Access API** (`showDirectoryPicker`), walks `.md` files, skips `.obsidian` / `.git` / `.trash` / `node_modules` / dot-dirs, then copies into OPFS.

## Session (`session.ts`)

| Key | Purpose |
| --- | --- |
| `k-thread:lastActiveId` | Last opened note (for highlight / Note mode) |
| `k-thread:lastView` | Last view mode; legacy `'graph'` → `Links` |

## Lifecycle

| Event | Behavior |
| --- | --- |
| First visit | Landing until user creates a note or imports |
| Create note | Write `.md`, open Note mode for writing |
| Edit | Persist body + refresh wikilink index |
| Rename | Rewrite file path + rewrite `[[wikilinks]]` across vault |
| Delete | Confirm → remove path → clear active if needed → Structure if no note |
| Reload | `hydrateFromOpfs()` restores docs + folders → **Structure** home (remembered note not auto-opened) |
| Import | Copy vault into OPFS → Structure home |
