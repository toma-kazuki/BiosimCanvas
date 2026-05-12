// Floor-plan layout helpers for the Spatial view.
//
// Mental model (set by user review on 2026-05-12):
//
//   * A `SimEnvironment` module is a *room* — a large box you place on
//     the floor plan.
//   * Any module with an air-port from env A and an air-port to env B
//     (with A ≠ B) is a *boundary connector* (Fans, in template.biosim).
//     Its position is computed automatically as the midpoint of the
//     two rooms; it is not freely draggable.
//   * Every other non-environment module (stores, hardware, crew
//     groups) belongs *inside* one SimEnvironment, chosen by inspecting
//     its air-port references (fallback: the first SimEnvironment in
//     the doc). Position inside is free.
//
// Sidecar JSON schema (v1) carries positions for SimEnvironment and
// the inside-room modules. Boundary connectors are not stored —
// they're always derived from the room geometry.

import type { BiosimDocument, ModuleNode, Position, SpatialLayout } from "./types";

export const SIDECAR_FORMAT = "biosim-canvas/spatial";
export const SIDECAR_VERSION = 1;

// --- node size constants (kept in one place for tests & layout) ----------

export const ENV_W = 480;
export const ENV_H = 360;
export const ENV_GAP = 80;
export const ENV_HEADER_H = 36;
export const ENV_PADDING = 16;

export const NODE_W = 168;
export const NODE_H = 64;

const ROW_H = NODE_H + 12;

// --- categorization ------------------------------------------------------

export interface BoundaryBridge {
  /** SimEnvironment module name that consumes from. */
  from: string;
  /** SimEnvironment module name that produces to. */
  to: string;
}

/**
 * If `m` is a connector between two SimEnvironments (e.g. a Fan that
 * takes air from `IHab` and pushes it into `HALO`), return the
 * `from → to` pair. Otherwise null.
 */
export function boundaryBridge(
  m: ModuleNode,
  simEnvNames: ReadonlySet<string>,
): BoundaryBridge | null {
  let from: string | undefined;
  let to: string | undefined;
  for (const ep of m.endpoints) {
    if (ep.resource !== "air") continue;
    if (ep.kind === "consumer") {
      const env = ep.refs.find((r) => simEnvNames.has(r));
      if (env) from = env;
    } else if (ep.kind === "producer") {
      const env = ep.refs.find((r) => simEnvNames.has(r));
      if (env) to = env;
    }
  }
  if (from && to && from !== to) return { from, to };
  return null;
}

/**
 * Which SimEnvironment should house `m`? Picked by scanning its
 * endpoints for the first SimEnvironment reference; falls back to the
 * first SimEnvironment in the document. The user can override by
 * dragging the module into a different room; that updates the stored
 * position, and re-hit-testing on render decides which room it's in.
 */
export function defaultContainerEnv(
  m: ModuleNode,
  simEnvs: ModuleNode[],
): string | undefined {
  if (simEnvs.length === 0) return undefined;
  const envNames = new Set(simEnvs.map((e) => e.moduleName));
  for (const ep of m.endpoints) {
    for (const r of ep.refs) {
      if (envNames.has(r)) return r;
    }
  }
  return simEnvs[0].moduleName;
}

// --- public helpers ------------------------------------------------------

export function collectSimEnvs(doc: BiosimDocument): ModuleNode[] {
  return doc.modules.filter((m) => m.kind === "SimEnvironment");
}

/**
 * Hit-test: which SimEnvironment box (in the given layout) contains
 * the point (px, py)? Returns the env's moduleName, or undefined.
 */
export function hitTestEnv(
  px: number,
  py: number,
  envBoxes: Map<string, { x: number; y: number; w: number; h: number }>,
): string | undefined {
  for (const [name, b] of envBoxes) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
      return name;
    }
  }
  return undefined;
}

/**
 * Effective box for a SimEnvironment: stored position+size if present,
 * otherwise a default tile in the side-by-side row.
 */
export function envBox(
  doc: BiosimDocument,
  env: ModuleNode,
  defaultLayout: SpatialLayout,
): { x: number; y: number; w: number; h: number } {
  const stored = doc.spatialLayout?.[env.moduleName];
  const fallback = defaultLayout[env.moduleName] ?? { x: 0, y: 0 };
  return {
    x: stored?.x ?? fallback.x,
    y: stored?.y ?? fallback.y,
    w: stored?.w ?? fallback.w ?? ENV_W,
    h: stored?.h ?? fallback.h ?? ENV_H,
  };
}

/**
 * Effective position for a regular (non-fan, non-env) module:
 * stored absolute position if present, else placed inside its default
 * container env in a vertical stack.
 */
export function modulePosition(
  doc: BiosimDocument,
  m: ModuleNode,
  defaultLayout: SpatialLayout,
): Position {
  const stored = doc.spatialLayout?.[m.moduleName];
  if (stored) return stored;
  return defaultLayout[m.moduleName] ?? { x: 0, y: 0 };
}

// --- default layout ------------------------------------------------------

const INSIDE_COLS = 2;

/**
 * Build the default floor plan when no sidecar has been loaded:
 *
 *   * SimEnvironments arrayed side-by-side, each sized to fit its
 *     contents in a 2-column grid.
 *   * Each inside-room module gets a slot in that grid, offset under
 *     the env header.
 *   * Boundary connectors (Fans) are NOT placed here; the renderer
 *     computes their positions from the room geometry.
 */
