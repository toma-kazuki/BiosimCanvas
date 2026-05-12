# BioSimCanvas — Needs, Goals & Objectives (NGO)

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial draft — to be reviewed in the next lab meeting | Project lead | TBD |

## 1. Problem Statement

BioSim is a NASA-originated, Java-based simulator for advanced life
support systems. A BioSim run is specified entirely by an XML
**configuration file** (`.biosim`) that, even for a modest two-room
habitat, describes dozens of producer/consumer modules across
environment, air, water, power, food, waste, and crew subsystems,
plus sensors and alarms, plus per-crew activity schedules, plus
malfunctions. The schema is rich (see
`biosim-as-reference/etc/schema/`), and the resulting XML is *not the
right level of representation* for discussion with stakeholders who
do not already know BioSim. Today, when the lab wants to:

- iterate on a habitat architecture during a meeting,
- review a proposed anomaly scenario with the lab director, or
- communicate a scenario to BioSim maintainers at the JSC contractor,

the working medium is the raw XML — which is slow to read, easy to
break (silently invalid, broken cross-references), and hostile to
non-experts.

**Need:** a tool that lets the lab interactively *design and review*
habitat models and anomaly scenarios at a representation level that
is meeting-usable, while remaining a faithful editor of the
underlying `.biosim` file.

## 2. Vision

> *BioSimCanvas is the whiteboard for BioSim scenarios.*
>
> A researcher opens BioSimCanvas in a browser, drags habitat
> modules onto a canvas, wires their resource flows, places crew,
> schedules an anomaly on a timeline, and exports a valid `.biosim`
> file — all in the span of a lab meeting, with the lab director
> watching, asking questions, and proposing edits live.

## 3. Goals

High-level goals, in priority order.

- **G-1. Make habitat configurations legible to non-BioSim experts.**
  The canvas must communicate a habitat's structure (modules,
  resource flows, crew, sensors) and anomaly scenarios at a glance,
  without requiring the viewer to read XML.

- **G-2. Make habitat configurations authorable in meetings.**
  Editing must be direct-manipulation, low-latency, and forgiving
  enough that the project lead can drive changes live while the
  lab director and lab mates discuss.

- **G-3. Stay faithful to BioSim.** Anything BioSimCanvas saves must
  be a valid `.biosim` (passes BioSim's XSD) and runnable by
  BioSim without manual fix-up. The lab director must never be
  surprised by a divergence between the canvas and the real run.

- **G-4. Keep the software footprint small.** Single-developer
  maintainable. Browser-only static SPA, local files only, no
  backend, no database. Complexity is spent on the user
  experience, not on infrastructure.

- **G-5. Be a good citizen of the BioSim ecosystem.** Use only the
  published BioSim XSDs and conventions; produce output that
  TRACLabs and other collaborators can consume in their own
  workflows.

## 4. Objectives

Goals are turned into **measurable objectives** here. Each
objective is testable; each requirement in
[`03-requirements.md`](03-requirements.md) traces back to one or
more objectives.

### O-1. Round-trip the existing baseline (supports G-1, G-3)

BioSimCanvas v1 can **open** the existing hand-authored
`template.biosim` (the two-environment IHab + HALO baseline at the
repo root) and re-emit a `.biosim` that:

- is XSD-valid against `BiosimInitSchema.xsd`,
- is *semantically* equivalent to the original (same modules, same
  producer/consumer wiring, same crew, same sensors and alarm
  bands, same globals),
- starts a BioSim run that behaves identically for the first N
  ticks (N = TBD; see open question O-1.a).

**Acceptance check:** byte-level equivalence is *not* required
(normalized re-emission is acceptable per the simpler-is-better
preference). Semantic equivalence will be verified by a manual
diff of canonicalized XML and a smoke-test BioSim run.

- **OPEN:** O-1.a — pick N and a tolerance for tick-by-tick
  comparison, or accept "BioSim starts and runs M minutes without
  error" as the criterion.

### O-2. Author the second baseline from scratch (supports G-2)

A user can produce `lunar/minihab.biosim`-equivalent output
starting from the empty / minimal template, using only the
canvas + side-panel UI (no XML editing), in under **30 minutes**
the first time and under **10 minutes** thereafter.

- **OPEN:** O-2.a — pick the exact target config; minihab is
  intermediate complexity (~470 lines of XML) and is the
  proposed v1 yardstick. Confirm with lab director.

### O-3. Communicate a habitat in one screen (supports G-1)

Given any v1-supported `.biosim`, the **schematic view** fits on a
single 1080p display at the chosen default zoom and conveys, by
inspection only:

- every module and its subsystem (environment / air / water / …),
- every directed resource flow between modules,
- the location and count of crew,
- the presence (and timing, on the timeline view) of any
  scheduled malfunction.

"Conveys" is operationalized as: in a usability check with three
non-BioSim lab mates, each can correctly answer five basic
questions about an unfamiliar habitat within five minutes.

### O-4. Schema fidelity guard (supports G-3, G-5)

When the user is about to **export** a `.biosim`, BioSimCanvas
performs the following checks and surfaces results in a single
review panel:

- XSD validation against `BiosimInitSchema.xsd`,
- referential integrity (every `inputs` / `outputs` resolves to an
  existing module of compatible type),
- name uniqueness for module names,
- crew schedule sums to 24 hours per crew member,
- sensor alarm bands are monotonic and cover the expected ranges.

Failures are presented as **soft warnings the user can override**
(consistent with the simpler-implementation preference). The user
is told exactly what to fix and where.

### O-5. Bounded simplicity (supports G-4)

The v1 implementation has:

- **No backend services.** Static SPA only; runs from a file
  served via any static host or `npm run dev`.
- **No persistent server-side storage.** Configurations are
  opened from and saved to the user's local filesystem (via the
  browser File System Access API or download/upload fall-back).
