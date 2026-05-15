# BioSimCanvas — System Architecture Notes

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial sketch | Project lead | TBD |
| 0.2 (draft) | 2026-05-12 | Layout sidecar choice and BioSim pin landed; framework and XSD-validation decisions remain to be picked up alongside the first build. | Project lead | TBD |

This document records architectural decisions and the rationale for
each. It is intentionally **terse** at this stage so the
requirements remain the driver. As the system is implemented, this
document will grow into the canonical architecture reference.

## 1. Architectural shape

```
              ┌────────────────────────────────────────────┐
              │              Browser (SPA)                 │
              │                                            │
   user ◀─▶  ┌┴───────────────┐   ┌──────────────────────┐ │
              │  UI layer       │   │  Domain layer       │ │
              │  (views +       │   │  (canonical model,  │ │
              │   palette +     │◀─▶│   schema, undo,     │ │
              │   side panel +  │   │   validators)       │ │
              │   timeline)     │   └──────────────────────┘ │
              │                 │            │              │
              │                 │            ▼              │
              │                 │   ┌──────────────────────┐ │
              │                 │   │  Serialization layer │ │
              │                 │   │  (XML parser /       │ │
              │                 │   │   emitter, XSD       │ │
              │                 │   │   validation)        │ │
              │                 │   └──────────────────────┘ │
              │                 │            │              │
              │                 │            ▼              │
              │                 │   ┌──────────────────────┐ │
              │                 │   │  Storage adapter     │ │
              │                 │   │  (File System Access │ │
              │                 │   │   API + fallback)    │ │
              │                 │   └──────────────────────┘ │
              └─────────────────┴────────────────────────────┘

  • No backend, no DB. Static SPA. Templates and XSDs are bundled.
  • File I/O is purely client-side, on the user's filesystem.
```

## 2. Recommended technology choices (proposed, refinable)

These are *proposals*; they are not committed to until the user
explicitly approves them. The simpler-is-better preference applies.

### 2.1 Application framework — **React + TypeScript + Vite**

- **Why React**: largest ecosystem for canvas-based editors, easy
  to find labmates who can read it, good fit for the side-panel /
  forms / palette pattern.
- **Why TypeScript**: BioSim's XSD-derived data model is highly
  structured; static types prevent a class of cross-reference
  bugs that hand-written XML already suffers from.
- **Why Vite**: minimal config; instant dev server; static build
  output trivially hostable.
- *Alternatives considered*: SvelteKit (smaller bundles, simpler
  reactivity, smaller ecosystem for graph editors), Vue 3
  (middle ground). The user expressed no preference but asked
  for the simplest reasonable choice; React + Vite is the
  default pick.

### 2.2 Canvas / node-graph library — **XYFlow (React Flow)**

- **Why**: it is the well-trodden path for node-link editors
  with custom node renderers, typed ports, pan/zoom, mini-map,
  and selection out of the box. Used by many open-source
  diagramming tools.
- *Alternatives*: hand-rolled SVG (too costly for v1), Konva
  (lower level), reaflow (less active).

### 2.3 Timeline view — **`vis-timeline` or a thin custom SVG**

- **Why**: malfunctions and crew schedules are simple, but a
  proven library reduces effort. If the simpler-is-better bias
  applies hard, a custom SVG with d3-scale and pointer-event
  handlers is ~a few hundred lines and avoids a dependency.
- **Recommendation**: try a custom SVG first; reach for
  `vis-timeline` only if it gets painful.

### 2.4 XML parsing & serialization

- Parse: a forgiving DOM-based parser (e.g. `fast-xml-parser`)
  to keep unknown elements/attributes intact for F-MODEL-3.
- Validate: XSD validation in the browser using a small
  validator (e.g. `libxmljs2-wasm`, `xmllint-wasm`) bundled at
  build time. **OPEN:** confirm bundle size / startup cost is
  acceptable; otherwise implement *structural* validation in
  TypeScript and call schema validation a SHOULD that runs
  in a Web Worker.

### 2.5 XML expert editor — **Monaco editor**

- Standard choice; ships with XML syntax highlighting and
  diagnostics.

### 2.6 State & undo — **plain React state + `zustand` or `Redux Toolkit`**

- For a single-document editor with an undo stack, `zustand`
  with the `temporal` middleware is the lightest credible
  option. RTK with `redux-undo` is the heavier, more familiar
  alternative.

### 2.7 Storage — **File System Access API, with download/upload fallback**

- Primary: `showOpenFilePicker` / `showSaveFilePicker`. Lets
  the user "save" repeatedly to the same file (NF-3, NF-4).
