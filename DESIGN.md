---
name: k-thread
description: Light kube notes shell + GTD-style pastel graph
colors:
  kube-ink: "#121214"
  kube-mute: "#6b6b73"
  kube-wash-top: "#efeff1"
  kube-wash-mid: "#d8d8dc"
  kube-wash-bot: "#c4c4ca"
  kube-paper: "#ffffff"
  card: "#f4f4f6"
  signal-red: "#c02323"
  signal-red-dim: "#9a1a1a"
  graph-bg: "#ffffff"
  graph-arrow: "#5a5a64"
  pastel-peach: "#FFE8C8"
  pastel-gray: "#E8E8EC"
  pastel-pink: "#F5D0D8"
  pastel-mint: "#D4F0E0"
  pastel-lavender: "#E4DCF5"
  pastel-sky: "#D6E8F5"
  shadow-soft: "rgba(0, 0, 0, 0.1)"
  shadow-mid: "rgba(0, 0, 0, 0.12)"
  shadow-deep: "rgba(0, 0, 0, 0.14)"
  overlay-strong: "rgba(0, 0, 0, 0.55)"
  chrome-dim: "#999999"
  chrome-dark: "#3f3f3f"
typography:
  sans:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.45
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontWeight: 400
  display:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 650
    letterSpacing: "-0.02em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  pill: "999px"
spacing:
  rail-gap: "1.75rem"
  stage-pad: "1.25rem"
components:
  icon-btn-on:
    backgroundColor: "{colors.kube-ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.sm}"
  graph-pill-focus:
    backgroundColor: "{colors.pastel-peach}"
    textColor: "{colors.kube-ink}"
    rounded: "{rounded.pill}"
  cta-primary:
    backgroundColor: "{colors.kube-ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
---

# Design

## Overview

Light **kube** product shell for writing; **GTD-style flowchart** for the graph. One visual family — cool gray washes, black active blocks, soft pastel note pills, charcoal arrows. Never a dark / neon HUD.

Visitor modes: landing = Persuade (brand-first); note + graph = Operate.

## Colors

| Token | Use |
| --- | --- |
| kube-ink | Primary text, active chrome |
| kube-mute | Secondary labels |
| kube-wash-* | App atmosphere gradient |
| signal-red | Accent / destructive only |
| pastel-* | Graph note pills by folder / hop |
| graph-bg | Graph canvas (white) |
| graph-arrow | Orthogonal link strokes |

## Typography

IBM Plex Sans for UI and note chrome; IBM Plex Mono for ordinals / readouts only. Graph pill labels are medium Sans, sentence case — not all-caps cyberpunk.

## Layout

- Header · workspace (rail + stage [+ inspector]) · footer
- Structure is the **main page** (no View toggle to reveal it); brand returns home
- Rail: **View** (Note / Links / Files / Preview) → **Create** → **Manage**
- Structure widgets: white step cards, icon tile, parent-aligned tree funnel
- Links: top-down BFS rows (Focus → Hop n) for wikilinks only
- Files = drawer peek (⌘B), not the primary browser

## Elevation & Depth

Mostly flat. Soft wash gradients for atmosphere; no glass stacks, no neon glow shadows. Graph arrows are 1.5px charcoal with triangular heads.

## Shapes

Tight radii on chrome (`~4px`). Graph notes are full pills. Icon buttons are square tiles.

## Components

- **ToolRail** — View icons, Create list, Manage list
- **EditorStage** — BlockNote or empty “No note open” CTA
- **Inspector** — Tags / Backlinks / Links / Preview
- **StructureView** — hierarchy workflow widgets (main nav)
- **GraphView** — Links mode pastel pills + orthogonal arrows
- **Landing** — BrandMark, wordmark, one line, three CTAs

## Do's and Don'ts

**Do**

- Keep light shell; Structure as home when no note; restore last note when remembered
- Keep Structure edges (folders) separate from Links edges (wikilinks)
- Prefer Impeccable commands for visual passes

**Don't**

- Dark / black graph canvases or neon-on-black wires
- Mix folder hierarchy and wikilinks on one canvas
- Surprise-open a random vault note on refresh
- Purple AI gradients, Inter-on-slate defaults, card grids as structure
