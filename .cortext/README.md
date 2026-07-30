# k-thread — Cortex

Internal design notes for [meta-secret/k-thread](https://github.com/meta-secret/k-thread).

Live app: https://meta-secret.github.io/k-thread/

This folder is the project’s mental model: why it exists, how it is shaped, which tools we chose, and the type-safety rules that keep the codebase small and clear.

Root companions for Impeccable: [`PRODUCT.md`](../PRODUCT.md), [`DESIGN.md`](../DESIGN.md). Skill installs into `.cursor/skills/impeccable/` (**gitignored**); agents download it if missing — see [impeccable.md](./impeccable.md).

## Map

| Doc | What it covers |
| --- | --- |
| [vision.md](./vision.md) | Product idea, goals, non-goals |
| [architecture.md](./architecture.md) | Layers, modules, data flow |
| [design.md](./design.md) | Light kube shell; Structure home + Links; no dark UI |
| [stack.md](./stack.md) | Frameworks, TypeScript tooling, motivations |
| [type-safety.md](./type-safety.md) | ≤500 LOC/file; no `null`/`undefined`; `Option` / `Result` / const unions |
| [storage.md](./storage.md) | OPFS vault, folders, `index.yaml`, session restore |
| [editor.md](./editor.md) | BlockNote island + Obsidian dialect |
| [graph.md](./graph.md) | **Two graphs**: Structure (home) vs Links (wikilinks) |
| [deployment.md](./deployment.md) | Bun build, GitHub Actions, Pages |
| [e2e.md](./e2e.md) | Playwright under `e2e/`; Structure / Note / Links surfaces |
| [impeccable.md](./impeccable.md) | Impeccable design skill — project install, gitignored payload |
| [taste.md](./taste.md) | Legacy Taste Skill (project-local); prefer Impeccable |

## Quick orientation

```
Browser (static SPA on GitHub Pages)
  └─ Vue 3 shell
       ├─ Structure (home)  → hierarchy workflow widgets
       ├─ Note              → EditorStage + Inspector
       ├─ Links             → wikilink flowchart (D3)
       ├─ Files (⌘B)        → drawer peek only
       ├─ vaultStore        → reactive state + session
       ├─ OPFS              → local markdown vault
       └─ BlockNote         → React editor island
```

**Locked:** Structure and Links stay on **separate** canvases. Never mix folder edges and wikilink edges in one view.

Start with **vision**, then **graph** and **architecture**. Use the rest as deep dives.
