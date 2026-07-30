# Deployment

## Target

Static hosting on **GitHub Pages**:

https://meta-secret.github.io/k-thread/

Repo: https://github.com/meta-secret/k-thread

## Base path

Vite production base is `/k-thread/` so asset URLs resolve under the project Pages site:

```ts
// vite.config.ts
base: process.env.NODE_ENV === 'production' ? '/k-thread/' : '/'
```

Local `bun dev` uses `/`.

## CI pipeline

Workflow: `.github/workflows/deploy.yml`

```
push to main  (or workflow_dispatch)
    → checkout
    → setup Bun
    → bun install --frozen-lockfile
    → bun run build          # vue-tsc -b && vite build
    → upload dist/ as Pages artifact
    → deploy-pages
```

Permissions: `pages: write`, `id-token: write` (GitHub Pages via Actions).

Concurrency group `pages` cancels in-progress deploys on newer pushes.

## Build script

```json
"build": "vue-tsc -b && vite build"
```

Typecheck is part of deploy — broken types do not ship.

## Environment reality

| Layer | Where it runs |
| --- | --- |
| Built JS/CSS/HTML | GitHub Pages CDN |
| Note data | User’s browser OPFS (per origin) |
| Import source | User’s local disk (File System Access) |

There is **no** server-side vault. Clearing site data clears OPFS for that origin. Different browsers / profiles do not share vaults.

## Manual deploy checklist

1. Pages source set to **GitHub Actions** (not classic branch `/docs`).
2. Push to `main` (or run the workflow manually).
3. Confirm Actions → Deploy job green.
4. Hard-refresh the Pages URL after first deploy (base path + cache).

## Local verification

```bash
bun install
bun run build
bun run preview
```

Preview serves `dist/`; remember production base path differs from dev.
