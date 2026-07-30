# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who think in linked notes (Obsidian habits, researchers, builders) and want a **local-first** vault in the browser without accounts or a server.

Primary job: capture notes as real files, navigate via wikilinks, and see relationships in a graph — then leave with markdown that still opens in Obsidian.

## Product Purpose

**k-thread** is a local-first, Obsidian-like notes app that runs entirely in the browser. Notes live in the Origin Private File System (OPFS) as nested markdown files and folders. The UI is a static SPA on GitHub Pages.

Success: open the site → vault restores → edit in a modern block editor → links update the graph → import stays Obsidian-compatible.

## Positioning

Browser-native OPFS vault with hierarchical folders and Obsidian dialect round-trip — no backend, no sync product, no plugin runtime. Knowledge stays on the machine; the app is publicly deployable.

## Operating Context

- Desktop browser (Chromium-class OPFS)
- Keyboard create: ⌘N / ⌘⇧N; Files drawer: ⌘B
- Note shell for writing; graph for link navigation
- Import vault via File System Access API

## Capabilities and Constraints

**Can:** create / rename / delete notes & folders; BlockNote editor with `[[wikilinks]]`, `#tags`, callouts, frontmatter; preview; global/local graph from `index.yaml`; import Obsidian folders.

**Cannot (v0):** multi-user sync, accounts, cloud as source of truth, executing Obsidian plugins, mobile-native apps.

**Domain rules:** no `null`/`undefined` in app domain types; modules ≤500 LOC with semantic splits; light UI only (no dark HUD).

## Brand Commitments

- Name: **k-thread** (meta-secret org)
- Light kube shell; graph = GTD-style pastel flowchart (not cyberpunk black)
- Signal red (`#c02323`) for accent only
- Brand-first landing: mark + wordmark + one line + CTAs

## Evidence on Hand

- Live: https://meta-secret.github.io/k-thread/
- Repo design notes: `.cortext/`
- No fabricated testimonials or metrics

## Product Principles

1. Local files are the truth — OPFS hierarchy over fake flat stores.
2. Obsidian dialect is a bridge, not a plugin marketplace.
3. One note = one graph node; edges are real wikilinks only.
4. Orient before act — Structure home, then Note / Links; Create secondary, Manage last.
5. Never surprise-open a random note on refresh; restore last note or land on Structure.
6. Two graphs stay separate: Structure = folders/files; Links = wikilinks.

## Accessibility & Inclusion

Keyboard-reachable primary actions; shadcn-vue / Reka primitives for dialogs. No stricter WCAG target confirmed beyond sensible contrast on the light shell.
