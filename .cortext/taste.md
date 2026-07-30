# Taste Skill

Anti-slop frontend skill from [tasteskill.dev](https://www.tasteskill.dev/) / [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill).

## Installed

| Path | Role |
| --- | --- |
| `.agents/skills/design-taste-frontend/` | Canonical install (`npx skills`) |
| `.cursor/skills/design-taste-frontend/` | Cursor project skill (agent discovery) |
| `skills-lock.json` | Pinned hash for restore |

Skill name: **`design-taste-frontend`** (v2 experimental default).

## Install / update

```bash
npx skills add Leonxlnx/taste-skill --skill "design-taste-frontend" --agent cursor --copy -y
cp -R .agents/skills/design-taste-frontend .cursor/skills/design-taste-frontend
```

Restore from lockfile:

```bash
npx skills experimental_install
```

## When to use

- Visual redesigns of the kube shell or landing surface
- Escaping generic AI UI defaults (purple gradients, equal card grids, Inter-on-slate)
- Brief → design-system mapping before shipping UI

Note: the skill’s primary focus is landings / portfolios / redesigns — not dense data dashboards. For k-thread, treat graph HUD and note shell as **redesign** work: audit-first, preserve product constraints (OPFS, Obsidian dialect, dual aesthetic).

## Related optional skills (not installed)

From the same package if needed later: `redesign-skill`, `minimalist-skill`, `brutalist-skill`, `soft-skill`, `image-to-code-skill`.
