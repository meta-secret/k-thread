# k-thread

Local-first Obsidian-style notes in the browser.

Live: https://meta-secret.github.io/k-thread/

## What it is

- **Vue 3 + TypeScript + Bun + Vite** SPA on GitHub Pages
- Notes as real markdown files in **OPFS** (nested folders, not a flat fake store)
- **[BlockNote](https://www.blocknotejs.org/)** editor with Obsidian dialect: `[[wikilinks]]`, `![[embeds]]`, `#tags`, `==highlights==`, callouts, YAML frontmatter, `%%comments%%`
- Dataview / plugin fences preserved (not executed)
- **Two separate graphs** (never mixed on one canvas):
  - **Structure** — project hierarchy (folders + notes); the **main page / home**
  - **Links** — wikilink dependency graph from `index.yaml`
- Light **kube** shell only — no dark / neon HUD

## Two graphs

```
Structure (home)          Links (separate mode)
─────────────────         ─────────────────────
Vault → folders → notes   Focus → Hop n
parent-path edges only    [[wikilink]] edges only
workflow step widgets     pastel pills + arrows
```

| Surface | Role |
| --- | --- |
| **Structure** | Default after vault hydrate. Browse hierarchy. Click a note → editor. Click a folder → focus subtree. Brand mark returns here. |
| **Note** | Writing surface (BlockNote + optional Preview / Inspector). Enter by clicking a note from Structure or Links. |
| **Links** | Wikilink graph (Global / Local). Open from the rail; not the folder tree. |
| **Files** | ⌘B drawer peek — secondary; not required to browse. |

Refresh lands on **Structure**. Last active note is remembered for highlight / Note mode, but is **not** auto-opened into the editor.

## Develop

```bash
bun install
bun dev
```

## Design skill (Impeccable)

Install locally (gitignored — not committed):

```bash
npx impeccable install --providers=cursor --scope=project
```

If `.cursor/skills/impeccable/` is missing, agents should run that command before UI design work. See [`.cortext/impeccable.md`](./.cortext/impeccable.md), [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md).

## E2E / visual UX (Playwright)

Tests live in **`e2e/`** (not under `src/`).

```bash
bun run test:e2e          # headless
bun run test:e2e:ui       # interactive UI mode
bun run test:e2e:headed   # visible browser
bun run test:e2e:update   # refresh visual baselines
```

See [`e2e/README.md`](./e2e/README.md) and [`.cortext/e2e.md`](./.cortext/e2e.md).

## Usage

1. Empty vault → landing → **Create a note** / **Named…** / **Import vault**
2. Ready vault → **Structure** home (directory workflow)
3. Click a note widget → editor; brand / path jump → Structure
4. Rail **Links** → wikilink graph; **Files** (⌘B) → tree peek
5. Create: ⌘N untitled, ⌘⇧N named; folders via Create / right-click in Files
6. Optional **Preview** for wikilink click-through in Note mode

## `index.yaml`

Wikilink inventory (Links graph), not folder structure:

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

Structure graph is derived live from `docs` + `folders` in memory (parent paths only).

## Deploy

Pushes to `main` → https://meta-secret.github.io/k-thread/

## Cortex

Design notes (vision, architecture, two graphs, type safety, e2e, deploy): [`.cortext/`](./.cortext/README.md)
