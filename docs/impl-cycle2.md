# Implementation plan: Cycle 2 — Module Transparency + LLM Authoring Assistant

**Document type:** Implementation plan and progress record  
**Design revision:** v0.3 — Module Knowledge Base and LLM Chat Sidebar

---

## Revision summary

| Field | Value |
| :--- | :--- |
| **Revision** | v0.3 |
| **Date** | 2026-05-15 |
| **Author** | toma-kazuki |
| **Scope** | `app/src/domain/`, `app/src/ui/`, `app/src/state/store.ts`, `app/.env` |
| **Source gaps** | `docs/feedback_v1.md` — lab meeting identified opaque module physics and absence of LLM authoring |
| **Design specs** | `docs/03-requirements.md` §1.8 (F-KNOW-*), §1.9 (F-LLM-*), §2 (NF-11); `docs/04-ui-ux-vision.md` §3, §4.5, §4.6; `docs/05-system-architecture.md` §2.9, §4.6, §4.7 |
| **Baseline commit** | `7d5edfc` (memory files — last commit before implementation) |
| **Implementation commit** | `05466e5` (Task 5 — LLM chat sidebar) |
| **Status** | ✅ Complete |

### Commits that constitute this revision

| Hash | Message summary | Scope |
| :--- | :--- | :--- |
| `7d5edfc` | Baseline — memory files committed | — |
| `b9a5bbb` | Task 1: module knowledge base | `app/src/domain/moduleKnowledge.ts` |
| `8047ea8` | Task 2: physics tooltips on palette + canvas nodes | `app/src/ui/common/Palette.tsx`, `app/src/ui/schematic/ModuleNodeView.tsx` |
| `350da29` | Task 3: Module Encyclopedia panel | `app/src/ui/encyclopedia/Encyclopedia.tsx` (new) |
| `5c3be0e` | Task 4: right-panel tab strip + panel restructure | `app/src/ui/App.tsx`, `app/src/ui/side-panel/SidePanel.tsx`, `app/src/ui/styles.css` |
| `05466e5` | Task 5: LLM adapter + chat sidebar | `app/src/llm/`, `app/src/ui/chat/LlmChat.tsx` (new), `app/src/state/store.ts`, `app/.env.example` |

---

## Background

The cycle 1 prototype was presented at a lab meeting and received positive feedback on overall functionality. However, two concrete gaps were identified (recorded in `docs/feedback_v1.md`):

**Gap 1 — Transparency Gap:** Users could not tell whether catalog modules are fixed classes or extensible abstractions. The underlying physics (what each module consumes, produces, and how it behaves under a malfunction) was completely hidden from the UI. A BioSim audit of the Java source (commit `edb93e81`) revealed that modules are indeed fixed Java classes — no custom modules are possible via XML. The UI must reflect this reality clearly while surfacing the physics that are relevant to configuration decisions.

**Gap 2 — Hidden Physics Gap:** When wiring modules, users had no way to know the resource flow logic. Key hidden behaviors include OGS stoichiometry (2H₂O → 2H₂ + O₂), WaterRS's four power-based operational modes, VCCR's 16-subsystem internal graph, and Store leak rates under malfunctions. These are not expressed in the XML and currently invisible to the user.

**New Capability — LLM Authoring:** The lab wants to use a language model to generate or modify configurations from natural language. The architecture decision (§2.9 system architecture) establishes that the current XML (serialized from the in-memory model) is sent as context on each turn, and the agent can respond with either chat text or a new full `.biosim` XML that replaces the canvas state.

### Root cause / Gap description

The existing `registry.ts` captures module names, subsystem assignments, glyphs, and endpoint tag→resource mappings — but nothing about physical behavior, class hierarchy, configurable attribute semantics, or malfunction effects. The side panel shows editable attributes but does not explain what they mean or what the module does. There is no LLM integration of any kind.

---

## Progress overview

