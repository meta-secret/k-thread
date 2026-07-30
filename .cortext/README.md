# k-thread — Cortex

Internal design notes for [meta-secret/k-thread](https://github.com/meta-secret/k-thread).

Live app: https://meta-secret.github.io/k-thread/

This folder is the project’s mental model: why it exists, how it is shaped, which tools we chose, and the type-safety rules that keep the codebase small and clear.

## Map

| Doc | What it covers |
| --- | --- |
| [vision.md](./vision.md) | Product idea, goals, non-goals |
| [architecture.md](./architecture.md) | Layers, modules, data flow |
| [design.md](./design.md) | Dual aesthetic: kube note shell + HUD graph |
| [stack.md](./stack.md) | Frameworks, TypeScript tooling, motivations |
| [type-safety.md](./type-safety.md) | No `null`/`undefined`; `Option` / `Result` / const unions |
| [storage.md](./storage.md) | OPFS vault, folders, `index.yaml` |
| [editor.md](./editor.md) | BlockNote island + Obsidian dialect |
| [graph.md](./graph.md) | HUD wires, chip nodes, local/global nav |
| [deployment.md](./deployment.md) | Bun build, GitHub Actions, Pages |

## Quick orientation

```
Browser (static SPA on GitHub Pages)
  └─ Vue 3 shell
       ├─ kube rails   → ToolRail + EditorStage + Inspector
       ├─ vaultStore   → reactive app state + backlinks
       ├─ OPFS         → local markdown vault
       ├─ BlockNote    → React editor island
       └─ D3 HUD graph → chip nodes + bundled wires
```

Start with **vision**, then **architecture** and **type-safety**. Use the rest as deep dives.
