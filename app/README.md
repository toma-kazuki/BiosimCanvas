# BioSimCanvas — Web App

The BioSimCanvas SPA for authoring BioSim `.biosim` configurations.
For an overview of the whole project see the [root README](../README.md).
For systems-engineering documents see [`docs/`](../docs/).

---

## Prerequisites

- **Node.js 18+** (LTS recommended) and **npm**
- An **OpenAI API key** — required only for the LLM chat feature (see below)

---

## Setup and launch

```bash
# from the repo root
cd app
npm install
npm run dev
```

Vite will print a URL (usually `http://localhost:5173`). Open it in your browser.

---

## OpenAI API key (LLM chat feature)

The **Chat** tab in the right panel requires a GPT-4o API key.

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```
2. Open `app/.env` and fill in your key:
   ```
   VITE_OPENAI_API_KEY=sk-proj-...
   ```
3. **Restart** the dev server — Vite does not hot-reload `.env` changes.

> The `.env` file is git-ignored and never committed. Keep your key out of source control.

Without a key the app loads and works fully except the Chat tab, which shows setup instructions instead.

---

## Other commands

Run all from the `app/` directory:

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build to `dist/` — runs `tsc -b` then Vite |
| `npm run preview` | Serve the last production build locally |
| `npm run lint` | Type-check only (`tsc -b --noEmit`) |

**Optional upstream compliance check:** with
[`biosim-as-reference/`](../README.md#reference-material-not-committed)
containing `configuration/**/*.biosim`, run:

```bash
npm run check:reference-configs
```

This verifies parse and round-trip parity for every reference file.
Use `VERBOSE=1` to print structural validation findings, or override
the scan root with `BIOSIM_CONFIG_DIR` (see `scripts/check-reference-configs.mjs`).

---

## Source layout

```
app/
├── src/
│   ├── domain/         canonical model, schema registry, mutations, module knowledge base
│   ├── io/             XML parse (parseBiosim) and emit (emitBiosim)
│   ├── llm/            OpenAI adapter, system prompt, chat component
│   ├── session/        autosave / session restore
│   ├── state/          Zustand store — document, undo/redo, UI state, chat history
│   └── ui/
│       ├── App.tsx         top-level layout and keyboard shortcuts
│       ├── styles.css      design tokens + all layout and component styles
│       ├── chat/           LLM chat sidebar (LlmChat.tsx)
│       ├── common/         palette, tooltips, view switcher, encyclopedia
│       ├── encyclopedia/   module encyclopedia panel
│       ├── schematic/      XYFlow canvas, node renderer, legend
│       ├── side-panel/     properties inspector
│       ├── spatial/        spatial layout view
│       ├── timeline/       timeline view
│       ├── review/         review view
│       └── xml-view/       raw XML editor view
├── public/
│   └── templates/      bundled default .biosim configurations
└── scripts/
    └── check-reference-configs.mjs   upstream parse/round-trip checker
```
