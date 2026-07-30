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
| [design.md](./design.md) | Light kube shell (note + graph); no dark UI |
| [stack.md](./stack.md) | Frameworks, TypeScript tooling, motivations |
| [type-safety.md](./type-safety.md) | ≤500 LOC/file (semantic splits); no `null`/`undefined`; `Option` / `Result` / const unions |
| [storage.md](./storage.md) | OPFS vault, folders, `index.yaml` |
| [editor.md](./editor.md) | BlockNote island + Obsidian dialect |
| [graph.md](./graph.md) | Light graph pills, rounded wires, local/global nav |
| [deployment.md](./deployment.md) | Bun build, GitHub Actions, Pages |
| [e2e.md](./e2e.md) | Playwright under `e2e/`; active UI/UX browser review |
| [impeccable.md](./impeccable.md) | Impeccable design skill — **global** install only |
| [taste.md](./taste.md) | Legacy Taste Skill (project-local); prefer Impeccable |

## Quick orientation

```
Browser (static SPA on GitHub Pages)
  └─ Vue 3 shell
       ├─ kube rails   → ToolRail + EditorStage + Inspector
       ├─ vaultStore   → reactive app state + backlinks
       ├─ OPFS         → local markdown vault
       ├─ BlockNote    → React editor island
       └─ D3 graph → pills + rounded wires (light)
```

Start with **vision**, then **architecture** and **type-safety**. Use the rest as deep dives.
