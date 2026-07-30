# k-thread

Local-first Obsidian-style notes in the browser.

- **Vue 3 + TypeScript + Bun + Vite**
- **shadcn-vue** UI
- **No server** — static app for GitHub Pages
- **Create notes in-app** (Notion/Obsidian-style) or import a vault
- **OPFS** storage
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
2. Click **Create a note** (or press ⌘N / Ctrl+N).
3. Or **Named…** (⇧⌘N) for paths like `Projects/Ideas`.
4. Optionally **Import vault** to load an existing Obsidian folder into OPFS.
5. Edit in CodeMirror; preview resolves `[[wikilinks]]`.
6. Open **Graph** for the dependency view (`index.yaml` in OPFS).

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
