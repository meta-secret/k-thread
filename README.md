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
2. Click **Open vault** and choose your Obsidian vault directory.
3. Markdown notes are imported into Origin Private File System (OPFS).
4. Edit in the CodeMirror markdown editor; preview resolves wikilinks.
5. Open **Graph** for the dependency view. The index is stored as `index.yaml` in OPFS.

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