| # | Task | Scope | Status |
| :--- | :--- | :--- | :--- |
| — | Confirm baseline commit | — | ✅ `7d5edfc` |
| 1 | Module knowledge base (`moduleKnowledge.ts`) | `app/src/domain/` | ✅ `b9a5bbb` |
| 2 | Physics tooltips on palette items and canvas nodes | `app/src/ui/common/Palette.tsx`, `app/src/ui/schematic/ModuleNodeView.tsx` | ✅ `8047ea8` |
| 3 | Module Encyclopedia panel component | `app/src/ui/encyclopedia/` (new) | ✅ `350da29` |
| 4 | Right-panel tab strip restructure (Properties / Encyclopedia / Chat) | `app/src/ui/App.tsx`, `app/src/ui/side-panel/`, `app/src/ui/styles.css` | ✅ `5c3be0e` |
| 5 | LLM adapter + chat sidebar | `app/src/llm/` (new), `app/src/ui/chat/` (new), `app/src/state/store.ts` | ✅ `05466e5` |
| — | Implementation commits | — | ✅ Complete |

---

## Task 1 — Module knowledge base

**Status:** 🔲 Not started  
**Prerequisites:** Baseline commit

### Objective

Create `app/src/domain/moduleKnowledge.ts` — a static, curated TypeScript constant that holds the physical description of every module type in the v1 catalog. This is the single source of truth for tooltips, the encyclopedia panel, and (optionally) the LLM system prompt. No network calls; no code generation at build time.

### Design references

- `docs/03-requirements.md` §1.8 F-KNOW-1..3 — what each entry must contain
- `docs/05-system-architecture.md` §4.7 — data shape and reuse points

### Files to create / modify

- `app/src/domain/moduleKnowledge.ts` — new file

### Data shape

```typescript
export interface PortDef {
  tag: string;           // XML tag, e.g. "powerConsumer"
  resource: ResourceKind;
  direction: "consumer" | "producer";
  description: string;  // plain English, e.g. "Draws power to run electrolysis"
}

export interface AttributeDef {
  name: string;          // XML attribute name, e.g. "desiredFlowRates"
  type: "number" | "string" | "enum";
  unit?: string;         // e.g. "kg/tick"
  description: string;  // what changing this value does
  configurableViaXml: boolean; // false for hardcoded simulator internals
}

export interface MalfunctionBehavior {
  low: string;
  medium: string;
  severe: string;
  temporary: string;
  permanent: string;
}

export interface ModuleKnowledgeEntry {
  moduleType: string;            // matches MODULE_KINDS key, e.g. "OGS"
  summary: string;               // one sentence functional summary
  classHierarchy: string[];      // e.g. ["IBioModule", "BioModule", "SimBioModule", "OGS"]
  ports: PortDef[];
  attributes: AttributeDef[];
  malfunctionBehavior: MalfunctionBehavior;
  hiddenPhysicsNote?: string;    // runtime behavior not in XML; omit if none
}

export const MODULE_KNOWLEDGE: Record<string, ModuleKnowledgeEntry> = { ... };
```

### Content to author (all 18 module types)

Derived from the BioSim Java source audit (commit `edb93e81`). Key entries:

**OGS**
- Summary: "Electrolyzes potable water into O₂ and H₂; requires power."
- Class hierarchy: `IBioModule → BioModule → SimBioModule → OGS`
- Ports: powerConsumer, potableWaterConsumer → O2Producer, H2Producer
- Hidden physics: stoichiometry 2H₂O → 2H₂ + O₂; water consumed = `(powerConsumed / 75) × 0.04167 × tickLength`
- Malfunction: LOW = 5% output reduction; MEDIUM = 50% reduction; SEVERE = full shutdown

**VCCR**
- Summary: "Removes CO₂ from habitat air; requires power."
- Class hierarchy: `IBioModule → BioModule → SimBioModule → AbstractVCCR → VCCR`
- Ports: powerConsumer, airConsumer → airProducer, CO2Producer
- Hidden physics: 16 internal subsystems (desiccant beds, CO₂ beds, pumps, valves, heat exchanger) — interconnections hardcoded; `implementation` attribute selects DETAILED vs LINEAR physics fidelity
- Malfunction: affects subsystem operational state; SEVERE = full CO₂ removal failure

