# BioSimCanvas — Web App

Static SPA for authoring BioSim `.biosim` configurations. See the
project root for the systems-engineering doc set (`../docs/`).

## Requirements

- Node 16+ (Node 16 works for v0.x; we'll bump to ≥18 once the host
  machine has a modern toolchain installed).
- npm 8+.

## Develop

```bash
npm install        # once
npm run dev        # starts Vite at http://127.0.0.1:5173/
```

The dev server auto-loads `public/templates/template.biosim` (a copy
of the project-root file of the same name) on first paint.

## Build

```bash
npm run build      # type-check + production bundle to ./dist/
npm run preview    # serve ./dist/ for sanity-checking the bundle
```

## Layout

```
src/
├── domain/             canonical model, schema registry, graph builder
├── io/                 XML parse / emit (parse only in v0.1)
├── state/              zustand store (single document)
├── ui/
│   ├── App.tsx         top-level layout
│   ├── styles.css      design tokens + layout
│   ├── common/         palette etc.
│   ├── schematic/      XYFlow canvas + node renderer + legend
│   └── side-panel/     inspector
public/
└── templates/
    └── template.biosim  bundled default config
scripts/
└── smoke.mjs           stand-alone parser smoke test
```
