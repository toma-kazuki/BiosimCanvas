# BioSimCanvas — Changelog

A running record of changes to the BioSimCanvas systems-engineering
document set. One entry per refinement. Code changes (when they
start) live in the standard git log; this file is for the *docs*.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## 0.3.1 — 2026-05-15 — LLM provider change: OpenAI gpt-4o

### Changed

- `docs/03-requirements.md`: NF-11 updated — provider is now
  **OpenAI** (`gpt-4o`); env var renamed to
  `VITE_OPENAI_API_KEY`. F-LLM-5 verify step updated to match.
- `docs/05-system-architecture.md`: §2.9 updated — SDK is now
  `openai` (OpenAI TypeScript SDK); Chat Completions API
  (`/v1/chat/completions`); env var `VITE_OPENAI_API_KEY`.
  Architectural diagram and resolved-items list updated.

### Decision

- **LLM provider**: **OpenAI `gpt-4o`** (was Anthropic Claude).
  No architectural impact — the request/response pattern
  (serialize XML → send → scan for XML in response → parse)
  is identical. Only the SDK and env var name change.

- GitHub repository renamed to **`BiosimCanvas`** (formerly
  `Biosim-config`). Root `README.md` documents the canonical HTTPS
  clone URL; **§3 Repository layout** in
  `docs/05-system-architecture.md` matches the flat tree (`app/` at
  repo root).

## 0.3.0 — 2026-05-15 — cycle 2 SE doc update (post-lab-meeting)

Second cycle of the SE document set, triggered by lab meeting
feedback. The prototype built in cycle 1 was well received; two
core gaps were identified: (1) module physics and class hierarchy
are opaque to non-BioSim users, and (2) no LLM-assisted authoring
capability exists. This pass captures the new goals, scenarios,
requirements, and architecture decisions needed to address both.

### Changed

- `docs/01-needs-goals-objectives.md` → v0.3:
  - Added **G-6** (module transparency) and **G-7** (LLM
    authoring assistant).
  - Added **O-6** (module transparency acceptance check) and
    **O-7** (LLM authoring acceptance check).
  - Extended non-goals: custom module creation is explicitly
    out of scope (BioSim modules are fixed Java classes); LLM
    visual diff deferred to v-next.
  - Extended success criteria with cycle-2 items (criteria 6
    and 7).
  - Resolved ITAR/EAR open item: content is unclassified
    research.