**WaterRS**
- Summary: "Recovers potable water from dirty and grey water; power-mode-dependent output."
- Class hierarchy: `IBioModule → BioModule → SimBioModule → AbstractWaterRS → WaterRS`
- Ports: powerConsumer, dirtyWaterConsumer, greyWaterConsumer → potableWaterProducer, greyWaterProducer
- Hidden physics: four operational modes selected each tick based on power — FULL (all 4 subsystems), PARTIAL (AES off, ~85% output), GREY_WATER_ONLY, OFF
- Malfunction: SEVERE → AES + RO both fail; MEDIUM → RO fails; LOW → AES fails

**Injector**
- Summary: "Generic pass-through: moves any resource from one store to another."
- Class hierarchy: `IBioModule → BioModule → SimBioModule → ResourceMover → Injector`
- Ports: all 13 consumer/producer pairs — active ones specified via XML
- Hidden physics: none — zero internal state; moves whatever `getMostResourceFromStores()` returns

**Stores (PowerStore, O2Store, CO2Store, H2Store, NitrogenStore, PotableWaterStore, GreyWaterStore, DirtyWaterStore, FoodStore, DryWasteStore)**
- Class hierarchy: `IBioModule → BioModule → PassiveModule → Store → <SpecificStore>`
- Attributes: `capacity`, `level`, `resupplyFrequency`, `resupplyAmount`, `pipe`
- Hidden physics: leak rates under malfunction — LOW: 5%/tick, MEDIUM: 10%/tick, SEVERE: 20%/tick; permanent malfunction reduces capacity by 50% / 75% / 100%

**SimEnvironment**
- Summary: "Habitat volume that holds air mixture; required root container for crew and air modules."
- Attributes: `initialO2Moles`, `initialCO2Moles`, `initialN2Moles`, `initialOtherMoles`, `initialVolume`

**Fan, Dehumidifier**
- Summary (Fan): "Circulates air between environments."
- Summary (Dehumidifier): "Removes water vapor from air, producing grey water."
- Hidden physics: hardcoded conversion ratios; not parameterizable beyond flow rates

**CrewGroup**
- Summary: "Group of crew members with activity schedules; consumes O₂/food/water, produces CO₂/waste."
- Note: crew module type is not a SimBioModule — it has its own scheduling subsystem

### Test steps

```bash
cd app
npx tsc --noEmit
```

Expected: zero TypeScript errors. All `MODULE_KNOWLEDGE` keys match `MODULE_KINDS` keys in `registry.ts`.

### Success criteria

- [ ] `moduleKnowledge.ts` exports `MODULE_KNOWLEDGE` with an entry for all 18 types in `MODULE_KINDS`
- [ ] Each entry has: summary, classHierarchy (≥2 entries), ports (≥1), attributes (≥1), malfunctionBehavior
- [ ] `npx tsc --noEmit` passes
- [ ] No network requests are made to populate this data

---

## Task 2 — Physics tooltips on palette items and canvas nodes

**Status:** 🔲 Not started  
**Prerequisites:** Task 1

### Objective

Surface the one-line summary and port list from `MODULE_KNOWLEDGE` as hover tooltips on (a) palette items in `Palette.tsx` and (b) module nodes in `ModuleNodeView.tsx`. Tooltip must appear within 300 ms and not obscure the canvas during drag operations.

### Design references

- `docs/03-requirements.md` F-KNOW-1 — content and timing requirement
- `docs/04-ui-ux-vision.md` §4.1, §6.4 — tooltip content spec

### Files to modify

- `app/src/ui/common/Palette.tsx` — add tooltip to each draggable item
- `app/src/ui/schematic/ModuleNodeView.tsx` — add tooltip to node on hover
- `app/src/ui/styles.css` — tooltip CSS (reuse if a generic class exists, otherwise add)

