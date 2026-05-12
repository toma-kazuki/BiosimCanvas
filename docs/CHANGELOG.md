# BioSimCanvas — Changelog

A running record of changes to the BioSimCanvas systems-engineering
document set. One entry per refinement. Code changes (when they
start) live in the standard git log; this file is for the *docs*.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

- Nothing yet.

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