- Fallback (Firefox / Safari today): browser download for save,
  drag-and-drop or file input for open.

### 2.8 Build & dev tooling

- Package manager: `npm` (or `pnpm`); user has no preference.
- Lint / format: ESLint + Prettier with TypeScript rules.
- Tests: Vitest + React Testing Library.
- E2E (later): Playwright for SCN-1..SCN-4 smoke tests.

## 3. Repository layout (current)

GitHub repository name: **`BiosimCanvas`**. Local clones commonly use a
matching top-level folder name; Git metadata is unaffected by that path.

```
BiosimCanvas/
├── README.md
├── LICENSE
├── template.biosim                 # current authoring baseline (also mirrored under app/)
├── docs/                           # SE artifacts (this set)
├── app/                            # Vite + React SPA
│   ├── public/
│   │   └── templates/              # bundled .biosim templates
│   ├── scripts/                    # Node tooling (reference checks, smoke, round-trip)
│   ├── src/
│   │   ├── domain/                 # canonical model + types
│   │   ├── io/                     # parse, emit, validate
│   │   ├── session/
│   │   ├── state/                  # zustand + undo
│   │   └── ui/                     # React views (schematic, spatial, timeline, XML, …)
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── .gitignore
```

- **Resolved for v1:** flat layout with `app/` at the repo root (not
  `packages/app`). Revisit a monorepo shape only if a second
  publishable package (e.g. CLI or standalone schema bundle) appears.

## 4. Cross-cutting decisions

### 4.1 Canonical model lives in the domain layer, not in XML

The single source of truth at any time is the in-memory model
(F-MODEL-1). XML is only inputs and outputs. This is the
crucial decision that makes the rest simple.

### 4.2 Schema-driven typing

Where we can, types in `src/schema/` are *derived* from the
BioSim XSDs at build time, not hand-mirrored. This keeps
BioSimCanvas honest as BioSim evolves and supports NF-8
(schema bundle drift).

### 4.3 Unknown-element pass-through

The parser keeps anything it does not understand in a raw form
attached to the parent model node, and re-emits it on export
(F-MODEL-3). This is how BioSimCanvas can be useful from day
one without supporting every corner of the BioSim XSDs.

### 4.4 Layout metadata

Spatial / schematic layout coordinates are persisted to a
**sidecar JSON file** next to the `.biosim`, named
`<basename>.biosim.canvas.json`. The `.biosim` itself is left
semantically pure — useful when sharing with TRACLabs or any
tooling that did not write the layout. If the sidecar is
missing on load, BioSimCanvas auto-lays out the spatial view
from defaults.

**Resolved (v0.2).** (Earlier draft considered a namespaced
extension element inside the `.biosim`; the sidecar keeps the
canonical file clean at the cost of two files traveling
together.)

### 4.5 No live BioSim integration in v1

The REST and WebSocket interfaces of BioSim exist (see the
BioSim README) but BioSimCanvas v1 does not call them. This
preserves the "config authoring only" scope and "no backend"
simplicity.

## 5. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| XSD validation in the browser too slow / too large | medium | medium | Validate in a Web Worker; fall back to structural validation in TS if WASM XSD is unwieldy. |
| BioSim schema evolution diverges from bundled XSD | medium | low–medium | Pin schema version (NF-8); add a smoke test that re-validates all bundled templates on every build. |
| File System Access API gaps on Firefox / Safari | high | low | Document the fallback; show a one-time hint on those browsers. |
| Scope creep into live-telemetry visualization | medium | high | Hold the line via the non-goals in NGO §5; revisit only in v-next. |
| Layout coordinates in `.biosim` break TRACLabs' tooling | low | medium | Use clearly namespaced extension elements; provide a flag to export without them. |

## 6. Open Items (Architecture-level)

Resolved in v0.2:

- **RESOLVED (v0.2):** Layout metadata — sidecar JSON
  (`<basename>.biosim.canvas.json`) next to the `.biosim`.
- **RESOLVED (v0.2):** Pin BioSim version — `edb93e81`
  (`v2.0.0-35-gedb93e81`), matching the local
  `biosim-as-reference/` checkout.

Still open:

- **OPEN:** Confirm framework choice (React vs Svelte vs Vue).
  Default proposal stands: React + TypeScript + Vite.
- **OPEN:** Confirm XSD validation strategy (WASM XSD validator
  vs structural validation in TypeScript). Default proposal:
  structural validation first (cheaper); add WASM XSD if and
  when warranted.
- **OPEN:** Decide flat repo vs monorepo layout for the SPA.
  Default proposal: flat for v1; revisit when a second package
  emerges.