### Changes required

**Step A — Tooltip component**

Add a small `PhysicsTooltip` component (can live in `app/src/ui/common/PhysicsTooltip.tsx`) that accepts a `moduleType: string` prop, looks it up in `MODULE_KNOWLEDGE`, and renders:

```
<ModuleType> — <summary>
Consumes: <port1>, <port2>
Produces: <port3>, <port4>
Malfunction: <severe line from malfunctionBehavior.severe>
```

Use CSS `position: absolute` tooltip triggered by `onMouseEnter`/`onMouseLeave`. Delay show by 300 ms via `setTimeout` to avoid flicker during drag.

**Step B — Wire into Palette**

In `Palette.tsx`, wrap each module drag item with `<PhysicsTooltip moduleType={kind}>`. Suppress the tooltip during an active drag (check `isDragging` state if available from XYFlow DnD context, otherwise suppress on `onDragStart`).

**Step C — Wire into ModuleNodeView**

In `ModuleNodeView.tsx`, add `<PhysicsTooltip moduleType={data.type}>` positioned relative to the node. The tooltip should be suppressed when the node is selected (side panel is already visible).

### Test steps

1. `npm run dev` in `app/`
2. Open the app; hover over "OGS" in the palette for 300 ms
3. Tooltip should show summary, ports, and malfunction note
4. Hover over an OGS node on the schematic — same tooltip
5. Drag OGS from palette to canvas — tooltip should not appear during drag

### Success criteria

- [ ] Tooltip appears on palette items and canvas nodes within 300 ms of hover
- [ ] Tooltip shows: module name, one-sentence summary, consumer ports, producer ports, severe malfunction line
- [ ] Tooltip does not appear during drag operations
- [ ] Tooltip does not appear when the node is selected (side panel visible)
- [ ] No TypeScript errors (`npx tsc --noEmit`)

---

## Task 3 — Module Encyclopedia panel

**Status:** 🔲 Not started  
**Prerequisites:** Task 1

### Objective

Create a new `Encyclopedia` component that renders the full `ModuleKnowledgeEntry` for a selected module type. This panel is one of the three right-panel modes (Properties / Encyclopedia / Chat) defined in `docs/04-ui-ux-vision.md` §3 and §4.5.

### Design references

- `docs/03-requirements.md` F-KNOW-2 — required content per entry
- `docs/04-ui-ux-vision.md` §4.5 — layout and content spec

### Files to create / modify

- `app/src/ui/encyclopedia/Encyclopedia.tsx` — new file, the panel component
- `app/src/ui/encyclopedia/EncyclopediaEntry.tsx` — new file, full entry view

### Component structure

```
Encyclopedia
  ├── search input (filters by module name / subsystem)
  ├── module list (grouped by subsystem, same order as SUBSYSTEM_ORDER)
  │    └── click → shows EncyclopediaEntry
  └── EncyclopediaEntry
       ├── header: module name + subsystem badge + one-sentence summary
       ├── class hierarchy breadcrumb (e.g. IBioModule › BioModule › OGS)
       ├── Ports table: port name | resource | direction
       ├── Attributes table: name | type/unit | description | configurable?
       ├── Malfunction behavior: table with LOW/MEDIUM/SEVERE rows,
       │    TEMPORARY/PERMANENT columns
       └── Hidden physics note (if present) in a styled callout box
```

### Test steps

1. `npm run dev`
2. Switch right panel to Encyclopedia mode (Tab 2)
3. Click "OGS" in the list
4. Verify: class hierarchy shows `IBioModule › BioModule › SimBioModule › OGS`
5. Verify: ports table shows powerConsumer, potableWaterConsumer, O2Producer, H2Producer
6. Click "WaterRS" — verify hidden physics note about four power modes is shown
7. Click "Injector" — verify no hidden physics callout (field is absent)
8. Type "water" in search — list filters to water-subsystem modules

### Success criteria

