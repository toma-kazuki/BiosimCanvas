# BioSimCanvas — System Architecture Notes

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial sketch | Project lead | TBD |
| 0.2 (draft) | 2026-05-12 | Layout sidecar choice and BioSim pin landed; framework and XSD-validation decisions remain to be picked up alongside the first build. | Project lead | TBD |
| 0.3 (draft) | 2026-05-15 | Cycle 2 — resolved framework/XSD/repo-layout opens (all confirmed from cycle 1 build); added §2.9 LLM integration, §4.6 LLM round-trip, §4.7 knowledge base; updated architectural diagram; updated risks table. | Project lead | TBD |

This document records architectural decisions and the rationale for
each. It is intentionally **terse** at this stage so the
requirements remain the driver. As the system is implemented, this
document will grow into the canonical architecture reference.

## 1. Architectural shape

```
              ┌─────────────────────────────────────────────────┐
              │                 Browser (SPA)                   │
              │                                                 │
   user ◀─▶  ┌┴──────────────────┐   ┌──────────────────────┐  │
              │  UI layer          │   │  Domain layer        │  │
              │  (views +          │   │  (canonical model,   │  │
              │   palette +        │◀─▶│   schema, undo,      │  │
              │   side panel +     │   │   validators)        │  │
              │   encyclopedia +   │   └──────────────────────┘  │
              │   LLM chat)        │            │               │
              │                    │            ▼               │
              │                    │   ┌──────────────────────┐  │
              │                    │   │  Serialization layer │  │
              │                    │   │  (XML parser /       │  │
              │                    │   │   emitter, structural│  │
              │                    │   │   validation)        │  │
              │                    │   └──────────────────────┘  │
              │                    │            │               │
              │                    │            ▼               │
              │                    │   ┌──────────────────────┐  │
              │                    │   │  Storage adapter     │  │
              │                    │   │  (File System Access │  │
              │                    │   │   API + fallback)    │  │
              │                    │   └──────────────────────┘  │
              │                    │                            │
              │    LLM chat ───────┼──► LLM adapter            │  │
              │    sidebar         │   (serialize model →      │  │
              │                    │    Anthropic API →        │  │
              │                    │    parse XML response →   │  │
              │                    │    update domain model)   │  │
              └────────────────────┴────────────────────────────┘
                                              │
                                              ▼ (one outbound call
                                           per user message)
                                    ┌──────────────────┐
                                    │  OpenAI API      │
                                    │  (gpt-4o)        │
                                    └──────────────────┘

  • One outbound network call per LLM turn; all other I/O is local.
  • Static SPA. Templates, XSDs, and knowledge base are bundled.
  • API key loaded from .env (never committed).
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

### 2.9 LLM integration — **OpenAI API** *(new in v0.3, updated v0.3.1)*

- **Provider**: OpenAI (`gpt-4o` or later).
- **SDK**: `openai` (official OpenAI TypeScript SDK), called
  directly from the browser. The API key is loaded from the
  `VITE_OPENAI_API_KEY` environment variable at build time
  (Vite exposes `VITE_*` vars to the browser bundle).
- **Request construction**: on each user message, the UI layer
  serializes the current domain model to XML (reusing the same
  emitter as F-EXPORT-1) and prepends it to the user message as
  a `<configuration>` block. A fixed system prompt provides
  BioSim domain context and instructs the agent on response
  format. Uses the Chat Completions API
  (`/v1/chat/completions`) with a `system` message and a
  `user` message per turn.
- **Response handling**: the LLM adapter scans the response text
  for a root BioSim XML element. If found, it is passed to the
  existing XML parser; on success the domain model is replaced
  and all views re-render. If not found, the response is shown
  as chat text only.
- **Error handling**: API errors (invalid key, rate limit, network
  timeout) are caught and displayed as error messages in the chat
  panel; they do not throw or crash the app.
- **Security note**: `VITE_OPENAI_API_KEY` is embedded in the
  client bundle in production. This is acceptable for a local
  dev/research tool where the user supplies their own key. The
  `.env` file is `.gitignore`d; the production build is not
  intended for public hosting.

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

### 4.6 LLM round-trip *(new in v0.3)*

The LLM authoring assistant shares the serialization layer with
the rest of the app:

1. **Outbound**: `emitBiosim(currentModel)` → XML string →
   prepended to user message → Anthropic API.
2. **Inbound**: API response scanned for root BioSim XML →
   `parseBiosim(xml)` → new `BiosimDocument` → replaces
   Zustand store state → all views re-render → undo stack
   captures the change (so Ctrl+Z undoes the LLM update).

This reuse is intentional: the LLM is an editor, not a special
pathway. Its output passes through the same validation as any
user edit. If the LLM produces structurally invalid XML, the
parser's error handling surfaces the problem in the chat panel
and leaves the existing model intact.

### 4.7 Module knowledge base *(new in v0.3)*

The module encyclopedia (F-KNOW-*) is backed by a single
TypeScript constant file (`src/domain/moduleKnowledge.ts`).
Each entry is a plain object keyed by module type name,
containing the curated content (functional summary, ports,
attributes, malfunction behavior, hidden physics note).

Content is derived once from the BioSim Java source (commit
`edb93e81`) and does not require any build-time code
generation or network access. The same data is referenced by:
- the Encyclopedia panel component,
- the hover tooltip renderer for canvas nodes and palette items,
- (optionally) the LLM system prompt, to ground the agent's
  knowledge about specific BioSim module behavior.

### 4.5 No live BioSim integration in v1

The REST and WebSocket interfaces of BioSim exist (see the
BioSim README) but BioSimCanvas v1 does not call them. This
preserves the "config authoring only" scope and "no backend"
simplicity.

## 5. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| XSD validation in the browser too slow / too large | medium | medium | Structural validation in TS (implemented). WASM XSD deferred. |
| BioSim schema evolution diverges from bundled XSD | medium | low–medium | Pin schema version (NF-8); smoke test re-validates all bundled templates on every build. |
| File System Access API gaps on Firefox / Safari | high | low | Document the fallback; show a one-time hint on those browsers. |
| Scope creep into live-telemetry visualization | medium | high | Hold the line via the non-goals in NGO §5; revisit only in v-next. |
| Layout coordinates in `.biosim` break TRACLabs' tooling | low | medium | Sidecar JSON keeps `.biosim` clean (resolved v0.2). |
| LLM outputs malformed or semantically invalid XML | medium | low | Parser error handling leaves current model intact; error shown in chat. Structural validation runs on LLM output same as on user edits. |
| LLM API key exposed in browser bundle | medium | low | Acceptable for local research tool; user supplies own key; `.env` is `.gitignore`d; no public hosting. |
| LLM context window overflow for large configs | low–medium | medium | minihab.biosim is ~470 lines; well within Claude's context window. Mitigation needed only if configs grow to 1000+ modules; defer. |
| LLM generates plausible-but-wrong physics | medium | medium | Module encyclopedia tooltips let users spot-check generated configs; structural validation catches reference errors. |

## 6. Open Items (Architecture-level)

Resolved in v0.2:

- **RESOLVED (v0.2):** Layout metadata — sidecar JSON
  (`<basename>.biosim.canvas.json`) next to the `.biosim`.
- **RESOLVED (v0.2):** Pin BioSim version — `edb93e81`
  (`v2.0.0-35-gedb93e81`), matching the local
  `biosim-as-reference/` checkout.

Resolved in v0.3:

- **RESOLVED (v0.3):** Framework — React + TypeScript + Vite.
  Confirmed by cycle 1 build.
- **RESOLVED (v0.3):** XSD validation strategy — structural
  validation in TypeScript (implemented in cycle 1). WASM XSD
  validation deferred; structural checks are sufficient for v1/v2.
- **RESOLVED (v0.3):** Repo layout — flat (`app/` at repo root).
  Confirmed by cycle 1 build. No second package has emerged.
- **RESOLVED (v0.3.1):** LLM provider — OpenAI API (`gpt-4o`).
  API key via `VITE_OPENAI_API_KEY` in `.env`.

Still open:

- **OPEN:** LLM system prompt content — the exact BioSim domain
  context and output-format instructions to include; to be
  iterated through use.
- **OPEN:** Whether to include `moduleKnowledge.ts` content (or
  a condensed version) in the LLM system prompt to ground the
  agent's module-level knowledge, vs. relying on Claude's
  training data about BioSim.
