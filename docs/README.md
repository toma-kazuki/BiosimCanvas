# BioSimCanvas — Documentation Index

This folder holds the systems-engineering artifacts for **BioSimCanvas**.
Documents are numbered in roughly the order they should be read and
refined. Every document is a **living document**: it will be edited
recursively as stakeholder understanding sharpens.

| # | Document | Purpose |
|---|----------|---------|
| 00 | [Stakeholder Register](00-stakeholders.md) | Who has a stake, what they care about, how they engage. |
| 01 | [Needs, Goals & Objectives](01-needs-goals-objectives.md) | The "why" — problem statement and measurable objectives. |
| 02 | [Concept of Operations](02-concept-of-operations.md) | How BioSimCanvas is used in practice; operational scenarios. |
| 03 | [Requirements](03-requirements.md) | Functional + non-functional requirements, traced to NGO/ConOps. |
| 04 | [UI/UX Vision](04-ui-ux-vision.md) | Frontend visual definition: personas, key screens, interaction model. |
| 05 | [System Architecture Notes](05-system-architecture.md) | Architectural sketch and tech choices (populated after requirements stabilize). |
| —  | [Changelog](CHANGELOG.md) | Refinement history of the document set. |

## How to refine these documents

1. **Discuss with stakeholders** — bring the relevant doc to the
   meeting; capture disagreements as `TBD` or `OPEN ISSUE` callouts
   inline.
2. **Update the doc** with the resolution, increment its
   `Revision` block at the top, and add an entry to `CHANGELOG.md`.
3. **Commit** the change with a message in the form
   `docs(<doc-id>): <what changed>` (e.g. `docs(ngo): refine objective O-3`).
4. **Propagate** consequences: if a Need changes, walk the chain
   NGO → ConOps → Requirements → UI/UX → Architecture and update
   anything that depended on it.

## Conventions

- Each artifact begins with a **Revision** block (version, date,
  status, authors, reviewers).
- Cross-references use the form `[NGO-N-1](01-needs-goals-objectives.md#n-1-...)`.
- Open questions are labeled `**OPEN:**` so they are easy to grep.
- Assumptions are labeled `**ASSUMPTION:**`.
- Things explicitly deferred are labeled `**DEFERRED-TO-vNEXT:**`.
