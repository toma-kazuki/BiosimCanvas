# BioSimCanvas — Concept of Operations (ConOps)

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial draft | Project lead | TBD |
| 0.2 (draft) | 2026-05-12 | SCN-3, SCN-2, SCN-4 marked as v1 acceptance journeys. To be reviewed at the next lab meeting (≈ T+8h). | Project lead | TBD |
| 0.3 (draft) | 2026-05-15 | Cycle 2 — added SCN-6 (module transparency) and SCN-7 (LLM authoring assistant). Updated §4 Operational Modes to include LLM chat sidebar and module encyclopedia. Updated §5 lifecycle diagram. | Project lead | TBD |

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
v1. They are the basis for acceptance tests.

**v1 acceptance gates (selected v0.2):**

- **SCN-3** — author a new habitat from scratch,
- **SCN-2** — adjust a habitat live and export,
- **SCN-4** — take a baseline and inject an anomaly drill.

All three are authoring-heavy and exercise the full edit /
validate / export loop. SCN-1 (read-only review) and SCN-5
(share with TRACLabs) are supporting scenarios — they should
keep working but are *not* v1 gates and do not block release.

### SCN-1 — "Review the current habitat in a meeting" *(supports O-3)* — supporting, not a v1 gate

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

### SCN-2 — "Adjust a habitat live and export" *(supports O-1, O-2, O-4)* — **v1 acceptance gate**

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

### SCN-3 — "Author a new habitat from scratch" *(supports O-2)* — **v1 acceptance gate**

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

### SCN-4 — "Take a baseline and inject an anomaly drill" *(supports O-1, O-2)* — **v1 acceptance gate**

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

### SCN-6 — "Understand a module before wiring it" *(supports O-6, G-6)* — **cycle 2 acceptance gate** *(new in v0.3)*

This scenario captures the transparency use case that emerged from
the first lab meeting.

1. The Driver opens `template.biosim` and is in the **schematic
   view**.
2. A Reviewer asks: "What exactly does the OGS do, and what
   happens to it when power drops?"
