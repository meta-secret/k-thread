# Design

## Light shell (no dark UI)

| Mode | Look | Role |
| --- | --- | --- |
| **Note** | Kube / END IS UI — cool gray wash, black active blocks, stage + rails | Writing surface |
| **Graph** | GTD-style flowchart — white field, pastel pills, charcoal arrows | Link navigation |

Do **not** ship dark / black HUD canvases. Graph follows a light flowchart language (pastel pills + thin arrows), not neon HUD chrome.

**Taste pass (design-taste-frontend):** IBM Plex Sans/Mono locked; no purple/teal AI defaults; one red accent as signal; landing is brand-first (mark + wordmark + one line + CTAs); shared tokens in `src/style.css` (`--kube-*`, light `--hud-*`).

## Product feel

Obsidian strengths we chase:

- Notes as files (hierarchy + import)
- Wikilinks as navigation
- Graph as a second-brain view
- Keyboard create — ⌘N / ⌘⇧N; Files drawer — ⌘B

We do **not** chase plugin marketplace, pane mosaic, or settings deep-dives in v0.

## Note shell (kube map)

```
┌─ header (brand · status · ordinal) ─────────────────┐
│ ToolRail │ EditorStage (grid) │ Inspector           │
│ forms +  │ BlockNote / empty  │ tags·links·preview  │
│ tools    │ cube placeholder   │                     │
└─ footer (k-thread · index) ── Files drawer overlay ─┘
```

| Kube reference | k-thread |
| --- | --- |
| Forms strip | Note / Graph / Preview / Import / Files |
| Tools list | New, Named, Folder, Rename, Delete |
| Center stage | BlockNote on muted grid; empty = wireframe cube CTA |
| Status under stage | title · folder · LNK count |
| Right 2×2 | Tags / Backlinks / Links / Preview |
| Footer | brand + note ordinal |

Folder tree is a **Files drawer**, not a permanent primary column. Graph mode is full-bleed on the same light shell.

## Graph UX

| Action | Behavior |
| --- | --- |
| Click chip | Focus note; stay on graph |
| Double-click | Open note in editor |
| Hover | Brighten wire bundles; dim rest |
| Drag / pan / zoom | Reposition and navigate canvas |
| Global / Local | Full vault vs N-hop neighborhood |

Missing targets = hollow chips + dashed strands.

## Editor UX

- BlockNote + Obsidian dialect round-trip
- Suggestions: `[[`, `#`, `/`
- Optional Preview split inside the stage

## UI system

- shadcn-vue / Reka for dialogs and the Files tree primitives
- Shell chrome (ToolRail, Inspector, stage) is bespoke CSS matching kube
- Graph chrome is bespoke SVG/CSS on the light kube palette
