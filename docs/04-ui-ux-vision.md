# BioSimCanvas — UI/UX Vision

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial draft — to be reviewed in the next lab meeting | Project lead | TBD |

This document is the **frontend visual definition** for BioSimCanvas:
the design language, screen anatomy, key interactions, and the
research-derived design principles. It is intentionally
implementation-agnostic; UI tech choices live in
[`05-system-architecture.md`](05-system-architecture.md).

## 1. Design Principles

1. **Meeting-first.** The default visual state must read at
   projector / screen-share scale. Type sizes, hit targets, and
   color contrasts assume *people three meters from a screen*,
   not one researcher squinting at a laptop.
2. **Show the system, not the syntax.** Subsystem boundaries,
   resource flows, and crew presence are first-class visuals.
   XML is an escape hatch, not a primary view.
3. **One canvas, many lenses.** Schematic / spatial / timeline
   are *views of the same model*, switched in place rather than
   opened as separate windows. Selections persist across views.
4. **Direct manipulation wherever possible.** Drag to place,
   drag to connect, drag to schedule. Forms are for *attributes
   of a thing already on the canvas*, not for creating things.
5. **Soft fences, not hard walls.** Validation surfaces as
   warnings the user can understand and override; it does not
   gate the meeting flow.
6. **Quiet defaults.** A freshly opened template should look
   organized, not noisy. Color is meaningful; ornament is rare.

## 2. Personas (operational summary)

Full background is in [`00-stakeholders.md`](00-stakeholders.md).

- **Driver** — the project lead. Power user. Knows the BioSim
  schema. Uses every view and every keyboard shortcut.
- **Reviewer** — lab director and lab mates. Reads more than
  writes. Sometimes proposes edits verbally.
- **Recipient** — TRACLabs. Never opens BioSimCanvas; consumes
  the `.biosim` files it emits.

The UI is optimized for **Driver-in-meeting** first, **Driver
solo** second, **Reviewer-watching** third.

## 3. Information Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ App bar:  BioSimCanvas | <config name>     [Open] [Save] [⚙]    │
├──────────┬───────────────────────────────────────────┬───────────┤
│          │                                           │           │
│ Palette  │           Canvas area                     │ Side      │
│ (left)   │   (schematic | spatial | timeline | XML)  │ panel     │
│          │                                           │ (right)   │
│          │                                           │           │
├──────────┴───────────────────────────────────────────┴───────────┤
│ Status bar:  <selection summary> | warnings: N | export ▶        │
└──────────────────────────────────────────────────────────────────┘
```

Three columns:

- **Left — Module palette.** Categorized list (Environment, Air,
  Water, Power, Food, Waste, Crew, Framework, Sensors). Drag
  source for placing new modules. Collapsible groups.
- **Center — Canvas area.** Tab-style view switcher at the top:
  *Schematic | Spatial | Timeline | XML*. The active view fills
  the column. View state (zoom, scroll, selection) is preserved
  per view.
- **Right — Side panel.** Inspector for the current selection.
  Always visible (collapsible only on small windows). Sections
  are typed by the selected element kind (module, edge, crew
  member, sensor, malfunction).

Bottom **status bar** is the persistent home of validation:
total warnings count, jump-to-warning, and the **Export** button.

## 4. Views

### 4.1 Schematic view (primary)

Node-link graph using a layered layout, with **subsystem lanes**
or **swimlanes** to group related modules:

- *Environment lane*: `SimEnvironment`, `Fan`, `Dehumidifier`.
- *Air lane*: `NitrogenStore`, `VCCR`, `OGS`, `O2Store`,
  `H2Store`, `CO2Store`.
- *Water lane*: `WaterRS`, `Dirty/Grey/PotableWaterStore`.
- *Power lane*: `PowerStore`, `PowerPS`.
- *Food lane*: `FoodStore`.
- *Waste lane*: `DryWasteStore`.
- *Framework lane*: `Injector`.
- *Crew lane*: `CrewGroup` (expandable to show `crewPerson`s).
- *Sensors* attached to environments are shown as small badges
  on the environment node, expanded in the side panel.

**Edge styling** encodes resource type:

- air — light blue (solid line),
- water — blue (dashed),
- power — yellow (solid, thicker),
- gases (O₂ / CO₂ / H₂ / N₂) — distinct hues with a small icon
  on the edge,
- biomass / food — green,
- waste — gray.

Direction is shown with arrowheads at the consumer end.
Hovering an edge highlights both endpoints; clicking an edge
opens its producer/consumer parameters in the side panel.

### 4.2 Spatial view

A separate informational canvas where the user places module
icons at arbitrary 2D positions. No grid by default; an optional
snap grid. Edges are *not* shown in the spatial view (kept clean
on purpose); only modules and crew. Volume rectangles **MAY**
be drawn around modules to communicate "this is IHab", "this is
HALO" but are decorative.

**Important:** the spatial view does **not** affect simulation
values. This is a deliberate v1 simplification (see
[F-VIEW-2](03-requirements.md#f-view-2--spatial-view)).

### 4.3 Timeline view

Horizontal time axis (ticks). The default range spans the
configured `runTillN` or a sensible default if unset.

- Top section: crew schedules. One **lane per `crewPerson`**;
  blocks colored by activity (`sleep`, `excercise`,
  `ruminating`, etc.). Drag-resize to change durations; drag-
  drop a new activity from a small activity palette.
- Bottom section: malfunctions. One **lane per affected
  module**, lazily added when a malfunction is placed. Each
  malfunction is rendered as a marker with intensity and length
  encoded (color + length-of-bar).
- A vertical scrub line shows "now" for visual orientation
  only (no live simulation in v1).

### 4.4 XML expert view

Pretty-printed XML with syntax highlighting. Read-only by
default; an "Edit" toggle enables a Monaco-style editor. On
exiting edit mode the XML is re-parsed; errors keep the user
in the editor with markers.

### 4.5 Export review modal

Triggered by the **Export** button. Shows:

- Schema validation results (errors and warnings).
- Referential integrity check.
- Name uniqueness check.
- Crew schedule sum check.
- Sensor alarm monotonicity check.

Each row has a *jump to element* link. Warnings are
overridable; overrides are persisted in the file via a
`<biosim-canvas:overrides>` extension (per [F-EXPORT-3](03-requirements.md#f-export-3--soft-warning-override)).

## 5. Visual Design Tokens (initial)

Concrete tokens are a starting point only; refine as the design
matures.

### Colors (semantic)

| Token | Hex (placeholder) | Use |
|-------|-------------------|-----|
| `--bg` | `#0f1115` | App background |
| `--surface` | `#171a21` | Panels, palette, side panel |
| `--surface-2` | `#1f2330` | Cards, selected rows |
| `--text` | `#e6e8ee` | Primary text |
| `--text-muted` | `#9aa1b1` | Secondary text |
| `--accent` | `#5da9ff` | Primary interaction, focus |
| `--ok` | `#56c596` | Validation pass |
| `--warn` | `#e6c054` | Soft warnings |
| `--err` | `#e3635a` | Validation errors |
| `--air` | `#7fc8f7` | Air flow edges |
| `--water` | `#3a82d8` | Water flow edges |
| `--power` | `#f0c34a` | Power flow edges |
| `--o2` | `#9fe07f` | O₂ edges |
| `--co2` | `#c79bff` | CO₂ edges |
| `--food` | `#7fd1a3` | Food/biomass edges |
| `--waste` | `#a8a8a8` | Waste edges |

