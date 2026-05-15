# BioSimCanvas — Changelog

A running record of changes to the BioSimCanvas systems-engineering
document set. One entry per refinement. Code changes (when they
start) live in the standard git log; this file is for the *docs*.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

- GitHub repository renamed to **`BiosimCanvas`** (formerly
  `Biosim-config`). Root `README.md` documents the canonical HTTPS
  clone URL; **§3 Repository layout** in
  `docs/05-system-architecture.md` matches the flat tree (`app/` at
  repo root).

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
