# BioSimCanvas — Requirements

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial draft | Project lead | TBD |
| 0.2 (draft) | 2026-05-12 | Fixed malfunction schema (occursAtTick + 1-per-module); resolved NF-4 / NF-8 / NF-9 / F-VIEW-2 opens; flagged v1 acceptance journeys. To be reviewed at the next lab meeting (≈ T+8h). | Project lead | TBD |
| 0.3 (draft) | 2026-05-15 | Cycle 2 — added functional groups KNOWLEDGE (F-KNOW-*) and LLM (F-LLM-*); updated NF-10 for LLM API exception; resolved open items from v0.2; added NF-11. | Project lead | TBD |

## How to read this document

- Each requirement has an **ID**, a normative statement (using the
  RFC-2119-style verbs *MUST / SHOULD / MAY*), a **Trace** field
  pointing to the parent NGO objective(s) and/or ConOps scenario(s),
  and a **Verify** field describing how compliance is checked.
- Requirements are grouped by area: Functional (F-*) and
  Non-Functional (NF-*). Functional groups: `LOAD`, `MODEL`,
  `EDIT`, `VIEW`, `ANOMALY`, `EXPORT`, `TEMPLATE`, `KNOWLEDGE`,
  `LLM` (the last two added in v0.3).
- Open items are inline as **OPEN:** callouts.

## 1. Functional Requirements

### 1.1 Load (F-LOAD-*)

