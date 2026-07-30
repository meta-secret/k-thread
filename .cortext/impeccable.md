# Impeccable

Design skill from [impeccable.style](https://impeccable.style/) — shared vocabulary for agents (`/polish`, `/distill`, `/critique`, …).

## Install (global only — do not vendor in this repo)

```bash
npx impeccable install --providers=cursor --scope=global
npx impeccable update
```

Skill path on this machine:

```
~/.cursor/skills/impeccable/
```

**Never** copy the skill into `.cursor/skills/impeccable` or `.agents/skills/impeccable` in this project.

Project wiring that *is* allowed:

| Path | Role |
| --- | --- |
| `PRODUCT.md` | Product truth (`/impeccable init`) |
| `DESIGN.md` | Incumbent visual system (`/impeccable document`) |
| `.impeccable/config.json` | Hook / detector config (shared) |
| `.impeccable/config.local.json` | Machine consent — **gitignored** |
| `.cursor/hooks.json` | Cursor pre-write gate → `$HOME/.cursor/skills/impeccable/...` |

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

Manual detector (when hooks quiet):

```bash
node ~/.cursor/skills/impeccable/scripts/detect.mjs --json src/components src/App.vue src/style.css
```

## k-thread defaults

- Mode: **Operate** (shell/graph), **Persuade** (landing)
- Light shell only — see [design.md](./design.md) / root `DESIGN.md`
- Prefer Impeccable over the legacy Taste Skill ([taste.md](./taste.md))

## First-session checklist

1. Skill installed globally (`npx impeccable install --scope=global`)
2. Cursor Agent Skills enabled
3. `PRODUCT.md` + `DESIGN.md` present (done)
4. Hooks on + `.cursor/hooks.json` points at `$HOME/.cursor/skills/impeccable`
5. For UI work: `/impeccable polish` / `/critique` / `/layout` as needed
