# E2E & visual review (Playwright)

## Placement

All Playwright config and tests live under **`e2e/`**. Do not put tests inside `src/`.

## Role

Playwright is not only CI smoke — agents and humans should use it **actively** to inspect design, UX, and UI:

1. Run `bun run test:e2e:headed` or `bun run test:e2e:ui` while iterating on shell / Structure / Links / editor.
2. Walk Structure (home via brand) → Note → Links → Files drawer; check first viewport and clutter.
3. Prefer screenshot assertions in `e2e/design.spec.ts` (`structure-shell`, `links-shell`, note, landing, files).
4. Update baselines with `bun run test:e2e:update` only after intentional visual changes.
5. Helpers in `e2e/helpers/app.ts`: brand → Structure; rail → Note / Links.

## Commands

| Script | Purpose |
| --- | --- |
| `bun run test:e2e` | Headless Chromium suite |
| `bun run test:e2e:ui` | Interactive Playwright UI |
| `bun run test:e2e:headed` | Visible browser |
| `bun run test:e2e:update` | Refresh visual snapshots |

Dev server is started by Playwright (`webServer` → `bun run dev` on `127.0.0.1:5173`).

## Stack note

Tests use `@playwright/test` + Chromium. OPFS vault hydrate runs in the real browser context, same as production local-first behavior.
