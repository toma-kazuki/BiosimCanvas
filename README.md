# BioSimCanvas

**BioSimCanvas** is a browser-based, canvas-first authoring tool for
[BioSim](https://github.com/traclabs/biosim) habitat configurations.
Its purpose is to let researchers, habitat designers, and operations
engineers **interactively design and review habitat models and anomaly
scenarios** at a level of representation that is usable in meetings —
even with stakeholders who do not know the BioSim XML schema.

> BioSim configurations are XSD-governed XML files that describe a
> producer/consumer graph of life-support modules (environment, air,
> water, power, food, waste, crew), sensors with alarms, malfunctions,
> and crew activity schedules. Authoring them by hand is error-prone
> and not a good medium for collaborative design. BioSimCanvas is the
> friendlier face for that work.

This repository currently contains the **systems-engineering artifacts**
that define what BioSimCanvas should be, before any code is written.
The artifacts are intended to be refined recursively as our
understanding sharpens.

## Status

- Phase: **Discovery & Definition** (pre-implementation).
- Next deliverable: the SE document set under `docs/`.

## Document Set

See [`docs/README.md`](docs/README.md) for the index. The set is:

1. `docs/00-stakeholders.md` — Stakeholder Register
2. `docs/01-needs-goals-objectives.md` — Needs, Goals & Objectives (NGO)
3. `docs/02-concept-of-operations.md` — Concept of Operations (ConOps)
4. `docs/03-requirements.md` — Requirements (functional + non-functional)
5. `docs/04-ui-ux-vision.md` — UI/UX Vision and visual definition
6. `docs/05-system-architecture.md` — System Architecture Notes
7. `docs/CHANGELOG.md` — Refinement history of the document set

## Reference Material (not committed)

A local clone of the BioSim source tree is expected at
`biosim-as-reference/` for offline reference (schema XSDs,
example `.biosim` configurations, REST API docs). It is excluded from
this repository via `.gitignore`. To set it up:

```bash
git clone https://github.com/traclabs/biosim.git biosim-as-reference
```

The file `template.biosim` at the repo root is the current
hand-authored baseline that motivated this project; it is the starting
template BioSimCanvas v1 must be able to load, edit, and re-emit.

## License

[MIT](LICENSE) — chosen to keep BioSimCanvas maximally reusable by
labs and collaborators around BioSim itself. BioSim's own GPL-3.0
license is unaffected; BioSimCanvas only *produces* `.biosim` files
and bundles BioSim's XSDs as data, neither of which constitutes a
derivative work of BioSim.