- [ ] Encyclopedia lists all 18 module types grouped by subsystem
- [ ] Search filters list by module name or subsystem label
- [ ] Each entry shows: summary, class hierarchy, ports table, attributes table, malfunction behavior table
- [ ] WaterRS and VCCR entries show hidden physics callout; Injector does not
- [ ] "Configurable via XML: No" entries are visually distinguished (e.g. muted text or lock icon)
- [ ] No TypeScript errors

---

## Task 4 — Right-panel tab strip restructure

**Status:** 🔲 Not started  
**Prerequisites:** Tasks 2 and 3

### Objective

Restructure the right panel in `App.tsx` from a single always-visible `<SidePanel>` into a three-tab column: **Properties** (current SidePanel), **Encyclopedia** (Task 3), **Chat** (placeholder, wired in Task 5). Add a toggle to collapse/expand the entire right panel and a toggle for the left palette, per `docs/04-ui-ux-vision.md` §3.

### Design references

- `docs/04-ui-ux-vision.md` §3 — information architecture layout
- `docs/02-concept-of-operations.md` §4 — panel descriptions

### Files to modify

- `app/src/ui/App.tsx` — restructure right panel; add left palette toggle
- `app/src/ui/side-panel/SidePanel.tsx` — no content change; wrapping changes only
- `app/src/state/store.ts` — add `rightPanelTab: 'properties' | 'encyclopedia' | 'chat'` and `rightPanelOpen: boolean`, `palettePanelOpen: boolean` state
- `app/src/ui/styles.css` — tab strip styles; panel open/close transition

### Changes required

**Step A — Store additions**

Add to the Zustand store:
```typescript
rightPanelTab: 'properties' | 'encyclopedia' | 'chat';
rightPanelOpen: boolean;
paletteOpen: boolean;
setRightPanelTab: (tab: ...) => void;
setRightPanelOpen: (open: boolean) => void;
setPaletteOpen: (open: boolean) => void;
```

These are UI-only state — do not push onto the undo/redo history stack.

**Step B — App.tsx layout**

Replace `<SidePanel />` with:
```tsx
<div className={`right-panel ${rightPanelOpen ? 'open' : 'closed'}`}>
  <div className="right-panel-tabs">
    <button onClick={() => setRightPanelTab('properties')}>Properties</button>
    <button onClick={() => setRightPanelTab('encyclopedia')}>Encyclopedia</button>
    <button onClick={() => setRightPanelTab('chat')}>Chat</button>
    <button onClick={() => setRightPanelOpen(false)}>✕</button>
  </div>
  {rightPanelTab === 'properties' && <SidePanel />}
  {rightPanelTab === 'encyclopedia' && <Encyclopedia />}
  {rightPanelTab === 'chat' && <div className="chat-placeholder">LLM chat — coming in Task 5</div>}
</div>
```

Wrap `<Palette />` similarly with `paletteOpen` state and a show/hide toggle button.

**Step C — Keyboard shortcut**

Add `Shift+E` → open Encyclopedia tab; `Shift+L` → open Chat tab (wired fully in Task 5). Document in `KeyboardShortcutsModal.tsx`.

**Step D — Auto-switch to Properties on module select**

When a module is selected on the canvas, if the right panel is closed, open it and switch to the Properties tab (same behavior as current — the side panel appearing on selection).

### Test steps

1. `npm run dev`
2. Confirm three tabs appear at top of right panel
3. Switch to Encyclopedia — encyclopedia renders
4. Switch to Properties — side panel renders as before
5. Click the close (✕) button — right panel collapses
6. Click a canvas node — right panel re-opens on Properties tab
7. Toggle palette closed — canvas area expands; palette toggle button visible
8. Shift+E — switches to Encyclopedia tab; Shift+L — switches to Chat tab (placeholder)

### Success criteria

