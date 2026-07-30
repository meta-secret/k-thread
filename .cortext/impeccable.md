# Impeccable

Design skill from [impeccable.style](https://impeccable.style/) — anti-slop UI vocabulary (`/polish`, `/distill`, `/critique`, `/layout`, …).

## Install location (global only)

**Do not** vendor Impeccable under this repo (no `.cursor/skills/impeccable`, no project hooks).

Installed for this machine at:

```
~/.cursor/skills/impeccable/
```

```bash
npx impeccable install --providers=cursor --scope=global
npx impeccable update
```

Requires Cursor Agent Skills enabled. After install, run `/impeccable init` once in chat if you want `PRODUCT.md` / design context files — keep those optional; prefer `.cortext/` for k-thread product truth.

## When to use

- Shell / landing / graph visual passes
- `/critique` or `/polish` before shipping UI
- `/layout` when hierarchy or spacing feels wrong
- Prefer over inventing a new dark HUD or generic AI chrome

## Relation to other notes

| Doc | Role |
| --- | --- |
| [design.md](./design.md) | Light shell, no dark UI, graph = GTD flowchart language |
| [taste.md](./taste.md) | Older Taste Skill (project-local); Impeccable is the preferred design skill |
| [graph.md](./graph.md) | Graph layout and interaction |

Product constraints still win: OPFS, Obsidian dialect, light UI, one note = one graph node.