#### F-LOAD-1 — Open `.biosim` from local filesystem
The system **MUST** allow the user to open a `.biosim` file from
their local filesystem and load it into the canonical in-memory
model.
- **Trace**: [O-1](01-needs-goals-objectives.md#o-1-round-trip-the-existing-baseline-supports-g-1-g-3), [SCN-1](02-concept-of-operations.md#scn-1--review-the-current-habitat-in-a-meeting-supports-o-3).
- **Verify**: open `template.biosim` and `lunar/minihab.biosim`
  successfully; selected fields appear in the side panel.

#### F-LOAD-2 — Parse against BioSim XSD
The loader **MUST** parse the file against the BioSim XSD bundle
shipped with BioSimCanvas (`BiosimInitSchema.xsd` and its
includes) and report parse / validation errors with file
location.
- **Trace**: [O-1](01-needs-goals-objectives.md#o-1), [O-4](01-needs-goals-objectives.md#o-4-schema-fidelity-guard-supports-g-3-g-5).
- **Verify**: a deliberately broken XML produces an error panel
  with line/column and a human-readable explanation.

#### F-LOAD-3 — Recover from validation errors
The loader **SHOULD** load partially-valid files into the model
where possible, marking unrecognized or invalid elements but not
discarding their text content.
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals), pragmatism in meetings.
- **Verify**: removing a required attribute on one module still
  loads the rest; the broken module shows an error badge.

#### F-LOAD-4 — Bundled templates
The system **MUST** offer at least the following templates from
within the SPA, without requiring an external file:
- "Empty / Minimal" (one `SimEnvironment` + `Globals`),
- `template.biosim` (IHab + HALO baseline),
- `lunar/minihab.biosim` equivalent.
- **Trace**: [O-2](01-needs-goals-objectives.md#o-2-author-the-second-baseline-from-scratch-supports-g-2), [SCN-3](02-concept-of-operations.md#scn-3--author-a-new-habitat-from-scratch-supports-o-2), [SCN-4](02-concept-of-operations.md#scn-4--take-a-baseline-and-inject-an-anomaly-drill-supports-o-1-o-2).
- **Verify**: each template can be opened from the UI and
  matches its source file semantically after round-trip.

### 1.2 Domain Model (F-MODEL-*)

#### F-MODEL-1 — Canonical in-memory model
The system **MUST** maintain a single canonical in-memory model
covering every element BioSimCanvas can author. The model is the
source of truth; views are projections of it.
- **Trace**: [G-3](01-needs-goals-objectives.md#3-goals), [G-4](01-needs-goals-objectives.md#3-goals).
- **Verify**: any edit in any view is reflected in every other
  view within one frame.

#### F-MODEL-2 — Supported BioSim modules (v1 scope)
The model **MUST** support, at minimum, the module families used
by `template.biosim` and `lunar/minihab.biosim`:
- `Globals`,
- Environment: `SimEnvironment`, `Dehumidifier`, `Fan`,
- Air: `NitrogenStore`, `VCCR`, `OGS`, `O2Store`, `H2Store`,
  `CO2Store`,
- Framework: `Injector`,
- Water: `WaterRS`, `DirtyWaterStore`, `GreyWaterStore`,
  `PotableWaterStore`,
- Power: `PowerStore`, `PowerPS`,
- Food: `FoodStore`,
- Waste: `DryWasteStore`,
- Crew: `CrewGroup`, `crewPerson`, `schedule`/`activity`,
- Sensors: `GasPressureSensor`, `GasConcentrationSensor`,
  `TotalPressureSensor`, with alarm bands and noise filter
  attributes preserved.
- **Trace**: [O-1](01-needs-goals-objectives.md#o-1), [O-2](01-needs-goals-objectives.md#o-2).
- **Verify**: both target configs round-trip without loss for
  these element types.

#### F-MODEL-3 — Pass-through for unsupported elements
The model **MUST** preserve any element or attribute it does not
explicitly understand, round-tripping it untouched on export.
- **Trace**: [G-3](01-needs-goals-objectives.md#3-goals).
- **Verify**: introduce an element BioSimCanvas does not know
  about; export still contains it.

#### F-MODEL-4 — Cross-reference graph
The model **MUST** maintain typed references between
producers/consumers and their target stores/environments. A
rename of a referenced module **MUST** propagate to all
references.
- **Trace**: [O-2](01-needs-goals-objectives.md#o-2), [SCN-3](02-concept-of-operations.md#scn-3--author-a-new-habitat-from-scratch-supports-o-2).
- **Verify**: rename `IHab` to `IHab_v2`; every producer/consumer
  using it updates; export passes referential check.

### 1.3 Editing (F-EDIT-*)

#### F-EDIT-1 — Drag-and-drop module placement
The system **MUST** allow placing a module on the schematic
canvas by dragging from a categorized **palette**.
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals), [SCN-3](02-concept-of-operations.md#scn-3).
- **Verify**: drag every supported module type from the palette;
  it appears with sensible defaults and a unique auto-generated
  name.

#### F-EDIT-2 — Connect producers to consumers by drag-link
The system **MUST** allow connecting an output port to a
compatible input port by drag-and-drop. Type-incompatible
connections **MUST** be rejected with an inline message.
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals), [SCN-3](02-concept-of-operations.md#scn-3).
- **Verify**: try connecting `airProducer` to a `powerConsumer` —
  rejected. Try `airProducer` → `SimEnvironment` air input —
  accepted.

#### F-EDIT-3 — Side-panel property editor
For any selected node, edge, crew member, sensor, or
malfunction, the system **MUST** present a side-panel form with
all editable attributes typed appropriately (number, enum,
string, etc.) and validated on edit.
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals), [SCN-2](02-concept-of-operations.md#scn-2--adjust-a-habitat-live-and-export-supports-o-1-o-2-o-4).
- **Verify**: every supported element has every BioSim-declared
  attribute exposed in the side panel.

#### F-EDIT-4 — Rename with reference propagation
Renaming any module via the side panel **MUST** update every
reference to it across the model. The user **SHOULD** see a
confirmation summarizing how many references will be updated.
- **Trace**: [F-MODEL-4](#f-model-4--cross-reference-graph).
- **Verify**: see F-MODEL-4.

#### F-EDIT-5 — Undo / Redo
The system **SHOULD** maintain an undo/redo stack of model
mutations, with at least 50 steps and keyboard shortcuts.
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals); ConOps
  open item on undo/redo.
- **Verify**: perform 50 edits, undo all, redo all; model
  matches original then final state respectively.
- **OPEN:** confirm scope (per-edit vs per-node).

#### F-EDIT-6 — Session autosave (preference)
The system **MAY** auto-save the current model to browser
storage (e.g. IndexedDB / `localStorage`) on a debounce so an
accidental tab close during a meeting can be recovered.
- **Trace**: ConOps open item.
- **Verify**: close and reopen the tab; user is offered to
  resume the previous session.

### 1.4 Views (F-VIEW-*)

#### F-VIEW-1 — Schematic view (primary)
The system **MUST** render a node-link schematic of the loaded
model with:
- modules visually grouped by subsystem (environment / air /
  water / power / food / waste / crew / framework),
- directed flow edges colored / styled by resource type,
- module names and key parameters legible at the default zoom,
- pan and zoom.
- **Trace**: [O-3](01-needs-goals-objectives.md#o-3-communicate-a-habitat-in-one-screen-supports-g-1), [SCN-1](02-concept-of-operations.md#scn-1).
- **Verify**: `template.biosim` schematic fits a 1080p display
  at default zoom; non-BioSim lab mates answer the five-question
  comprehension check (see O-3) within five minutes.

#### F-VIEW-2 — Spatial view
The system **MUST** offer a separate spatial canvas where
modules can be placed at arbitrary 2D positions for
communication purposes. The spatial layout **MUST NOT** affect
exported simulation values.

Spatial coordinates **MUST** be persisted to a **sidecar JSON
file** next to the `.biosim` (e.g. `foo.biosim` +
`foo.biosim.canvas.json`), not inside the `.biosim` itself.
This keeps the `.biosim` semantically pure for TRACLabs and
avoids round-trip issues with their tooling. If the sidecar is
absent on load, the system **SHOULD** auto-layout the spatial
view from defaults.
- **Trace**: [O-5](01-needs-goals-objectives.md#o-5-bounded-simplicity-supports-g-4) (simpler view), [G-5](01-needs-goals-objectives.md#3-goals), [SCN-1](02-concept-of-operations.md#scn-1).
- **Verify**: move modules in the spatial view, export; the
  `.biosim` is byte-for-byte unaffected by the spatial layout
  changes; the sidecar file reflects them.

#### F-VIEW-3 — Timeline view
The system **MUST** offer a timeline view that shows:
- each crew member's 24-hour activity schedule, and
- scheduled malfunctions (per module, per tick).
The user **MUST** be able to add, move, and remove malfunction
markers and crew activities directly on the timeline.
- **Trace**: [SCN-2](02-concept-of-operations.md#scn-2), [SCN-4](02-concept-of-operations.md#scn-4).
- **Verify**: schedule a malfunction at tick 5000; the model
  reflects it; the export includes the corresponding
  configuration element.
- **Note (v0.2):** confirmed against `Framework.xsd` —
  `<malfunction>` is a valid `BioModuleType` child with
  `maxOccurs="1"`. Multiple malfunctions per module at runtime
  go through the REST endpoint and are out of scope for v1.
  See F-ANOMALY-1.

#### F-VIEW-4 — Properties side panel
A side panel **MUST** show the currently selected element's
editable attributes and **MUST** be visible alongside the
schematic, spatial, and timeline views (not modal).
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals).
- **Verify**: selecting any element shows it in the side panel
  without obscuring the canvas.

#### F-VIEW-5 — XML expert view
The system **MUST** provide a read-only pretty-printed XML view
of the current model. It **SHOULD** allow toggling to
read-write; on save, the textual XML is re-parsed back into the
canonical model and any errors are surfaced.
- **Trace**: [O-1](01-needs-goals-objectives.md#o-1), expert
  escape hatch.
- **Verify**: a small XML edit in the expert view is reflected
  in the schematic view after save; an invalid edit shows
  errors and does not corrupt the model.

### 1.5 Anomaly Scenarios (F-ANOMALY-*)

#### F-ANOMALY-1 — Config-time malfunction authoring
The system **MUST** allow the user to author **at most one**
config-time malfunction per `BioModule`, with:
- `intensity` ∈ {`SEVERE_MALF`, `MEDIUM_MALF`, `LOW_MALF`},
- `length` ∈ {`TEMPORARY_MALF`, `PERMANENT_MALF`},
- `occursAtTick` (non-negative integer).

These map to the `<malfunction>` child element defined by
`Framework.xsd` (`maxOccurs="1"`).

Adding multiple malfunctions on the same module at different
ticks is **out of scope for v1** — BioSim supports this only
via the REST malfunction endpoint at runtime, not in the
`.biosim` config. The timeline UI **MUST** prevent a second
config-time malfunction on the same module and **SHOULD**
explain why.
- **Trace**: [SCN-2](02-concept-of-operations.md#scn-2), [SCN-4](02-concept-of-operations.md#scn-4),
  BioSim `etc/schema/framework/Framework.xsd` `MalfunctionType`.
- **Verify**: a malfunction created on the OGS via the timeline
  appears in the model and exports as
  `<malfunction intensity="MEDIUM_MALF" length="TEMPORARY_MALF"
  occursAtTick="5000"/>` inside the OGS element. Attempting to
  add a second malfunction to the same module is blocked with a
  message.

#### F-ANOMALY-2 — Crew schedule authoring
The system **MUST** allow the user to compose a 24-hour
activity schedule per `crewPerson` from BioSim's activity
vocabulary (`sleep`, `excercise`, `ruminating`, …), with
intensity and length per activity. The schedule **MUST** sum to
24 hours; the validator **MUST** warn (not block) when it does
not.
- **Trace**: [SCN-2](02-concept-of-operations.md#scn-2), [O-4](01-needs-goals-objectives.md#o-4-schema-fidelity-guard-supports-g-3-g-5).
- **Verify**: edit a crew member's schedule; the timeline view
  reflects it; a schedule that sums to 23 hours shows a
  warning in the export review panel.

#### F-ANOMALY-3 — Sensor & alarm authoring
The system **MUST** allow the user to add/remove sensors on
environments and to author their alarm bands (`warning_high`,
`critical_high`, `warning_low`, `critical_low`) and noise
filter parameters. Bands **MUST** be checked for monotonicity;
inconsistencies surface as warnings.
- **Trace**: [O-4](01-needs-goals-objectives.md#o-4); the
  template's sensors are an explicit v1 target.
- **Verify**: clone `template.biosim`'s sensor block; modify a
  band; non-monotonic bands warn in the review panel.

### 1.6 Export (F-EXPORT-*)

#### F-EXPORT-1 — Save to local filesystem
The system **MUST** allow the user to save the current model as
a `.biosim` to the local filesystem.
- **Trace**: [O-5](01-needs-goals-objectives.md#o-5-bounded-simplicity-supports-g-4), [SCN-2](02-concept-of-operations.md#scn-2).
- **Verify**: save to a chosen path; file appears on disk; can
  be re-opened.

#### F-EXPORT-2 — XSD validation on export
On save, the system **MUST** validate the serialized XML
against the bundled BioSim XSDs and present results in the
**export review panel**. Errors and warnings **MUST** be human
readable and **SHOULD** include a "jump to element" affordance.
- **Trace**: [O-4](01-needs-goals-objectives.md#o-4-schema-fidelity-guard-supports-g-3-g-5).
- **Verify**: introduce a deliberate violation (e.g. unknown
  attribute); the export panel shows it.

#### F-EXPORT-3 — Soft-warning override
The user **MAY** override warnings and save anyway, recording
the overridden list in the file via a `<biosim-canvas:overrides>`
extension element (preserved on round-trip per F-MODEL-3).
- **Trace**: simpler-is-better preference; ConOps export gate.
- **Verify**: save with an overridden warning; reopen; the
  override appears in the review panel.

#### F-EXPORT-4 — Normalized formatting
The exported XML **MAY** differ in formatting from the input
(whitespace, attribute ordering, comment removal). It **MUST**
be semantically equivalent.
- **Trace**: [O-5](01-needs-goals-objectives.md#o-5) (simplicity).
- **Verify**: canonicalize input and output XML; compare;
  semantic equivalence holds.

### 1.7 Templates (F-TEMPLATE-*)

#### F-TEMPLATE-1 — Bundled v1 templates
The SPA **MUST** ship with the three v1 templates listed in
F-LOAD-4. Selection of a template seeds the model and the
schematic view.

#### F-TEMPLATE-2 — Save current as template (v-next)
The system **MAY** allow the user to save the current model as
a named local template.
- **DEFERRED-TO-vNEXT.**

### 1.8 Module Knowledge Base (F-KNOW-*) *(new in v0.3)*

#### F-KNOW-1 — Physics tooltip on hover
When the user hovers over a module node on the schematic canvas
or a module item in the palette, the system **MUST** display a
tooltip containing:
- a one-sentence functional summary of the module class,
- its resource ports (name, resource type, direction),
- a one-line note on malfunction behavior (e.g. "SEVERE_MALF
  disables output entirely").
- **Trace**: [O-6](01-needs-goals-objectives.md#o-6-module-transparency-supports-g-6),
  [SCN-6](02-concept-of-operations.md#scn-6).
- **Verify**: hover over OGS node and OGS palette item; both
  show tooltip with functional summary, ports, and malfunction
  note within 300 ms.

#### F-KNOW-2 — Module Encyclopedia panel
The system **MUST** provide a browsable "Module Encyclopedia"
panel accessible from the toolbar or from a "Learn more" link
in any module tooltip. The panel **MUST** include an entry for
every module type in the v1 catalog (F-MODEL-2), and each entry
**MUST** contain:
- module class name and subsystem grouping,
- class hierarchy position (e.g. `SimBioModule → OGS`),
- all configurable attributes with name, type, unit, and a
  plain-language description of what changing the value does,
- resource inputs and outputs (port name, resource type,
  directionality),
- malfunction behavior per intensity level (LOW / MEDIUM /
  SEVERE) and length (TEMPORARY / PERMANENT), derived from the
  BioSim Java source (commit `edb93e81`),
- a "hidden physics" note where runtime behavior is not
  derivable from the XML alone (e.g. WaterRS operational modes,
  VCCR's internal subsystem graph).
- **Trace**: [O-6](01-needs-goals-objectives.md#o-6),
  [SCN-6](02-concept-of-operations.md#scn-6).
- **Verify**: open the encyclopedia; navigate to WaterRS; entry
  describes four power-based operational modes. Navigate to
  Store; entry describes leak-rate behavior under malfunction.

#### F-KNOW-3 — Knowledge base is static / curated
The module knowledge base **MUST** be a static, curated data
file bundled with the SPA (e.g. a TypeScript constant or JSON
file). It is **not** generated at runtime from the BioSim
source code. The content is authored once per BioSim version
pin and updated when NF-8 (schema bundle drift) requires it.
- **Trace**: [NF-7](03-requirements.md#nf-7--footprint--maintainability)
  (simplicity), [NF-8](03-requirements.md#nf-8--schema-bundle-drift).
- **Verify**: no network request is made when opening the
  encyclopedia or any tooltip.

### 1.9 LLM Authoring Assistant (F-LLM-*) *(new in v0.3)*

#### F-LLM-1 — Toggleable chat sidebar
The system **MUST** provide a toggleable chat sidebar panel
(right-panel mode, alongside Properties and Encyclopedia) for
interaction with the LLM authoring assistant. The sidebar
**MUST** be openable and closable via a toolbar button and a
keyboard shortcut without losing conversation history within
the session.
- **Trace**: [O-7](01-needs-goals-objectives.md#o-7-llm-authoring-assistant-supports-g-7),
  [SCN-7](02-concept-of-operations.md#scn-7).
- **Verify**: toggle the sidebar open and closed three times;
  chat history persists; current canvas view is not obscured
  when sidebar is closed.

#### F-LLM-2 — Current configuration as agent context
Before each user message is sent to the LLM, the system
**MUST** serialize the current in-memory model to XML (using
the same emitter as F-EXPORT-1) and include it as context in
the request. The sidebar **SHOULD** display a brief indicator
("Context: current config — N modules") so the user knows
what the agent sees.
- **Trace**: [O-7](01-needs-goals-objectives.md#o-7),
  [SCN-7](02-concept-of-operations.md#scn-7).
- **Verify**: with a loaded config, open the LLM sidebar; the
  context indicator shows the correct module count; the agent
  can refer to specific module names already in the config.

#### F-LLM-3 — Config generation and rewrite
When the LLM response contains a complete valid `.biosim` XML
document (identified by the presence of the BioSim root
element), the system **MUST**:
1. parse the XML using the same parser as F-LOAD-1,
2. replace the current in-memory model with the parsed result,
3. re-render all active views (schematic, spatial, timeline),
4. show a transient notification ("Canvas updated from LLM
   response") with an **Undo** affordance.
- **Trace**: [O-7](01-needs-goals-objectives.md#o-7),
  [SCN-7](02-concept-of-operations.md#scn-7).
- **Verify**: send "Create a minimal lunar habitat"; canvas
  updates to show generated modules; undo reverts to prior
  state.

#### F-LLM-4 — Answer-only responses
When the LLM response does **not** contain a `.biosim` XML
document, the system **MUST** display the response as a chat
message only, with no canvas modification.
- **Trace**: [O-7](01-needs-goals-objectives.md#o-7).
- **Verify**: ask "What is the purpose of the OGS?"; canvas
  is unchanged; response appears in the chat panel.

#### F-LLM-5 — API key configuration
The LLM API key **MUST** be loaded from a `.env` file at the
repo root (variable name `VITE_OPENAI_API_KEY`). The `.env`
file **MUST NOT** be committed to version control (`.gitignore`
entry required). If the key is absent, the LLM sidebar **MUST**
display a clear setup instruction rather than failing silently.
- **Trace**: [NF-10](03-requirements.md#nf-10--privacy--data-handling).
- **Verify**: remove the key; sidebar shows "API key not
  configured — add VITE_OPENAI_API_KEY to .env".

#### F-LLM-6 — LLM agent uses latest agent-written config
The agent context passed in F-LLM-2 **MUST** always reflect
the current in-memory model, which is updated immediately when
the agent rewrites the config (F-LLM-3). Subsequent messages
in the same session therefore see the agent's own prior
outputs.
- **Trace**: [O-7](01-needs-goals-objectives.md#o-7).
- **Verify**: ask agent to generate a config; then ask it to
  "add a malfunction on the first OGS"; agent correctly
  identifies the OGS from its prior output and updates it.

## 2. Non-Functional Requirements

### NF-1 — Browser-only static SPA
The system **MUST** be deliverable as a static SPA with no
backend or database required for any v1 functionality.
- **Trace**: [O-5](01-needs-goals-objectives.md#o-5-bounded-simplicity-supports-g-4).
- **Verify**: served from `npm run dev` or any static host.

### NF-2 — Offline-capable after first load
The system **MUST** function offline once loaded.
- **Trace**: ConOps §1.
- **Verify**: load over network, disconnect, exercise SCN-2.

### NF-3 — Performance (meeting responsiveness)
For configurations up to the size of `lunar/minihab.biosim`
(~470 lines XML, ~40 modules), the following P95 latencies
**SHOULD** hold on a modern laptop (e.g. M-series Mac, recent
Intel ≥ 16 GB):
- model load: ≤ 1 s,
- single edit → visual feedback: ≤ 100 ms,
- export to `.biosim` + validation: ≤ 2 s.
- **Trace**: [G-2](01-needs-goals-objectives.md#3-goals).
- **Verify**: hand-timed during SCN-2 / SCN-4.

### NF-4 — Browser support
**Chromium (Chrome / Edge / Brave)** is the first-class target
and **MUST** be fully supported in v1. Firefox and Safari are
**best-effort**: the SPA **SHOULD** load and function, falling
back from the File System Access API to download/upload-style
I/O. Documented missing features on non-Chromium browsers are
acceptable as long as the v1 acceptance journeys (SCN-2,
SCN-3, SCN-4) work on Chromium.
- **Trace**: [O-5](01-needs-goals-objectives.md#o-5).
- **Resolved (v0.2).**

### NF-5 — Accessibility
Where it does not increase complexity disproportionately, the
system **SHOULD** follow common accessibility practices
(keyboard navigation, sufficient color contrast, ARIA labels
on the side panel forms). No formal WCAG conformance target
is set for v1.
- **OPEN:** confirm that no formal target is required.

### NF-6 — Internationalization
v1 is **English-only**. Strings **SHOULD** be centralized in a
single module to make later translation cheap, but no
multi-language UI is required.
- **DEFERRED-TO-vNEXT** for additional languages.

### NF-7 — Footprint & maintainability
The codebase **SHOULD** be small enough to be maintained by a
single researcher in spare time. Heuristics: ≤ ~15k LoC of
application code (excluding tests, generated bindings, and the
schema bundle), one framework, well-known canvas library.
- **Trace**: [O-5](01-needs-goals-objectives.md#o-5), [G-4](01-needs-goals-objectives.md#3-goals).

### NF-8 — Schema bundle drift
The bundled XSDs **MUST** match a specific BioSim version
(recorded in `package.json` / a constants file). On a BioSim
upstream change, BioSimCanvas **MUST** be updated and re-tested
against the new schemas; v1 does **not** support hot-swapping
schema versions.
- **Trace**: [G-5](01-needs-goals-objectives.md#3-goals).
- **Resolved (v0.2):** v1 pins to BioSim commit
  **`edb93e81`** (i.e. `v2.0.0-35-gedb93e81`,
  branch `main`, 2025-09-02 — matches the local
  `biosim-as-reference/` checkout). All bundled XSDs and
  example configs are taken from this commit.

### NF-9 — Licensing
BioSimCanvas is licensed under **MIT** (see [LICENSE](../LICENSE)).
The MIT terms apply to the BioSimCanvas source; the bundled
BioSim XSDs remain under BioSim's GPL-3.0 license and are
treated as data, not as source incorporated into BioSimCanvas.
- **Resolved (v0.2).**

### NF-10 — Privacy / data handling
The system **MUST NOT** transmit configurations off the user's
machine **except** for the single, user-initiated LLM API
request (F-LLM-2), which sends the current config XML to the
configured LLM provider. No analytics. No passive telemetry.
The user is aware of and initiates each LLM request explicitly
(by sending a chat message). ITAR/EAR: current content is
unclassified research; revisit if program scope changes.
- **Trace**: [G-4](01-needs-goals-objectives.md#3-goals),
  [O-7](01-needs-goals-objectives.md#o-7).

### NF-11 — LLM provider and model *(new in v0.3, updated v0.3.1)*
The v2 prototype targets the **OpenAI API** (model: `gpt-4o`).
The provider and model **SHOULD** be configurable via environment
variables so switching requires no code change. The system **MUST**
handle API errors (rate limit, key invalid, timeout) gracefully
and display the error in the chat panel rather than crashing.
- **Trace**: [F-LLM-5](03-requirements.md#f-llm-5--api-key-configuration).
- **Verify**: provide an invalid key; the sidebar shows the
  API error message without a JavaScript exception.

## 3. Traceability Matrix (rough)

The full matrix will be generated automatically once we wire
tests. The intended high-level mapping is:

| Objective | Primary requirements |
|-----------|----------------------|
| O-1 round-trip baseline | F-LOAD-1..4, F-MODEL-1..4, F-EXPORT-1..4 |
| O-2 author from scratch | F-EDIT-1..6, F-VIEW-1, F-VIEW-4, F-TEMPLATE-1, F-ANOMALY-* |
| O-3 communicate in one screen | F-VIEW-1, F-VIEW-2, F-VIEW-3, F-EDIT-3 |
| O-4 schema fidelity guard | F-LOAD-2, F-EXPORT-2..3, F-ANOMALY-2..3 |
| O-5 bounded simplicity | NF-1, NF-2, NF-7, NF-10 |
| O-6 module transparency | F-KNOW-1..3 |
| O-7 LLM authoring assistant | F-LLM-1..6, NF-11 |

## 4. Open Items (Requirements-level)

Resolved in v0.2:

- **RESOLVED (v0.2):** F-VIEW-2 — layout persisted as sidecar JSON.
- **RESOLVED (v0.2):** F-ANOMALY-1 — config-time malfunctions
  exist (Framework.xsd), max one per module; runtime
  malfunctions stay REST-only and out of scope for v1.
- **RESOLVED (v0.2):** NF-4 — Chromium first class.
- **RESOLVED (v0.2):** NF-8 — pin to BioSim commit `edb93e81`.
- **RESOLVED (v0.2):** NF-9 — MIT.

Resolved in v0.3:

- **RESOLVED (v0.3):** F-EDIT-5 undo granularity — per-edit,
  80-step limit. Implemented and confirmed in cycle 1.
- **RESOLVED (v0.3):** NF-5 accessibility — informal best-effort;
  no formal WCAG target for v1/v2.

Still open:

- **OPEN:** Define the five comprehension-check questions used
  to verify O-3 / F-VIEW-1 (non-BioSim lab mate usability test).
- **OPEN:** LLM context window strategy — for large configs
  (many modules), the serialized XML may approach token limits;
  decide whether to truncate, summarize, or chunk the context.
- **OPEN:** LLM system prompt content — BioSim domain knowledge
  to include in the system prompt for best agent behavior.