- [ ] Three tabs: Properties, Encyclopedia, Chat (placeholder)
- [ ] Tab state persists when switching canvas views (schematic → timeline → back)
- [ ] Right panel can be opened/closed; state preserved when closed
- [ ] Palette can be opened/closed
- [ ] Selecting a canvas module opens right panel to Properties
- [ ] `Shift+E` and `Shift+L` shortcuts work
- [ ] KeyboardShortcutsModal updated
- [ ] No regression: side panel editing still works in Properties tab
- [ ] No TypeScript errors

---

## Task 5 — LLM adapter + chat sidebar

**Status:** 🔲 Not started  
**Prerequisites:** Task 4

### Objective

Implement the LLM authoring assistant: a chat UI wired to the OpenAI `gpt-4o` API. Before each message, the current model is serialized to XML and included as context. If the response contains a full `.biosim` XML document, it is parsed and applied to the canvas (with undo support). Otherwise the response is shown as chat text only.

### Design references

- `docs/03-requirements.md` §1.9 F-LLM-1..6 and NF-11
- `docs/04-ui-ux-vision.md` §4.6 — chat sidebar layout and interaction rules
- `docs/05-system-architecture.md` §2.9, §4.6

### Files to create / modify

- `app/.env.example` — new file, documents `VITE_OPENAI_API_KEY`
- `app/src/llm/openaiAdapter.ts` — new file, OpenAI call + XML extraction
- `app/src/llm/systemPrompt.ts` — new file, BioSim system prompt constant
- `app/src/ui/chat/LlmChat.tsx` — new file, chat sidebar UI
- `app/src/state/store.ts` — add `chatMessages` state
- `app/package.json` — add `openai` dependency

### Changes required

**Step A — `.env.example`**

```bash
# Copy to .env and fill in your key. Never commit .env.
VITE_OPENAI_API_KEY=sk-...
```

Confirm `.env` is in `.gitignore` (it should be already from Vite defaults; verify).

**Step B — System prompt (`systemPrompt.ts`)**

```typescript
export const BIOSIM_SYSTEM_PROMPT = `
You are an expert assistant for BioSim, a NASA life-support simulator.
BioSim habitat configurations are defined by .biosim XML files.

Module types are fixed Java classes — users cannot create custom modules.
The available module types are: SimEnvironment, Fan, Dehumidifier,
NitrogenStore, VCCR, OGS, O2Store, H2Store, CO2Store, Injector,
WaterRS, DirtyWaterStore, GreyWaterStore, PotableWaterStore,
PowerStore, PowerPS, FoodStore, DryWasteStore, CrewGroup.

When the user asks you to create or modify a configuration:
1. Output your explanation first as plain text.
2. Then output the complete new .biosim XML document, starting with
   the XML declaration (<?xml version="1.0"?>) and containing the
   full BiosimInitConfig root element.
3. Do not wrap the XML in a code block — output raw XML.

When the user asks a question only (no config change needed), answer
in plain text only. Do not output XML unless a config change is requested.
`.trim();
```

**Step C — OpenAI adapter (`openaiAdapter.ts`)**

```typescript
import OpenAI from "openai";
import { BIOSIM_SYSTEM_PROMPT } from "./systemPrompt";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callLlm(
  history: LlmMessage[],
  userMessage: string,
  currentXml: string,
): Promise<string> {
  if (!apiKey) throw new Error("VITE_OPENAI_API_KEY is not set. Add it to your .env file.");

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const contextualMessage = `<configuration>\n${currentXml}\n</configuration>\n\n${userMessage}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: BIOSIM_SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: contextualMessage },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  return response.choices[0]?.message?.content ?? "";
}

