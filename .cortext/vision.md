# Vision

## Idea

**k-thread** is a local-first, Obsidian-like notes app that runs entirely in the browser. There is no application server. Notes live in the browser’s **Origin Private File System (OPFS)** as real markdown files and folders. The UI is a static site hosted on **GitHub Pages**.

The name sits under the [meta-secret](https://github.com/meta-secret) org: a place for knowledge threads that stay on the user’s machine while the app itself is publicly deployable.

## Goals

1. **Local-first** — create, edit, rename, delete notes without a backend.
2. **Obsidian dialect** — `[[wikilinks]]`, embeds, tags, highlights, callouts, frontmatter, comments; plugin fences preserved for interop.
3. **Hierarchy** — folders are real OPFS directories (`Projects/Alpha.md`), not flat fake paths.
4. **Graph** — dependency graph from wikilinks, persisted as `index.yaml`, visualized with D3.
5. **Import** — load an existing Obsidian vault via the File System Access API into OPFS.
6. **Minimal surface** — prefer a few strong libraries over bespoke frameworks; keep app code lean.
7. **Type clarity** — prohibit `null`/`undefined` in app domain types; prefer tagged unions and const “enums”.

## Non-goals (for now)

- Multi-user sync, accounts, or cloud storage as the source of truth
- Executing Obsidian plugins (Dataview, Templater, etc.) — fences are preserved, not run
- Mobile-native apps or offline service-worker packaging beyond a normal SPA
- Full pixel-perfect Obsidian clone (we aim for familiar navigation and dialect, not parity)

## Success looks like

- Open the Pages URL → notes restore from OPFS → edit in a modern block editor → links update the graph → import/export stays markdown-compatible with Obsidian.
