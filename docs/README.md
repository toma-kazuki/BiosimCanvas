# BioSimCanvas — Documentation Index

This folder holds the systems-engineering artifacts for **BioSimCanvas**.
Documents are numbered in the order they should be read and refined.
Every document is a **living document**: it is edited iteratively as
stakeholder understanding sharpens.

For the app setup guide see [`app/README.md`](../app/README.md).
For a project overview see the [root README](../README.md).

---

## Document index

| # | Document | Purpose |
|---|----------|---------|
| 00 | [Stakeholder Register](00-stakeholders.md) | Who has a stake, what they care about, how they engage |
| 01 | [Needs, Goals & Objectives](01-needs-goals-objectives.md) | The "why" — problem statement and measurable objectives |
| 02 | [Concept of Operations](02-concept-of-operations.md) | How BioSimCanvas is used in practice; operational scenarios |
| 03 | [Requirements](03-requirements.md) | Functional + non-functional requirements, traced to NGO/ConOps |
| 04 | [UI/UX Vision](04-ui-ux-vision.md) | Frontend visual definition: personas, key screens, interaction model |
| 05 | [System Architecture](05-system-architecture.md) | Architectural sketch and tech choices |
| — | [Implementation Plan — Cycle 2](impl-cycle2.md) | Design-modify document for the module transparency + LLM cycle |
| — | [Changelog](CHANGELOG.md) | Refinement history of the document set |

---

## How to navigate

- **New to the project?** Start with `01-needs-goals-objectives.md` for the "why", then `02-concept-of-operations.md` for the "how".
- **Checking requirements?** Go to `03-requirements.md` — each requirement is labelled (F-*, NF-*) and traced back to NGO/ConOps.
- **Understanding the architecture?** See `05-system-architecture.md` for component breakdown, data flow, and tech decisions.
- **Reviewing a development cycle?** `impl-cycle2.md` documents the cycle 2 design decisions, implementation tasks, and commit hashes.
- **Tracking document changes?** `CHANGELOG.md` records every doc revision with date and rationale.

---

## How to refine these documents

1. **Discuss with stakeholders** — bring the relevant doc to the meeting; capture open questions as `**OPEN:**` callouts inline.
2. **Update the doc** — resolve the question, increment the `Revision` block at the top, add an entry to `CHANGELOG.md`.
3. **Commit** with a message in the form `docs(<doc-id>): <what changed>` (e.g. `docs(req): add F-LLM-7`).
4. **Propagate** — if a Need changes, walk the chain NGO → ConOps → Requirements → UI/UX → Architecture and update dependents.

---

## Conventions

- Each artifact begins with a **Revision** block (version, date, status, authors, reviewers).
- Cross-references use the form `[NGO-N-1](01-needs-goals-objectives.md#n-1-...)`.
- Open questions are labeled `**OPEN:**` so they are easy to grep.
- Assumptions are labeled `**ASSUMPTION:**`.
- Deferred items are labeled `**DEFERRED-TO-vNEXT:**`.
