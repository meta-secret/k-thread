# Design

## Light shell (no dark UI)

| Mode | Look | Role |
| --- | --- | --- |
| **Structure** | Light workflow widgets — vault → folders → notes | **Main page / home** |
| **Note** | Kube — cool gray wash, black active blocks, stage + rails | Writing surface |
| **Links** | GTD-style flowchart — pastel pills, charcoal arrows | Wikilink navigation |

Do **not** ship dark / black HUD canvases. Both canvases stay light: Structure = white step cards on a soft dotted field; Links = pastel pills on white — not neon HUD chrome.

**Taste pass:** IBM Plex Sans/Mono locked; no purple/teal AI defaults; signal red for accent only; landing is brand-first (mark + wordmark + one line + CTAs); tokens in `src/style.css` (`--kube-*`).

## Product feel

Obsidian strengths we chase:

- Notes as files (hierarchy + import)
- Structure as the place you orient (“where am I?”)
- Wikilinks as navigation + Links graph as second-brain view
- Keyboard create — ⌘N / ⌘⇧N; Files drawer — ⌘B

We do **not** chase plugin marketplace, pane mosaic, or settings deep-dives in v0.

## Shell map

```
┌─ header (brand→home · status · path jump) ──────────┐
│ ToolRail │ Structure | Note+Inspector | Links       │
│ View →   │ (default) │ BlockNote      │ wikilinks   │
│ Create → │           │                │             │
│ Manage   │           │                │             │
└─ footer ────────────── Files drawer (⌘B peek) ──────┘
```

| Rail | Role |
| --- | --- |
| **View** | Note / Links / Files / Preview — Structure is home (brand returns; no Structure toggle required) |
| **Create** | New note, Named, Folder — secondary |
| **Manage** | Import, Rename, Delete — tertiary, bottom |

On refresh / import: land on **Structure**. Remembered note may be highlighted; do not auto-open it into the editor.

## Structure UX (main)

White step cards (icon tile + title + one meta line + step index), parent-aligned tidy tree, charcoal arrows, soft dotted field.

| Action | Behavior |
| --- | --- |
| Click note widget | Open note in editor |
| Click folder | Focus subtree |
| Click vault root | Clear folder focus |
| Hover | Brighten arrows; dim rest |
| Drag / pan / zoom | Reposition and navigate |
| Brand | Return to Structure home |

## Links UX (separate)

| Action | Behavior |
| --- | --- |
| Click chip | Focus note; stay on Links |
| Double-click | Open note in editor |
| Hover | Brighten wires; dim rest |
| Global / Local | Full vault vs N-hop neighborhood |

Missing wikilink targets = hollow chips + dashed strands.

## Editor UX

- BlockNote + Obsidian dialect round-trip
- Suggestions: `[[`, `#`, `/`
- Optional Preview split inside the stage
- Empty stage: point people at Structure or create a note

## UI system

- shadcn-vue / Reka for dialogs and the Files tree primitives
- Shell chrome (ToolRail, Inspector, stage) is bespoke CSS matching kube
- Structure + Links chrome is bespoke SVG/CSS on the light palette