export function defaultSpatialLayout(doc: BiosimDocument): SpatialLayout {
  const layout: SpatialLayout = {};
  const simEnvs = collectSimEnvs(doc);
  if (simEnvs.length === 0) return layout;

  const envNames = new Set(simEnvs.map((e) => e.moduleName));

  // Pass 1: count inside-modules per env to size each box.
  const counts = new Map<string, number>();
  for (const m of doc.modules) {
    if (m.kind === "SimEnvironment") continue;
    if (boundaryBridge(m, envNames)) continue;
    const home = defaultContainerEnv(m, simEnvs);
    if (!home) continue;
    counts.set(home, (counts.get(home) ?? 0) + 1);
  }

  // Pass 2: place envs left-to-right with auto-fit height.
  const envOrigin = new Map<string, { x: number; y: number }>();
  let cursorX = 0;
  for (const env of simEnvs) {
    const n = counts.get(env.moduleName) ?? 0;
    const rows = Math.max(2, Math.ceil(n / INSIDE_COLS));
    const h = Math.max(
      ENV_H,
      ENV_HEADER_H + ENV_PADDING + rows * ROW_H + ENV_PADDING,
    );
    layout[env.moduleName] = { x: cursorX, y: 0, w: ENV_W, h };
    envOrigin.set(env.moduleName, { x: cursorX, y: 0 });
    cursorX += ENV_W + ENV_GAP;
  }

  // Pass 3: place inside-modules in a 2-column grid inside their home.
  const slot = new Map<string, number>();
  for (const m of doc.modules) {
    if (m.kind === "SimEnvironment") continue;
    if (boundaryBridge(m, envNames)) continue;
    const home = defaultContainerEnv(m, simEnvs);
    if (!home) continue;
    const origin = envOrigin.get(home)!;
    const i = slot.get(home) ?? 0;
    slot.set(home, i + 1);
    const row = Math.floor(i / INSIDE_COLS);
    const col = i % INSIDE_COLS;
    layout[m.moduleName] = {
      x: origin.x + ENV_PADDING + col * (NODE_W + ENV_PADDING),
      y: origin.y + ENV_HEADER_H + ENV_PADDING + row * ROW_H,
    };
  }

  return layout;
}

// --- boundary connector positions ---------------------------------------

/**
 * Compute the screen position of a boundary connector (e.g. a Fan
 * bridging IHab → HALO) from the geometry of the two rooms it spans.
 *
 * Right-handed envs: place at the mid-X between right-edge-of-from and
 * left-edge-of-to, vertically centred on the midpoint of the two
 * rooms. If multiple connectors share the same room pair, the caller
 * passes a stack-index (offset along the Y axis) so they don't pile
 * on top of each other.
 */
export function boundaryConnectorPosition(
  fromBox: { x: number; y: number; w: number; h: number },
  toBox: { x: number; y: number; w: number; h: number },
  stackOffset: number,
): Position {
  const aRight = fromBox.x + fromBox.w;
  const bLeft = toBox.x;
  const aCenterY = fromBox.y + fromBox.h / 2;
  const bCenterY = toBox.y + toBox.h / 2;
  const midX = (aRight + bLeft) / 2;
  const midY = (aCenterY + bCenterY) / 2;
  return {
    x: midX - NODE_W / 2,
    y: midY - NODE_H / 2 + stackOffset,
  };
}

export interface BoundaryConnector {
  module: ModuleNode;
  bridge: BoundaryBridge;
}

/**
 * Group boundary connectors by unordered room pair, sorted by module
 * name so the stack order is stable across renders.
 */
export function groupBoundaryConnectors(
  connectors: BoundaryConnector[],
): Map<string, BoundaryConnector[]> {
  const out = new Map<string, BoundaryConnector[]>();
  for (const c of connectors) {
    const key = [c.bridge.from, c.bridge.to].sort().join("|");
    const list = out.get(key) ?? [];
    list.push(c);
    out.set(key, list);
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.module.moduleName.localeCompare(b.module.moduleName));
  }
  return out;
}

// --- sidecar I/O ---------------------------------------------------------

export function serializeLayout(doc: BiosimDocument): string {
  return JSON.stringify(
    {
      format: SIDECAR_FORMAT,
      version: SIDECAR_VERSION,
      source: doc.sourceName ?? null,
      modules: doc.spatialLayout ?? {},
    },
    null,
    2,
  );
}

export function parseLayout(json: string): SpatialLayout {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error(`Not valid JSON: ${(e as Error).message}`);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Sidecar root must be an object");
  }
  const obj = data as Record<string, unknown>;
  if (obj.format !== SIDECAR_FORMAT) {
    throw new Error(
      `Not a BioSimCanvas spatial layout (expected "format": "${SIDECAR_FORMAT}")`,
    );
  }
  if (typeof obj.version !== "number" || obj.version > SIDECAR_VERSION) {
    throw new Error(`Unsupported sidecar version: ${String(obj.version)}`);
  }

  const out: SpatialLayout = {};
  const mods = obj.modules;
  if (mods && typeof mods === "object") {
    for (const [name, raw] of Object.entries(mods as Record<string, unknown>)) {
      if (raw && typeof raw === "object") {
        const p = raw as Record<string, unknown>;
        if (typeof p.x === "number" && typeof p.y === "number") {
          const pos: Position = { x: p.x, y: p.y };
          if (typeof p.w === "number") pos.w = p.w;
          if (typeof p.h === "number") pos.h = p.h;
          out[name] = pos;
        }
      }
    }
  }
  return out;
}

export function sidecarFilename(sourceName: string | undefined): string {
  const base = sourceName?.replace(/\.canvas\.json$/i, "") ?? "untitled.biosim";
  return `${base}.canvas.json`;
}
