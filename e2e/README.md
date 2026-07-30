# E2E (Playwright)

Browser tests and visual UX captures for k-thread. **Kept out of `src/`** on purpose.

```
e2e/
  playwright.config.ts   # config (webServer → bun dev)
  helpers/               # shared navigation / ready waits
  *.spec.ts              # suites
```

## Commands

```bash
bun run test:e2e          # headless Chromium
bun run test:e2e:ui       # Playwright UI mode
bun run test:e2e:headed   # headed browser
bun run test:e2e:update   # refresh visual baselines
```

Artifacts (gitignored): `../test-results/`, `../playwright-report/`.

## Agent / design use

Use Playwright actively when changing shell, Structure, Links, or editor UX — open headed/UI mode, walk Structure (brand home) ↔ Note ↔ Links ↔ Files, and capture screenshots before calling a UI change done. See [`.cortext/e2e.md`](../.cortext/e2e.md) and [`.cortext/graph.md`](../.cortext/graph.md).
