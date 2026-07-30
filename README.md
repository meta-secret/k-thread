# k-thread

Local-first Obsidian-style notes in the browser.

- **Vue 3 + TypeScript + Bun + Vite**
- **shadcn-vue** UI shell
- **[BlockNote](https://www.blocknotejs.org/)** editor with Obsidian dialect support
- **`[[wikilinks]]` / `![[embeds]]`**, `#tags`, `==highlights==`
- **Callouts** (`> [!note]`), **YAML frontmatter**, **`%%comments%%`**
- **Dataview / plugin fences** preserved (not executed)
- Type `[[` for notes, `#` for tags, `/` for Callout / Frontmatter / Dataview…
- **Hierarchical folders** in **OPFS**
- Graph via `index.yaml`

## Develop

```bash
bun install
bun dev
```

## Usage

1. **Create a note** (⌘N) or **Named…** / **Folder…**
2. Right-click a folder for “New note here”
3. Notes live in OPFS as nested markdown files; folders are real OPFS directories
4. BlockNote edits blocks; content is saved back to markdown for Obsidian interop
5. Optional **Preview** for wikilink click-through
6. **Import vault** to load an existing Obsidian folder

## `index.yaml`

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

## Deploy

Pushes to `main` → https://meta-secret.github.io/k-thread/
