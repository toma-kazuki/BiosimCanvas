# BioSimCanvas

**BioSimCanvas** is a browser-based, canvas-first authoring tool for
[BioSim](https://github.com/traclabs/biosim) habitat configurations.
It lets researchers, habitat designers, and operations engineers
**interactively design and review habitat models and anomaly scenarios**
at a level of representation usable in meetings — even with stakeholders
who do not know the BioSim XML schema.

> BioSim configurations are XSD-governed XML files describing a
> producer/consumer graph of life-support modules (environment, air,
> water, power, food, waste, crew), sensors with alarms, malfunctions,
> and crew activity schedules. Authoring them by hand is error-prone and
> not a good medium for collaborative design. BioSimCanvas is the
> friendlier face for that work.

---

## What's in this repository

| Path | Contents |
| --- | --- |
| [`app/`](app/) | The BioSimCanvas web application (React + TypeScript + Vite SPA) |
| [`docs/`](docs/) | Systems-engineering documents (requirements, architecture, ConOps, …) |
| [`template.biosim`](template.biosim) | Hand-authored baseline configuration that motivated this project |

---

## Quick start

If you just want to run the app, go to **[app/README.md](app/README.md)** for full setup instructions including the OpenAI API key required for the LLM chat feature.

The short version:

```bash
cd app
npm install
npm run dev          # open http://localhost:5173
```

---

## Key features (v0.3)

- **Schematic canvas** — drag-and-drop life-support modules, visualise flow connections
- **Module Encyclopedia** — browsable reference for all 19 BioSim module types with physics notes, ports, and attributes
- **Physics tooltips** — hover any module on the canvas or palette for a quick physics summary
- **LLM authoring assistant** — GPT-4o chat sidebar that understands the current configuration and can rewrite it on request, with undo support
- **Multi-view** — Schematic, Spatial, Timeline, Review, and raw XML views
- **Round-trip fidelity** — open, edit, and save `.biosim` files with unknown elements preserved

---

## Documentation

Systems-engineering artifacts are in [`docs/`](docs/). See **[docs/README.md](docs/README.md)** for the full index and navigation guide.

---

## Reference material (not committed)

A local clone of the BioSim source tree is expected at
`biosim-as-reference/` for offline schema and example reference.
It is excluded via `.gitignore`. To set it up:

```bash
git clone https://github.com/traclabs/biosim.git biosim-as-reference
```

---

## License

[MIT](LICENSE) — chosen to keep BioSimCanvas maximally reusable by
labs and collaborators around BioSim. BioSim's own GPL-3.0 license is
unaffected; BioSimCanvas only *produces* `.biosim` files and bundles
BioSim's XSDs as data, neither of which constitutes a derivative work
of BioSim.