/** Returns the XML string if the response contains a .biosim document, else null. */
export function extractXmlFromResponse(response: string): string | null {
  const match = response.match(/<\?xml[\s\S]*?<BiosimInitConfig[\s\S]*<\/BiosimInitConfig>/);
  return match ? match[0] : null;
}
```

**Step D — Chat store state**

Add to Zustand store (UI-only, not in undo history):
```typescript
chatMessages: Array<{ role: 'user' | 'assistant'; content: string; appliedConfig?: boolean }>;
addChatMessage: (msg: ...) => void;
clearChat: () => void;
```

**Step E — LlmChat component (`LlmChat.tsx`)**

Key behaviors:
- Shows `chatMessages` as a scrollable list (user messages right-aligned, assistant left-aligned)
- Context indicator at top: "Context: current config — N modules" (recompute from `doc` on render)
- If `VITE_OPENAI_API_KEY` is falsy, show setup instruction instead of input
- On send: append user message; call `callLlm()`; append assistant response; if `extractXmlFromResponse()` finds XML, parse it with `parseBiosim()` and call `setDoc()` (which pushes to undo stack); show "Canvas updated ↩ Undo" affordance in the message bubble
- Show loading indicator while awaiting API response
- On API error: show error text in chat, no crash

### Test steps

```bash
# 1. Install dependency
cd app && npm install openai

# 2. Create .env
echo "VITE_OPENAI_API_KEY=<your key>" > .env

# 3. Start dev server
npm run dev
```

In the browser:

1. Open Chat tab (right panel → Chat or `Shift+L`)
2. Context indicator shows module count of current config
3. Type: "What does the OGS module do?" — expect prose reply, no canvas change
4. Type: "Create a minimal two-crew lunar habitat" — expect prose + XML; canvas updates; "Canvas updated" banner appears with Undo link
5. Click Undo link — canvas reverts to previous state
6. Type: "Add a MEDIUM TEMPORARY malfunction on the OGS at tick 3000" — canvas and timeline update
7. Remove API key from `.env`, restart — Chat tab shows setup instruction instead of input

### Success criteria

- [ ] `openai` package installed; `npm run dev` and `npm run build` pass
- [ ] Chat sidebar renders in right panel Chat tab
- [ ] Context indicator shows current module count
- [ ] Question-only messages produce prose response; canvas unchanged
- [ ] Config-generation messages produce XML; canvas and all views update
- [ ] "Canvas updated" banner with functional Undo appears on config updates
- [ ] LLM sees its own prior config outputs in subsequent messages (F-LLM-6)
- [ ] API error shown in chat panel; no JavaScript exception thrown
- [ ] Missing API key shows setup instruction
- [ ] `npx tsc --noEmit` passes
- [ ] No regression in existing canvas editing, undo/redo, export

---

## Git workflow

### Commit strategy

Five independent task scopes → five commits, one per task. Each commit after Task 1 builds on the prior; none are squashable without losing bisect clarity.

```bash
# After Task 1
git add app/src/domain/moduleKnowledge.ts
git commit -m "..."

# After Task 2
git add app/src/ui/common/PhysicsTooltip.tsx app/src/ui/common/Palette.tsx app/src/ui/schematic/ModuleNodeView.tsx app/src/ui/styles.css
git commit -m "..."

# After Task 3
git add app/src/ui/encyclopedia/
git commit -m "..."

# After Task 4
git add app/src/ui/App.tsx app/src/ui/side-panel/SidePanel.tsx app/src/state/store.ts app/src/ui/styles.css app/src/ui/common/KeyboardShortcutsModal.tsx
git commit -m "..."

# After Task 5
git add app/src/llm/ app/src/ui/chat/ app/src/state/store.ts app/package.json app/package-lock.json app/.env.example
git commit -m "..."
```

After all five commits, record hashes in the Revision summary table above.

---

## Regression checklist (after all tasks)

Before marking the revision complete, verify that all cycle 1 acceptance journeys still work:

- [ ] **SCN-2** — open `template.biosim`, edit crew/malfunction, export; file runs in BioSim
- [ ] **SCN-3** — start from empty template, drag modules, wire, export
- [ ] **SCN-4** — open lunar minihab, add malfunctions on timeline, export
- [ ] Undo/redo still works across all edit operations
- [ ] Session autosave still works
- [ ] XML expert view round-trip still works
- [ ] Export review panel still shows warnings correctly
- [ ] `npm run build` produces a clean build with no TypeScript errors