- `docs/02-concept-of-operations.md` → v0.3:
  - Added **SCN-6** ("Understand a module before wiring it") —
    cycle 2 acceptance gate for module transparency.
  - Added **SCN-7** ("Ask the LLM to generate a starter
    configuration") — cycle 2 acceptance gate for LLM
    authoring.
  - Updated §4 Operational Modes to describe the three-mode
    right panel (Properties / Encyclopedia / LLM chat) and
    the module palette tooltip.
  - Updated §5 lifecycle diagram to show LLM chat as a
    parallel edit path.
  - Resolved ConOps open items (undo granularity, autosave,
    bundled templates, cycle-2 acceptance journeys).

- `docs/03-requirements.md` → v0.3:
  - Added functional group **F-KNOW-*** (module knowledge
    base): F-KNOW-1 (physics tooltip), F-KNOW-2 (encyclopedia
    panel), F-KNOW-3 (static curated knowledge base).
  - Added functional group **F-LLM-*** (LLM authoring
    assistant): F-LLM-1 (toggleable sidebar), F-LLM-2
    (config as context), F-LLM-3 (config generation/rewrite),
    F-LLM-4 (answer-only responses), F-LLM-5 (API key config),
    F-LLM-6 (agent sees its own prior outputs).
  - Updated **NF-10** (privacy): LLM API call is the explicit
    exception to the no-off-machine-transmission rule.
  - Added **NF-11**: LLM provider (Anthropic Claude), model
    configurability, and graceful error handling.
  - Updated traceability matrix for O-6 and O-7.
  - Resolved F-EDIT-5 undo granularity (per-edit, 80 steps)
    and NF-5 accessibility (informal best-effort, no WCAG
    target).

- `docs/04-ui-ux-vision.md` → v0.3:
  - Added design principle 7 (Transparent Physics).
  - Updated §3 Information Architecture: right panel is now a
    three-mode column (Properties / Encyclopedia / Chat); left
    palette is toggleable; layout ASCII updated.
  - Added **§4.5 Module Encyclopedia panel** description.
  - Added **§4.6 LLM chat sidebar** description with layout
    ASCII and interaction rules.
  - Renamed old §4.5 → §4.7 Export review modal.
  - Added interaction storyboards **6.4** (reviewer asks about
    OGS, SCN-6 fragment) and **6.5** (agent drafts a habitat,
    SCN-7 fragment).
  - Added open items for right-panel tab strip UX and agent
    response formatting.

- `docs/05-system-architecture.md` → v0.3:
  - Updated §1 architectural diagram to include LLM adapter
    and Anthropic API as the one outbound network path.
  - Added **§2.9 LLM integration** (Anthropic Claude API,
    `@anthropic-ai/sdk`, request construction, response
    handling, security note).
  - Added **§4.6 LLM round-trip** (how emitter/parser are
    reused; undo integration).
  - Added **§4.7 Module knowledge base** (`moduleKnowledge.ts`
    static constant; shared by encyclopedia, tooltips, and
    optionally the LLM system prompt).
  - Updated §5 risks table: added four LLM-specific risks with
    mitigations; updated status of cycle-1 risks.
  - Resolved framework, XSD validation strategy, and repo
    layout open items (all confirmed by cycle 1 build).
  - Added LLM provider decision and two new open items (system
    prompt content; whether to include knowledge base in prompt).

### Decisions captured in this pass

- **Module transparency**: surface BioSim's fixed class
  hierarchy and per-module physics via in-app tooltips and a
  Module Encyclopedia panel. Do **not** imply custom module
  creation is possible.
- **LLM authoring**: Anthropic Claude API; key via `.env`;
  current config XML serialized and sent as context on each
  turn; LLM XML output round-trips through the existing
  parser/emitter; undo captures LLM-driven changes.
- **LLM interaction model**: user drives conversation;
  agent decides whether to answer only or answer + rewrite
  config; no structured "diff preview" in v2 prototype
  (deferred to v-next).
- **Right panel**: three modes (Properties / Encyclopedia /
  Chat) share one column, switched via tab strip.
- **ITAR/EAR**: no restriction on current content; resolved.

### Open items rolled forward

1. Five comprehension-check questions for O-3 / F-VIEW-1
   usability test.
2. LLM system prompt content (exact BioSim domain context and
   output-format instructions).
3. LLM context window strategy for large configs.
4. Right-panel tab strip vs. separate toggle buttons (UX
   confirmation).
5. Whether to include `moduleKnowledge.ts` in the LLM system
   prompt.

## 0.2.0 — 2026-05-12 — resolve v0.1 open items

A refinement pass that closes seven of the highest-priority open
items from v0.1 and ships an MIT `LICENSE` file. The SE doc set
remains a draft for review at the next lab meeting (≈ T+8h from
this revision).

### Added

- `LICENSE` (MIT) at the repository root.

### Changed

- `README.md`: license note now points to MIT `LICENSE`.
- `docs/00-stakeholders.md` → v0.2: revision-bump only; specific
  TRACLabs contact is still pending.
- `docs/01-needs-goals-objectives.md` → v0.2: deadline,
  license, and browser-support open items resolved (see
  *Decisions* below).
- `docs/02-concept-of-operations.md` → v0.2: SCN-3, SCN-2,
  SCN-4 explicitly marked as v1 acceptance gates; SCN-1 and
  SCN-5 explicitly marked as supporting (non-gate).
- `docs/03-requirements.md` → v0.2:
  - `F-ANOMALY-1` rewritten to match `Framework.xsd`
    `MalfunctionType` — corrects the attribute name to
    `occursAtTick` (the earlier draft used the REST
    parameter name `tickToOccur`) and adds the
    one-config-time-malfunction-per-module constraint.
    Multiple-malfunctions-per-module is REST-only and out
    of scope for v1.
  - `F-VIEW-2` updated: spatial layout persisted as
    **sidecar JSON** (`<basename>.biosim.canvas.json`)
    next to the `.biosim`, leaving the `.biosim` itself
    semantically pure.
  - `NF-4` (browsers) resolved: Chromium first-class,
    others best-effort.
  - `NF-8` (schema bundle pin) resolved: pinned to BioSim
    commit `edb93e81` (`v2.0.0-35-gedb93e81`,
    `main`, 2025-09-02), matching the local
    `biosim-as-reference/` checkout.
  - `NF-9` (licensing) resolved: MIT.
  - Open Items section split into "resolved in v0.2" vs
    "still open".
- `docs/05-system-architecture.md` → v0.2: §4.4 records the
  sidecar JSON layout decision; the BioSim pin is recorded.
  Framework, XSD-validation strategy, and repo-layout choices
  retain their default proposals and remain open.
- `docs/04-ui-ux-vision.md` — no content change this pass.

### Decisions captured in this pass

- **License**: MIT.
- **Browsers**: Chromium-only first-class; Firefox/Safari
  best-effort with download/upload fallback where the File
  System Access API is unavailable.
- **Deadline**: first demo at the next lab meeting,
  ≈ T+8h from this revision. v1.0 acceptance criteria
  themselves are *not* expected at that meeting; the
  meeting will show a v0.x prototype to gather feedback.
- **BioSim version pin**: commit `edb93e81`
  (`v2.0.0-35-gedb93e81`).
- **Spatial layout persistence**: sidecar JSON, not
  inside the `.biosim`.
- **v1 acceptance journeys**: SCN-3, SCN-2, SCN-4.
- **Schema correctness fix**: malfunction attribute is
  `occursAtTick`; one config-time malfunction per
  `BioModule`; additional runtime malfunctions are
  REST-only and out of scope for v1.

### Open items rolled forward

The cross-cutting open items remaining after v0.2:

1. ITAR/EAR data-sensitivity for habitat models authored
   in BioSimCanvas.
2. Comprehension-check questions used to verify
   [O-3](01-needs-goals-objectives.md#o-3-communicate-a-habitat-in-one-screen-supports-g-1) / [F-VIEW-1](03-requirements.md#f-view-1--schematic-view-primary).
3. Undo / redo granularity ([F-EDIT-5](03-requirements.md#f-edit-5--undo--redo)).
4. NF-5 accessibility posture.
5. Framework choice (React vs Svelte vs Vue); default
   proposal: React + TS + Vite.
6. XSD validation strategy (WASM vs structural); default
   proposal: structural first.
7. Repo layout (flat vs monorepo); default proposal: flat
   for v1.
8. Specific contacts at the JSC contractor (TRACLabs).

## 0.1.0 — 2026-05-12 — initial draft

The first complete pass through the SE artifact set, written to be
the baseline that will be refined in the next lab meeting.

### Added

- `README.md` introducing BioSimCanvas, its motivation, and the
  document set.
- `.gitignore` excluding `biosim-as-reference/` and common
  build/editor artifacts.
- `docs/README.md` indexing the document set and recording the
  conventions for recursive refinement.
- `docs/00-stakeholders.md` — Stakeholder Register v0.1 (project
  lead, lab director, lab mates, JSC contractor / BioSim
  maintainers, BioSim itself as technical stakeholder).
- `docs/01-needs-goals-objectives.md` — NGO v0.1 (problem
  statement, vision, five goals, five measurable objectives,
  explicit non-goals, success criteria).
- `docs/02-concept-of-operations.md` — ConOps v0.1 (operating
  context, roles, five operational scenarios SCN-1..SCN-5, six
  coordinated views, configuration lifecycle).
- `docs/03-requirements.md` — Requirements v0.1 (functional
  groups LOAD/MODEL/EDIT/VIEW/ANOMALY/EXPORT/TEMPLATE and
  non-functional NF-1..NF-10, traceability matrix, open items).
- `docs/04-ui-ux-vision.md` — UI/UX Vision v0.1 (principles,
  information architecture, four canvas views, design tokens,
  three interaction storyboards).
- `docs/05-system-architecture.md` — System Architecture Notes
  v0.1 (architectural sketch, proposed tech choices, repo
  layout, cross-cutting decisions, risks).
- This changelog.

### Decisions captured in this pass

- Product name is **BioSimCanvas**; all doc titles lead with it.
- Scope is **authoring only** in v1; no live BioSim runtime
  integration.
- Deployment is a **static SPA** with **local-only** file I/O.
- Visualization stack is **schematic + spatial + timeline**,
  plus an XML expert view, plus an export review modal.
- Editor paradigm is **canvas-first** (drag-and-drop, drag-link
  for producer/consumer wiring), with a side panel for
  attributes.
- Persistence model is **per-user, per-session**; no server
  state, no DB, no auth.
- Validation is **soft warnings, user-overridable** rather than
  hard blocks (simpler-is-better preference).
- XML re-emission is **normalized** (no whitespace / attribute
  ordering preservation), but **semantically equivalent**.
- v1 templates are: **Empty / Minimal**, the existing
  `template.biosim`, and **lunar minihab**.

### Open items rolled forward

A consolidated list of `OPEN:` items lives at the bottom of each
document. The cross-cutting ones, to be resolved in the next
review meeting:

1. Top-3 named user journeys for v1 sign-off.
2. License (GPL-3.0 vs more permissive).
3. Browser support targets (Chromium-only vs +Firefox/Safari).
4. Deadline / milestone.
5. Pinned BioSim version for the bundled schemas.
6. Config-time vs runtime authoring of malfunctions.
7. Layout-metadata storage choice (extension element vs sidecar).
8. Framework / library confirmations in
   [05-system-architecture.md](05-system-architecture.md).
9. Undo granularity in F-EDIT-5.
10. Specific contacts / names at the JSC contractor.