3. The Driver hovers over the OGS node on the canvas. A **tooltip**
   appears showing a one-sentence functional summary ("Electrolyzes
   potable water into O₂ and H₂; requires power"), its resource
   ports (powerConsumer, potableWaterConsumer → O₂Producer,
   H₂Producer), and a note on malfunction behavior
   ("SEVERE_MALF disables output entirely").
4. The Reviewer asks to see the full module encyclopedia entry. The
   Driver opens the **Module Encyclopedia** panel. The OGS entry
   shows: class hierarchy (SimBioModule → OGS), all configurable
   attributes with units, stoichiometric note (2H₂O → 2H₂ + O₂),
   and malfunction intensity effects.
5. The Reviewer asks about WaterRS. The Driver navigates to it in
   the encyclopedia. The entry explains the four power-based
   operational modes (FULL / PARTIAL / GREY_WATER_ONLY / OFF) and
   how `desiredFlowRates` affects mode selection each tick.

**Success**: the Reviewer's question is answered without leaving the
tool or consulting any external document.

### SCN-7 — "Ask the LLM to generate a starter configuration" *(supports O-7, G-7)* — **cycle 2 acceptance gate** *(new in v0.3)*

1. The Driver opens BioSimCanvas to an empty template.
2. They toggle open the **LLM chat sidebar** (keyboard shortcut or
   toolbar button). The current canvas state (serialized as XML) is
   automatically included as context — the sidebar shows "Context:
   current config (empty template)".
3. The Driver types: "Create a minimal two-crew lunar habitat with
   closed air and water loops."
4. The LLM agent responds in the chat window with a brief
   explanation of its design decisions, and simultaneously outputs
   a new `.biosim` XML.
5. BioSimCanvas parses the XML and updates the canvas. The
   schematic view now shows the generated modules and connections.
6. The Driver inspects the result, asks a follow-up: "Add a
   malfunction on the OGS at tick 3000." The agent updates the
   XML accordingly; the timeline view reflects the new malfunction.
7. The Driver exports the final `.biosim`; it parses without errors.

**Success**: a plausible starting habitat is on the canvas after one
exchange; the configuration is editable through normal canvas
interactions afterward.

### SCN-5 — "Share a `.biosim` with TRACLabs" *(supports G-5)* — supporting, not a v1 gate

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

BioSimCanvas v2 organizes the workspace into the following
coordinated views and panels. The driver switches main views via
tabs; the side panels are independently toggleable.

1. **Schematic view (primary).** Node-link graph of modules and
   resource flows. Subsystem grouping by color and lane
   (environment / air / water / power / food / waste / crew /
   framework). Producer/consumer ports typed by resource. Module
   nodes and palette items now show **physics tooltips** on hover.
2. **Spatial view.** Informational only. The driver places
   module icons on a separate 2D canvas to communicate intent
   ("this is IHab, this is HALO, these are connected"). Does
   not affect simulation values.
3. **Timeline view.** Horizontal time axis (ticks). One lane
   per crew member showing their 24-hour activity schedule.
   One lane per module that has a scheduled malfunction.
4. **Properties side panel (right).** Inspector for the
   currently selected node, edge, crew member, or malfunction.
   Toggleable; shares the right panel slot with the Module
   Encyclopedia (see below).
5. **Module Encyclopedia panel (right).** *(new in v0.3)*
   Browsable reference for all v1 module types. Each entry
   shows: functional summary, class hierarchy, resource ports,
   configurable attributes with units, and malfunction behavior.
   Toggled in place of the Properties panel; accessible from
   the toolbar or by clicking "Learn more" in a tooltip.
6. **LLM chat sidebar (right).** *(new in v0.3)* Toggleable
   chat panel for the LLM authoring assistant. The three right-
   panel modes (Properties / Encyclopedia / LLM chat) share a
   single column and are switched via a tab strip at the top of
   the right panel. The current configuration (serialized XML)
   is automatically included as agent context on each send.
7. **Module palette (left).** Categorized drag source for new
   modules. Toggleable; collapsible groups. Each palette item
   shows a one-line physics summary tooltip on hover.
8. **XML expert view.** Read-only by default; pretty-printed
   serialization of the current model. Toggleable to read-write
   for power users — but the canonical model lives in the GUI
   state, and XML edits round-trip through a re-parse.
9. **Export review panel.** Shown on export. Lists schema
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
        ┌──────────────────────────────┐    ┌─────────────────────┐
        │  Edit (schematic /           │◀──▶│  LLM chat sidebar   │
        │  spatial / timeline /        │    │  (serialize model → │
        │  side panel / XML)           │    │   send to LLM →     │
        └──────────────┬───────────────┘    │   parse response →  │
                       │                    │   update canvas)    │
                       │                    └─────────────────────┘
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

There is **no server state** for the canvas model. The LLM
agent call is the one network request in v2; the API key is
loaded from a local `.env` file and never transmitted except to
the configured LLM provider. A session ends when the tab is
closed; reopening requires re-loading from the filesystem.

## 6. Open Questions (ConOps-level)

Resolved in v0.2:

- **RESOLVED (v0.2):** v1 acceptance journeys — **SCN-3, SCN-2,
  SCN-4**. SCN-1 and SCN-5 are supporting.

Resolved in v0.3:

- **RESOLVED (v0.3):** Undo/redo implemented as per-edit
  (80-step limit). Granularity confirmed acceptable.
- **RESOLVED (v0.3):** Session autosave to localStorage — yes,
  behind a preference toggle. Implemented in cycle 1.
- **RESOLVED (v0.3):** Templates bundled — yes, SPA ships with
  empty, IHab+HALO, lunar minihab, and anomaly demo templates.
- **RESOLVED (v0.3):** Cycle 2 acceptance journeys — **SCN-6**
  (module transparency) and **SCN-7** (LLM authoring assistant).

Still open:

- **OPEN:** Screenshot / PDF export of the schematic view for use
  in slides — defer to v-next or include as a thin "browser
  print to PDF" affordance?
- **OPEN:** Right-panel tab strip UX — three modes (Properties /
  Encyclopedia / LLM chat) share one column; confirm that a tab
  strip at the top of the right panel is the right affordance,
  or whether a separate toggle button per panel is clearer.
- **OPEN:** LLM agent system prompt content — exact BioSim
  domain context and constraints to include; to be iterated
  through use.
