# BioSimCanvas — Stakeholder Register

| Revision | Date | Status | Authors | Reviewers |
|----------|------|--------|---------|-----------|
| 0.1 (draft) | 2026-05-12 | Initial draft | Project lead | TBD |
| 0.2 (draft) | 2026-05-12 | No content changes; revision-bump-only to keep the doc set in lock-step. Specific TRACLabs contact still pending; will be filled in after the next lab meeting (≈ T+8h). | Project lead | TBD |

## Purpose

This register lists every party with a stake in BioSimCanvas — what
they care about, how they engage with the project, and what
"success" looks like through their eyes. It is the source document
for all downstream requirements that begin with "the user shall…".

## Stakeholders

### S-1 — Project lead (primary author / product owner)

- **Role**: Researcher driving BioSimCanvas development and use.
- **Primary concerns**:
  - Be able to author and revise habitat + anomaly-scenario
    configurations *during meetings* with non-BioSim experts.
  - Round-trip the existing hand-authored `template.biosim`
    without losing fidelity that matters to the simulation.
  - Keep the software simple enough that one researcher can
    maintain it as a side project.
- **Engagement**: Primary author of the SE docs; owns priorities
  and acceptance.

### S-2 — Lab director

- **Role**: Reviewer / decision-maker for habitat architectures and
  anomaly scenarios studied by the lab.
- **Primary concerns**:
  - Quickly understand a habitat model presented on screen during
    a meeting (modules, flows, crew, scheduled anomalies) without
    reading XML.
  - Sign off on configurations before they are used in published
    research or sent to NASA JSC collaborators.
  - Be confident that what is shown on the canvas is what will
    actually run in BioSim (no silent divergence from the XML).
- **Engagement**: Periodic reviews; uses BioSimCanvas to read
  models more often than to author them.

### S-3 — Lab mates (researchers & students)

- **Role**: Co-authors / discussants on habitat models and anomaly
  scenarios.
- **Primary concerns**:
  - A shared visual language for discussing habitats so meetings
    don't devolve into reading XML on a shared screen.
  - Ability to propose edits live during a meeting and see the
    consequences immediately.
  - Easy on-boarding — should not need to learn the BioSim XML
    schema before contributing to a scenario.
- **Engagement**: Frequent. Both readers and authors of configs.

### S-4 — BioSim maintainers at the JSC contractor (TRACLabs)

- **Role**: Upstream developers and maintainers of BioSim itself.
- **Primary concerns**:
  - Any `.biosim` produced by BioSimCanvas is a valid input to
    BioSim — schema-compliant, semantically sensible, runnable.
  - BioSimCanvas does not depend on private APIs or undocumented
    behavior of BioSim; it follows the published XSDs and the
    REST/WebSocket contract.
  - The tool can be used to communicate scenarios *to* them
    cleanly (e.g. for collaborative debugging).
- **Engagement**: External; we share `.biosim` files and the SE
  docs with them periodically. They do not need to install
  BioSimCanvas to consume its outputs.

### S-5 — BioSim itself (technical "stakeholder")

- **Role**: The consuming system. Not a person, but treated as a
  stakeholder so that its constraints are explicit.
- **Primary concerns** (constraints):
  - Configurations conform to the XSDs under
    `biosim-as-reference/etc/schema/`.
  - Producer/consumer references resolve (every `inputs` /
    `outputs` names an existing module of a compatible type).
  - Crew schedules cover a 24-hour cycle; sensor alarm bands are
    monotonic; module names are unique.
- **Engagement**: Implicit — appears in BioSimCanvas as the export
  target.

## Out of scope (for now)

The following parties have been considered and explicitly **not**
treated as primary stakeholders in this iteration. They may be
promoted later.

- **OPEN:** PhD advisor / thesis committee — promote to S-? if
  they will formally review BioSimCanvas as a thesis artifact.
- **OPEN:** Course instructors / students using BioSim for
  teaching — no commitment to support educators in v1.
- **OPEN:** Funding agency / NASA POC — no current funding tie,
  but the JSC-contractor relationship implies indirect interest.
- **OPEN:** Ops / training engineers running anomaly drills on
  real flight programs — selected in early discovery as a target
  persona; for now we treat them as *use-case patterns* the lab
  emulates, not as separate stakeholders. Re-evaluate once we
  have an external user.

## Open questions

- **OPEN:** Confirm names / specific contacts at the JSC
  contractor (TRACLabs) so the register is concrete.
- **OPEN:** Decide whether to add the PhD advisor and any
  ad-hoc reviewer chain explicitly.
- **OPEN:** Decide whether anonymous external users (e.g.
  researchers who download BioSimCanvas if we open-source it)
  warrant their own stakeholder line.
