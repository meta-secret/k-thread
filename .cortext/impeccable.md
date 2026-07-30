# Impeccable

Design skill from [impeccable.style](https://impeccable.style/) — shared vocabulary for agents (`/polish`, `/distill`, `/critique`, …).

## Strategy: local skills, gitignored

Install Impeccable **into the project** so Cursor discovers it under `.cursor/skills/`, but **do not commit the skill payload** (large, upstream-owned, updated via npm).

| Path | In git? | Role |
| --- | --- | --- |
| `.cursor/skills/impeccable/` | **No** (gitignored) | Skill + scripts for agents |
| `.cursor/hooks.json` | Yes | Pre-write detector → local skill |
| `.cursor/rules/impeccable.mdc` | Yes | Tells agents to download if missing |
| `PRODUCT.md` / `DESIGN.md` | Yes | Product + visual authority |
| `.impeccable/config.json` | Yes | Hook / detector config |
| `.impeccable/config.local.json` | **No** | Machine consent |

## Agent rule — if the skill is not present

**If `.cursor/skills/impeccable/SKILL.md` is missing, the agent must download it before doing design work:**

```bash
npx impeccable install --providers=cursor --scope=project
```

Requires Node 22.12+. Then read `.cursor/skills/impeccable/SKILL.md` and follow Impeccable (context → playbook → craft floor). Do not skip install and improvise “from memory.”

Update later:

```bash
npx impeccable update
```

## Commands (use in chat)

| Command | Purpose |
| --- | --- |
| `/impeccable init` | Capture / refresh `PRODUCT.md` |
| `/impeccable document` | Scan code → `DESIGN.md` |
| `/impeccable shape` | Plan UX before code |
| `/impeccable critique` | Heuristic UX review |
| `/impeccable audit` | A11y / perf / responsive checks |
| `/impeccable polish` | Final alignment / consistency pass |
| `/impeccable distill` | Strip complexity |
| `/impeccable clarify` | UX copy / labels |
| `/impeccable layout` | Spacing / hierarchy |
| `/impeccable typeset` | Typography |
| `/impeccable colorize` | Strategic color |
| `/impeccable quieter` / `/bolder` | Tone |
| `/impeccable harden` | Production edge cases |
| `/impeccable onboard` | Empty / first-run |
| `/impeccable animate` / `/delight` | Motion / personality |
| `/impeccable adapt` | Responsive |
| `/impeccable optimize` | UI performance |
| `/impeccable live` | Browser variant iteration |
| `/impeccable extract` | Tokens → design system |
| `/impeccable hooks on\|off\|status` | Design detector hook |
| `/impeccable doctor` | Repair drift |

Manual detector:

```bash
node .cursor/skills/impeccable/scripts/detect.mjs --json src/components src/App.vue src/style.css
```

## k-thread defaults

- Mode: **Operate** (shell/graph), **Persuade** (landing)
- Light shell only — root `DESIGN.md` + [design.md](./design.md)
- Prefer Impeccable over the legacy Taste Skill ([taste.md](./taste.md))

## First-session checklist

1. `npx impeccable install --providers=cursor --scope=project` (if `.cursor/skills/impeccable` missing)
2. Cursor Agent Skills enabled
3. `PRODUCT.md` + `DESIGN.md` present
4. For UI work: `/impeccable polish` / `/critique` / `/layout` as needed
