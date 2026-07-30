# Design

## Light shell (no dark UI)

| Mode | Look | Role |
| --- | --- | --- |
| **Structure** | Light workflow widgets — vault → folders → notes | Main nav / home |
| **Note** | Kube / END IS UI — cool gray wash, black active blocks, stage + rails | Writing surface |
| **Links** | GTD-style flowchart — pastel pills, charcoal arrows | Wikilink navigation |

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
┌─ header (brand · status · [Structure jump]) ────────┐
│ ToolRail │ Structure | Note+Inspector | Links       │
│ View →   │ (home)    │ BlockNote      │ wikilinks   │
│ Create → │           │                │             │
│ Manage   │           │                │             │
└─ footer ────────────── Files drawer (⌘B peek) ──────┘
```

| Rail | Role |
| --- | --- |
| **View** | Structure / Note / Links / Files / Preview |
| **Create** | New note, Named, Folder — secondary |
| **Manage** | Import, Rename, Delete — tertiary, bottom |

On refresh: restore **last opened note** if remembered; otherwise land on **Structure** — never pick a random vault entry.

Files tree is a **drawer peek**, not the primary browser. Structure and Links are separate full canvases.

## Structure UX (main)

| Action | Behavior |
| --- | --- |
| Click note widget | Open note in editor |
| Click folder | Focus subtree |
| Click vault root | Clear folder focus |
| Hover | Brighten arrows; dim rest |
| Drag / pan / zoom | Reposition and navigate |

## Links UX (separate)

| Action | Behavior |
| --- | --- |
| Click chip | Focus note; stay on Links |
| Double-click | Open note in editor |
| Hover | Brighten wire bundles; dim rest |
| Global / Local | Full vault vs N-hop neighborhood |

Missing wikilink targets = hollow chips + dashed strands.

## Editor UX

- BlockNote + Obsidian dialect round-trip
- Suggestions: `[[`, `#`, `/`
- Optional Preview split inside the stage

## UI system

- shadcn-vue / Reka for dialogs and the Files tree primitives
- Shell chrome (ToolRail, Inspector, stage) is bespoke CSS matching kube
- Graph chrome is bespoke SVG/CSS on the light kube palette
