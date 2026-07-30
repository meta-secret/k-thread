# Editor

## Role

The editor is the primary writing surface. Disk format is **markdown**; the editing surface is **BlockNote** (block tree). A dialect bridge keeps Obsidian-flavored constructs round-trippable.

## Vue ↔ React island

```
BlockNoteEditor.vue  →  mount BlockNoteApp (React)
                     ←  onChange markdown / navigate events
```

- `src/editor/BlockNoteApp.ts` owns create/destroy of the React root.
- Vue passes `modelValue`, `docKey`, `noteIds`, `tags`.
- Navigation (wikilink click) emits upward to `vaultStore.openOrCreate`.

## Obsidian dialect

| Construct | Handling |
| --- | --- |
| `[[Note]]` / `[[Note\|alias]]` | Inline nodes + suggestions |
| `![[Embed]]` | Embed-style inline/block as supported by schema |
| `#tag` | Inline + `#` suggestion menu |
| `==highlight==` | Inline mark |
| `> [!note]` callouts | Custom blocks |
| YAML frontmatter | Dedicated block; preserved on serialize |
| `%%comments%%` | Comment blocks |
| ` ```dataview ` / templater / meta-bind fences | Preserved as plugin fences (**not executed**) |

Helpers:

- `src/lib/obsidian.ts` — `prepareObsidianMarkdown` / `finalizeObsidianMarkdown`
- `src/editor/obsidianSchema.ts` — schema composition
- `src/editor/obsidianInline.ts` / `obsidianBlocks.ts` — marks & blocks

## Slash & suggestions

- `[[` — note picker from vault ids
- `#` — known tags
- `/` — Callout, Frontmatter, Comment, Dataview, …

## Preview

`MarkdownPreview.vue` is optional HTML via `marked`, with known-id awareness for clickable wikilinks. It is not the source of truth — only a read path.
