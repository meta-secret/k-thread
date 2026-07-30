# Stack & motivations

## Runtime & tooling

| Piece | Choice | Why |
| --- | --- | --- |
| Package manager / runner | **Bun** | Fast install & scripts; first-class in CI via `oven-sh/setup-bun` |
| Bundler / dev server | **Vite 8** | Minimal config; Vue + React plugins in one app |
| Language | **TypeScript** | Domain modeling with unions; `vue-tsc` on build |
| Host | **GitHub Pages** | Zero server cost; fits local-first SPA |

`erasableSyntaxOnly` is enabled — TypeScript must erase cleanly. That rules out classic `enum` syntax; we use **const objects + derived union types** instead (see [type-safety.md](./type-safety.md)).

## App framework

| Piece | Choice | Why |
| --- | --- | --- |
| UI framework | **Vue 3** (`<script setup>`) | Compact components, reactive store without Redux ceremony |
| UI kit | **shadcn-vue** + Reka UI | Accessible primitives; copy-in components; Tailwind-aligned |
| Icons | **@lucide/vue** | Consistent, tree-shakeable |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Utility-first shell without a second CSS architecture |

**Motivation:** Vue keeps the shell small. shadcn-vue avoids inventing dialogs/menus. We do not pull a full Vue meta-framework (Nuxt) because there is no SSR/server.

## Editor

| Piece | Choice | Why |
| --- | --- | --- |
| Block editor | **BlockNote** (`@blocknote/core` / `react` / `mantine`) | Best-in-class block UX; schema extensible for Obsidian dialect |
| Bridge | **React 19** island inside Vue | BlockNote’s primary surface is React; mount/unmount from Vue |

Vite loads `@vitejs/plugin-vue` and `@vitejs/plugin-react` together. Only `src/editor/*` and the editor wrapper speak React.

**Motivation:** A plain CodeMirror markdown textarea was not enough for callouts, slash menus, and structured Obsidian constructs. BlockNote gives structure; we own the markdown dialect bridge (`obsidian.ts` + custom schema).

## Graph

| Piece | Choice | Why |
| --- | --- | --- |
| Layout | **d3-force** | Proven force-directed layout |
| DOM/SVG | **d3-selection**, **d3-zoom**, **d3-drag**, **d3-transition** | Zoom/pan/drag without a heavy graph framework |

**Motivation:** Obsidian’s graph is force-based with local/global modes. D3 modules are small, composable, and avoid pulling Cytoscape/Sigma unless we need WebGL scale later.

## Data & markdown

| Piece | Choice | Why |
| --- | --- | --- |
| Index format | **YAML** (`yaml` package) | Human-readable `index.yaml`, Obsidian-adjacent |
| Preview | **marked** | Lightweight HTML preview |
| Storage | **OPFS** | Persistent, origin-private, hierarchical FS in modern browsers |

## Testing / visual UX

| Piece | Choice | Why |
| --- | --- | --- |
| E2E | **Playwright** (`@playwright/test`) | Real Chromium; OPFS + shell/graph UX |
| Location | **`e2e/` only** | Keep tests out of `src/` |

Use headed / UI mode actively when reviewing design (see [e2e.md](./e2e.md)).

## What we deliberately skipped

- **Pinia / Vuex** — a single `vaultStore` module is enough.
- **Nuxt / SSR** — Pages serves static assets; OPFS is client-only.
- **IndexedDB as primary store** — files and folders map more naturally to OPFS for vault import/export mental model.
- **Full Obsidian plugin runtime** — out of scope; preserve fences only.