A **light theme** with equivalent semantic tokens is a
non-goal for v1 but easy to add later because tokens are
indirected.

### Typography

- UI: a humanist sans (e.g. Inter / IBM Plex Sans). Base 14 px;
  16 px in palette and side-panel labels.
- Monospace (XML view, numeric inputs): JetBrains Mono / Fira
  Mono. Base 13 px.

### Spacing

8 px base unit. Container padding: 16 px. Form rows: 8 px
vertical rhythm. Canvas safety margin: 24 px.

### Iconography

- Subsystem icons mirror the BioSim users-manual diagrams
  where possible (gear for VCCR/OGS, water drop for water, fan
  for fans, person silhouette for crew). Concrete icon set
  selection is **TBD**.

## 6. Key Interactions (storyboards)

These short storyboards are written to be testable.

### 6.1 "Place and wire OGS" (SCN-3 fragment)

1. Driver clicks **Air** group in the palette → drags **OGS**
   onto the schematic.
2. OGS appears in the air lane with default name `OGS_1`,
   default ports (power, potable water, O₂, H₂) shown as small
   dots at the node's edges.
3. Driver clicks the OGS name → inline rename to `OGS`. Side
   panel updates instantly.
4. Driver drags from OGS's `powerConsumer` port to
   `General_Power_Store`'s power port. The edge snaps in; on
   release, default `desiredFlowRates` / `maxFlowRates` are
   populated from the schema defaults.
5. Driver drags from OGS's `O2Producer` port to `O2_Store`'s
   O₂ port. Same flow.
6. The status bar shows "0 warnings".

### 6.2 "Schedule an OGS malfunction at tick 5000" (SCN-2/SCN-4 fragment)

1. Driver switches to **Timeline view**.
2. Drags a **MEDIUM / TEMPORARY** malfunction chip from the
   timeline's malfunction palette onto the `OGS` lane at tick
   5000.
3. Side panel opens showing `intensity`, `length`,
   `tickToOccur` (= 5000), all editable.
4. Driver toggles the **Schematic** tab. The OGS node now has
   a small *⚠ at tick 5000* badge; hovering shows the same
   data.
5. Export review panel summarizes: "1 malfunction scheduled
   (OGS, MEDIUM_MALF, TEMPORARY_MALF, tick 5000)".

### 6.3 "Lab director points at a node and asks a question" (SCN-1)

1. Driver clicks the `Main_VCCR` node on the schematic.
2. The node highlights; all edges incident to it are
   emphasized; non-incident edges desaturate.
3. The side panel shows the VCCR's flows: from which power
   store, from which environment, producing CO₂ where, etc.
   Each is a clickable jump to that module.
4. Lab director gets her answer; Driver clicks empty canvas
   to deselect.

## 7. Accessibility & Internationalization

- All actions performable with the mouse **MUST** also be
  performable with the keyboard. Focus indicators are visible
  on dark backgrounds.
- Color is **never the only encoder** of meaning. Resource
  edges also carry an icon at the consumer end; sensor alarm
  bands also carry text labels.
- Strings are centralized for future translation; v1 ships
  English only.

## 8. Open Items

- **OPEN:** Concrete icon set (Lucide / Phosphor / Material
  symbols) and license alignment.
- **OPEN:** Initial color palette is a draft; run a contrast
  check and adjust.
- **OPEN:** Decide whether to support a *light theme* for
  printing / paper-friendly screenshots in v-next.
- **OPEN:** Snapshot-to-PNG / print-to-PDF affordance for
  slides (see ConOps open item).
- **OPEN:** "Read mode" preset (auto-hides palette and side
  panel) for when the meeting transitions from authoring to
  pure review. Cheap to add; worth confirming desire.
