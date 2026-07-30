# k-thread

Local-first Obsidian-style notes in the browser.

- **Vue 3 + TypeScript + Bun + Vite**
- **No server** — static app for GitHub Pages
- **OPFS** storage for the vault after import
- **Open a local Obsidian folder** via the File System Access API
- **`[[wikilinks]]`** with click-through / create-missing notes
- **Graph view** driven by a generated `index.yaml`

## Develop

```bash
bun install
bun dev
```

## Build

```bash
bun run build
```

## Usage

1. Open the app (Chrome/Edge recommended for OPFS + directory picker).
2. Click **Create a note** (or press �

1. Open the app (Chrome/Edge recommended for OPFS + directory picker).
2. Click **Create a note** (or press ⌘N / Ctrl+N) — like Notion/Obsidian.
3. Or **Named…** (⇧⌘N) to create `Projects/Ideas`-style paths.
4. Optionally **Import vault** to load an existing Obsidian folder into OPFS.
5. Edit in CodeMirror; preview resolves `[[wikilinks]]`.
6. Open **Graph** for the dependency view (`index.yaml` in OPFS).

UI is built with [shadcn-vue](https://www.shadcn-vue.com/).

## `index.yaml`

```yaml
version: 1
nodes:
  - Welcome
  - Projects/Alpha
edges:
  - from: Welcome
    to: Projects/Alpha
```

## Deploy

Pushes to `main` deploy to GitHub Pages at `/k-thread/`.
Enable **Settings → Pages → GitHub Actions** once on the repo.
