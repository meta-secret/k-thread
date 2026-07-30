# Design System & Aesthetic Directions

## Master Theme System (Light / Dark Mode)

k-thread features a single, global **Sun/Moon Master Theme Toggle** in the top navigation header bar (`App.vue`), controlling the page shell, editor stage, and D3 graph canvas synchronously:

| Element | Dark Mode | Light Mode |
| --- | --- | --- |
| **Canvas Background** | Deep zinc wash (`#09090b`) with soft dot matrix grid | Crisp off-white (`#efeff1`) with subtle dot matrix |
| **Node Micro-Cards** | Dark zinc cards (`#18181b`) with 34×34px icon tile and orange accents | Clean white cards (`#ffffff`) with subtle borders |
| **Editor Stage** | Deep charcoal stage with crisp white text (`#f4f4f6`) | Cool gray wash with dark text (`#121214`) |
| **Header Chrome** | Translucent glassmorphism (`backdrop-blur-2xl bg-zinc-950/90`) | Glassmorphic white header (`backdrop-blur-2xl bg-white/90`) |

## Direct 1-Click Interaction Model

No three-dot buttons, no popover drawers, no hidden dropdown menus. Every node is a clean, spacious 1-click target:

- **1 Click on Note Card**: Opens Note in Editor.
- **1 Click on Folder Card**: Toggles Collapse / Expand subtree directly in-place.
- **Double Click on Folder Card**: Focuses subtree.
- **Hover**: Brightens connected wire strands and animates glowing energy pulses.

## Master Graph Visual Tokens

- **Font Family**: IBM Plex Sans / IBM Plex Mono for ordinal badges and tags.
- **Orange Accents**: `#f97316` / `#ff6b00` for hierarchy flow and active focus rings.
- **Cyan Accents**: `#06b6d4` / `#38bdf8` for internal `[[wikilink]]` connections.

## Editor UX

- BlockNote + Obsidian dialect round-trip
- Suggestions: `[[`, `#`, `/`
- Optional Preview split inside the stage
- Empty stage: point people at Structure or create a note

## UI system

- shadcn-vue / Reka for dialogs and the Files tree primitives
- Shell chrome (ToolRail, Inspector, stage) is bespoke CSS matching kube
- Structure + Links chrome is bespoke SVG/CSS on the light palette
