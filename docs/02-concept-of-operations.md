# BioSimCanvas — Concept of Operations (ConOps)

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial draft — to be reviewed in the next lab meeting | Project lead | TBD |

This document describes **how BioSimCanvas is used** — who does what,
when, with what — so the requirements that follow have a concrete
operational target. It does not prescribe internal architecture; see
[`05-system-architecture.md`](05-system-architecture.md) for that.

## 1. Operating Context

- **Setting**: a lab meeting room, projector / shared screen, the
  project lead driving on a laptop. Optionally a remote variant
  with screen-sharing over video conference. Sometimes a solo
  authoring session at a desk.
- **Network**: not required. BioSimCanvas is a static SPA that
  works offline once loaded.
- **Inputs**: BioSim XSDs (bundled at build time) and `.biosim`
  files from the user's filesystem.
- **Outputs**: `.biosim` files saved back to the user's
  filesystem. (And, indirectly, decisions / agreements recorded
  during the meeting.)
- **External systems**: BioSim runs *somewhere else* (a local
  Docker, a lab server, a researcher's machine). BioSimCanvas
  does not talk to it in v1.

## 2. User Roles

Mirrors the stakeholder register
([00-stakeholders.md](00-stakeholders.md)) but expressed as roles
in operation, not as people.

| Role | In a meeting | At a desk |
|------|--------------|-----------|
| **Driver** | Operates BioSimCanvas live; makes edits as the group decides. Almost always the project lead in v1. | Authors / refines configs solo. |
| **Reviewer** | Reads the canvas, asks questions, proposes changes verbally. Lab director, lab mates. | Opens a `.biosim` shared by the Driver to inspect it. |
| **Recipient** | BioSim maintainers at TRACLabs receive `.biosim` files as artifacts of meetings; they do not need to run BioSimCanvas. | Same. |

## 3. Primary Operational Scenarios

Each scenario is a concrete user journey we expect to support in
v1. They are the basis for acceptance tests. Specific journeys
beyond these are still **OPEN** (see §6).

### SCN-1 — "Review the current habitat in a meeting" *(supports O-3)*

1. The Driver opens BioSimCanvas in a browser.
2. They open `template.biosim` (the current IHab + HALO baseline)
   from the local filesystem.
3. The **schematic view** renders the full habitat: two
   environments (IHab, HALO), the inter-environment fans, the air
   subsystem (VCCR, OGS, gas stores), the water loop, power, food,
   waste, and the crew group with its two members. The Reviewer
   can see, at a glance:
   - which modules belong to which subsystem (visually grouped
     and color-coded),
   - which modules feed which other modules (directed flow edges,
     colored by resource type — air, water, power, etc.),
   - where the crew is placed and what their schedule looks like
     (in the **timeline view**).
4. The Reviewer asks questions ("what feeds the dehumidifier?",
   "where is potable water produced?"). The Driver answers by
   highlighting the relevant nodes/edges; no XML is opened.
5. Meeting ends. No edits are saved. (Read-only review.)

**Success**: the meeting happens without anyone reading XML.

### SCN-2 — "Adjust a habitat live and export" *(supports O-1, O-2, O-4)*

1. As in SCN-1, the Driver opens an existing config.
2. The group decides to add a third crew member. The Driver
   selects the `IHab_Group` crew node, clicks **Add crew person**,
   fills the side-panel form (name, age, sex, weight), and
   re-uses the default activity schedule.
3. The group decides the OGS power consumption should be
   re-tuned. The Driver clicks the OGS node; the side panel
   shows its power consumer with `desiredFlowRates` and
   `maxFlowRates`. They edit values; the canvas reflects the new
   numbers on hover.
4. The group decides to seed an O₂ store malfunction at tick 5000.
   The Driver opens the **timeline view**, drags a malfunction
   marker onto `O2_Store` at tick 5000, picks intensity
   `MEDIUM_MALF` and length `TEMPORARY_MALF`.
5. The Driver hits **Export**. The schema-fidelity guard
   ([O-4](01-needs-goals-objectives.md#o-4-schema-fidelity-guard-supports-g-3-g-5))
   shows a clean report (or surfaces fixable warnings). The
   Driver confirms and saves a new `.biosim` to the filesystem.
6. After the meeting, the Driver runs the file in BioSim; it
   loads and runs without manual editing.

**Success**: a meeting decision becomes a runnable artifact in
the same meeting.

### SCN-3 — "Author a new habitat from scratch" *(supports O-2)*

1. The Driver starts from the **"Empty / Minimal" template** (a
   `Globals` block + a single `SimEnvironment`).
2. They drag modules from a categorized **palette** onto the
   canvas: an OGS, an O₂ store, an H₂ store, a power store, a
   crew group with one crew person, and the few sensors needed.
3. They wire producer/consumer connections by dragging from
   output ports to input ports of the same resource type.
   Type-incompatible drops are rejected with a clear inline
   message.
4. Names default to `<ModuleType>_<n>` and are renamable in
   place. Renaming a module updates every reference to it
   (this is one of the explicit pain points fixed vs. hand
   editing XML).
5. The Driver exports a `.biosim`. They aim for a result similar
   to `lunar/minihab.biosim`. The acceptance target for v1
   ([O-2](01-needs-goals-objectives.md#o-2-author-the-second-baseline-from-scratch-supports-g-2))
   is: <30 minutes for the project lead, <60 minutes for a lab
   mate after a 5-minute walkthrough.

**Success**: a useful habitat is producible without ever
opening the XML view.

### SCN-4 — "Take a baseline and inject an anomaly drill" *(supports O-1, O-2)*

This is the *ops/training engineer* pattern, performed in v1 by
the project lead emulating that role.

1. Open `lunar/minihab.biosim` (template loaded from the
   palette's "lunar minihab" entry, which is bundled into the
   SPA).
2. Open the **timeline view**.
3. Add a sequence of malfunctions on different modules at
   different ticks ("at tick 1000, OGS goes into MEDIUM /
   TEMPORARY; at tick 4000, the main VCCR goes into SEVERE /
   PERMANENT"). Each is dropped on the timeline lane for its
   module.
4. Optionally adjust crew schedules to model fatigue (replace
   `excercise` with `sleep` for the affected days; v1 is one
   24-hour cycle so this is a same-cycle change).
5. Export to `lunar_minihab_drill_001.biosim`.

**Success**: scenario authoring is a timeline activity, not a
text-editing activity.

### SCN-5 — "Share a `.biosim` with TRACLabs" *(supports G-5)*

1. The Driver finishes a scenario in BioSimCanvas and exports a
   `.biosim`.
2. They send the file to TRACLabs by their usual channel
   (email, GitHub, etc.). TRACLabs does **not** need
   BioSimCanvas to consume it — they get a normal `.biosim`.
3. Optionally the Driver also takes a screenshot of the
   schematic view to attach to the message ("here is what we
   are running"). v1 does not need a built-in export-as-PNG
   feature; OS-level screenshots are acceptable.

**Success**: BioSimCanvas's output is indistinguishable, to
TRACLabs, from a hand-authored `.biosim`.

## 4. Operational Modes & Views

BioSimCanvas v1 organizes the workspace into the following
coordinated views. The driver switches among them via tabs / a
view switcher.

1. **Schematic view (primary).** Node-link graph of modules and
   resource flows. Subsystem grouping by color and lane
   (environment / air / water / power / food / waste / crew /
   framework). Producer/consumer ports typed by resource.
2. **Spatial view.** Informational only. The driver places
   module icons on a separate 2D canvas to communicate intent
   ("this is IHab, this is HALO, these are connected"). Does
   not affect simulation values.
3. **Timeline view.** Horizontal time axis (ticks). One lane
   per crew member showing their 24-hour activity schedule.
   One lane per module that has a scheduled malfunction.
4. **Properties side panel.** Always-visible inspector for the
   currently selected node, edge, crew member, or malfunction.
5. **XML expert view.** Read-only by default; pretty-printed
   serialization of the current model. Toggleable to read-write
   for power users — but the canonical model lives in the GUI
   state, and XML edits round-trip through a re-parse.
6. **Export review panel.** Shown on export. Lists schema
   warnings, broken references, name collisions, and crew
   schedule issues. The user may override and proceed.

## 5. Lifecycle of a Configuration

```
        ┌──────────────────────────────┐
        │  Open: from template, from   │
        │  filesystem (.biosim), or    │
        │  start blank                 │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Edit (schematic /           │
        │  spatial / timeline /        │
        │  side panel / XML)           │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Review (schema-fidelity     │
        │  guard surfaces warnings)    │
        └──────────────┬───────────────┘
                       │ (optionally override)
                       ▼
        ┌──────────────────────────────┐
        │  Export .biosim → user's     │
        │  filesystem                  │
        └──────────────────────────────┘
```

There is **no server state**. A session ends when the tab is
closed; reopening requires re-loading from the filesystem.

## 6. Open Questions (ConOps-level)

- **OPEN:** Top-3 *named* user journeys the lab director wants to
  see demoed for v1 sign-off (placeholder: SCN-1, SCN-2, SCN-3).
- **OPEN:** Do we need an "undo / redo" stack on the canvas (almost
  certainly yes, but at what granularity — per-edit, per-node,
  per-tab)? Affects requirements R-EDIT-*.
- **OPEN:** Do we need session auto-save to browser storage to
  recover from accidental tab closes during a meeting? It is a
  cheap safety net but adds state. Recommend yes, behind a
  preference.
- **OPEN:** Should BioSimCanvas ship with `template.biosim` and
  `lunar/minihab.biosim` bundled (so the SPA is self-contained,
  no separate file uploads needed for first-time users), or
  always require the user to "Open" a file? Recommend bundled.
- **OPEN:** Screenshot / PDF export of the schematic view for use
  in slides — defer to v-next or include as a thin "browser
  print to PDF" affordance?
