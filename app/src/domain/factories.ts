// Factory helpers for creating new BioSim entities (modules,
// endpoints, malfunctions, …) with sensible defaults.
//
// These are *just* shape constructors: the user is expected to refine
// values via the side panel after creation. We try to set enough
// defaults that the new module passes a casual eye-ball check
// (non-zero volumes, non-empty store capacities, etc.) without
// pretending to encode the full XSD.

import { MODULE_KINDS } from "./registry";
import type {
  BiosimDocument,
  FlowEndpoint,
  ModuleNode,
  ResourceKind,
} from "./types";

/**
 * Build a brand-new `ModuleNode` of the given XML element kind. The
 * caller is responsible for picking a unique `moduleName`
 * (`generateUniqueModuleName` is the canonical helper).
 *
 * Defaults are intentionally minimal: empty endpoints, empty crew, no
 * malfunction. Stores get nominal capacity/level so they don't render
 * with "lvl=" missing. Power producer gets a nominal generation cap.
 */
export function createDefaultModule(kind: string, name: string): ModuleNode {
  const meta = MODULE_KINDS[kind];
  if (!meta) throw new Error(`Unknown module kind: ${kind}`);

  const attrs: Record<string, string> = {};

  if (kind === "SimEnvironment") {
    attrs.initialVolume = "1000";
  } else if (/Store$/.test(kind)) {
    attrs.capacity = "1000";
    attrs.level = "0";
  } else if (kind === "PowerPS") {
    attrs.generationType = "NUCLEAR";
    attrs.upperPowerGeneration = "100000";
  }

  return {
    kind,
    subsystem: meta.subsystem,
    moduleName: name,
    attrs,
    endpoints: [],
  };
}

/**
 * Pick a unique `moduleName` for a new module of the given kind.
 * Strategy: try the bare kind first (e.g. "Fan"), then "Fan_2",
 * "Fan_3", … so the first instance of each kind reads cleanly.
 */
export function generateUniqueModuleName(
  doc: BiosimDocument,
  kind: string,
): string {
  const taken = new Set(doc.modules.map((m) => m.moduleName));
  if (!taken.has(kind)) return kind;
  let n = 2;
  while (taken.has(`${kind}_${n}`)) n++;
  return `${kind}_${n}`;
}

/**
 * Build an empty endpoint with the requested resource + direction.
 * Refs and flow rates start blank; the user fills them via the chip
 * picker / number-row in the side panel.
 */
export function createEmptyEndpoint(
  kind: "producer" | "consumer",
  resource: ResourceKind,
): FlowEndpoint {
  return { kind, resource, refs: [], desiredFlowRates: [], maxFlowRates: [] };
}
