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

This repository holds the **BioSimCanvas web app** (`app/`) and
**systems-engineering documents** (`docs/`), refined as the design evolves.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) **18+** (LTS recommended) and **npm**
- A clone of this repository

### Install and run the app

Run these from the `app/` directory:

```bash
cd app
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Load a
`.biosim` via the file/open affordance in the UI or by opening it from
your OS if your browser is configured that way.

Other commands (still from `app/`):

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build (`dist/`) — runs `tsc -b` then Vite |
| `npm run preview` | Serve the last production build locally |
| `npm run lint` | Typecheck (`tsc -b --noEmit`) |

**Optional upstream compliance check:** after you have
[`biosim-as-reference/`](#reference-material-not-committed) with
`configuration/**/*.biosim`, run:

```bash
cd app
npm run check:reference-configs
```

That verifies parse and round-trip parity for every such file. Use
`VERBOSE=1` to print each structural validation finding. Override the
scan root with `BIOSIM_CONFIG_DIR` or a path argument (see
`app/scripts/check-reference-configs.mjs`).

## Status

- Phase: **Active development** — SPA in `app/`.
- Requirements and vision: `docs/`.

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