- **No authentication, multi-tenant, or collaboration features.**
  "Collaboration" in v1 means *one user driving in a meeting room
  with the screen shared*.

This objective is verified by inspection of the architecture
(see [`05-system-architecture.md`](05-system-architecture.md)).

## 5. Non-Goals (v1)

To keep complexity bounded, the following are explicitly **not**
goals for v1 and are deferred or out of scope:

- **DEFERRED-TO-vNEXT:** Live BioSim runtime integration (REST
  launch, WebSocket telemetry overlay). v1 is authoring only.
- **DEFERRED-TO-vNEXT:** Spatial geometry that drives simulation
  parameters (e.g. drawn area → `initialVolume`). The spatial
  view in v1 is informational only.
- **DEFERRED-TO-vNEXT:** Multi-user real-time collaboration,
  comments, approvals, history beyond the user's own git.
- **DEFERRED-TO-vNEXT:** Stochastic / noise filter authoring UI
  (`normalStochasticFilter` etc. are passed through but not
  graphically edited).
- **OUT OF SCOPE:** Authoring BioSim source code or schemas.
- **OUT OF SCOPE:** Replacing BioSim's own visualization
  integrations (Open MCT, etc.) for live runs.

## 6. Success Criteria (rolled up)

BioSimCanvas v1 is considered successful when **all** of the
following are true:

1. **(O-1)** The existing `template.biosim` round-trips through
   BioSimCanvas and runs in BioSim without manual XML editing.
2. **(O-2)** A `minihab.biosim`-equivalent can be produced from
   scratch in BioSimCanvas in under 30 minutes by the project
   lead, and under 60 minutes by a lab mate seeing the tool for
   the first time after a 5-minute walkthrough.
3. **(O-3)** A lab meeting can be run with BioSimCanvas as the
   *primary medium* for habitat / scenario discussion, with the
   XML view used only in exceptional cases.
4. **(O-4)** Every export is XSD-valid and referentially
   consistent, or the user has explicitly overridden a clearly
   labeled warning.
5. **(G-4)** The repository remains a single static SPA with no
   server-side runtime requirement.

## 7. Open Questions (NGO-level)

- **OPEN:** Fixed deadline / milestone for v1? (Semester end?
  Specific paper? Meeting demo?)
- **OPEN:** License — adopt GPL-3.0 to mirror BioSim, or
  something more permissive? Affects whether external
  collaborators can adopt BioSimCanvas freely.
- **OPEN:** Any data-sensitivity concerns (ITAR/EAR) on the
  habitat models we will edit in BioSimCanvas? BioSim itself is
  public on GitHub under GPL-3.0, but scenarios authored for
  specific NASA programs may be more sensitive.
- **OPEN:** Browser support targets (latest Chromium only,
  or also Firefox / Safari)? The File System Access API has
  patchy support outside Chromium and influences O-5.

## 8. Traceability hooks

- Goals → Objectives mapping is encoded in the section headers
  above (e.g. *O-1 (supports G-1, G-3)*).
- Each requirement in
  [`03-requirements.md`](03-requirements.md) cites its parent
  objective via a `Trace:` field.
- Each operational scenario in
  [`02-concept-of-operations.md`](02-concept-of-operations.md)
  is tied to one or more objectives.
