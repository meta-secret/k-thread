# Graph Architecture & Design

k-thread features a **Unified Master Graph Canvas** (`StructureView.vue`) that seamlessly integrates both **External Directory Hierarchy** and **Internal Note [[Wikilinks]]** into a single, cohesive Left-to-Right architectural widget canvas.

```mermaid
flowchart LR
  Vault[Vault Root] --> Folders[Directory Folders]
  Folders --> Notes[Note Cards]
  Notes -.->|[[wikilinks]]| Notes
```

## Unified Master Graph

Instead of splitting directory tree and wikilink network across disconnected views or using generic force-directed graph blobs, k-thread unifies both representations inside the master Left-to-Right graph canvas (`StructureView.vue`).

### Top Toolbar Mode Selector

| Mode | Visual Representation | Edge Styling |
| --- | --- | --- |
| **Structure** | Directory hierarchy tree (`Vault → Folders → Notes`) | Orange workflow strands (`#f97316`) |
| **Links** | Note-to-note `[[wikilink]]` network | Glowing cyan/blue strands (`#06b6d4` / `#38bdf8`) |
| **Combined** | Hybrid mode: folder tree **AND** note `[[wikilinks]]` in one view | Dual-colored animated strands (Orange + Cyan) |

## Layout & Aesthetics

- **Left-to-Right Horizontal Flow**: Vault Root at Column 0 → Folders at Column 1+ → Notes at Column 2+. In `Links` mode, depth columns are normalized starting at Column 0 to eliminate phantom empty folder spaces.
- **Smooth Arc Bezier Curves**: Backwards right-to-left `[[wikilink]]` strands curve in a smooth, elegant arc above/below nodes (`to.x < from.x`), eliminating overshooting loops and node clipping.
- **Architectural Micro-Cards (`196px` × `54px`)**: Clean micro-rounded (`rx = 10`) cards featuring 34×34px icon tile, crisp title, meta subtitle, step ordinal (`#01`, `#02`), and kind tag (`VAULT`, `DIR`, `NOTE`).
- **Animated Energy Strands**: Glowing animated pulses flow continuously along cubic Bezier wire strands (`stroke-dashoffset` animation). Hovering accelerates flow from 1.2s to 0.5s.

## Ergonomic 1-Click Direct Manipulation & Contextual Links Widget

All tiny three-dot `⋮` buttons have been replaced with direct manipulation and a floating **Contextual Node Links & Management Widget**:

| Target | Action | Behavior |
| --- | --- | --- |
| **Note Card** | **Single Click** | Pins node & opens **Contextual Node Links Widget** |
| **Folder Card** | **Single Click** | Toggles Collapse / Expand subtree in-place |
| **Folder Card** | **Double Click** | Focuses subtree (zooms into folder) |
| **Vault Root** | **Click** | Clears focus back to Whole Vault |
| **Collapsed Folder** | **Visual Badge** | Displays `▸ EXPAND` orange pill on card edge |

### Contextual Node Links & Management Widget

Clicking any note card displays a floating popover widget featuring:
1. **Direct Mode Switcher**: `[ Structure | Links | Combined ]` buttons right inside the widget so you can switch graph modes with 1 click directly from the selected note.
2. **Outbound `[[Wikilinks]]`**: List of all notes linked from this document with 1-click jump buttons.
3. **Inbound Backlinks**: List of all notes linking to this document with 1-click jump buttons.
4. **Editor Action**: Quick `Open Note in Editor` button.

## Modules & File Mapping

- `src/lib/structureGraph.ts`: Graph model builder supporting `StructureEdgeKind.Hierarchy` and `StructureEdgeKind.Wikilink` edges + Left-to-Right placement math.
- `src/lib/structureDraw.ts`: D3 SVG renderer for micro-cards, animated Bezier strands, and arrow markers (`#struct-arrow`, `#wikilink-arrow`).
- `src/components/StructureView.vue`: Master graph component housing canvas backdrop, search, layer mode selector, and zoom controls.
