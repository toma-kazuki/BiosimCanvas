// Serialize a BiosimDocument back into BioSim-flavored XML.
//
// Goals:
//   - Output is XSD-valid for BioSim commit `edb93e81` (the pin from
//     docs/03-requirements.md NF-8).
//   - Semantic equivalence with the input on round-trip; *exact* byte
//     equality is not promised (NF-9 simpler-is-better; see F-EXPORT-4).
//   - Unknown elements/attributes preserved verbatim via the
//     `unknownChildren` / `unknownAttributes` pass-through fields
//     populated by parseBiosim() (F-MODEL-3).
//
// This file is intentionally string-based rather than DOM-based; the
// schema is shallow and a careful emitter is easier to audit than a
// generic XML serializer.

import type {
  BiosimDocument,
  FlowEndpoint,
  ModuleNode,
  SensorSpec,
  Subsystem,
  UnknownXml,
} from "../domain/types";
import { ENDPOINT_TAGS, SUBSYSTEM_ORDER } from "../domain/registry";

const INDENT = "\t"; // template.biosim uses tabs; match that.

export interface EmitOptions {
  /** Optional override for the xsi:schemaLocation header attribute. */
  schemaLocation?: string;
}

const DEFAULT_SCHEMA_LOCATION =
  "http://www.traclabs.com/biosim ../../schema/BiosimInitSchema.xsd";

export function emitBiosim(doc: BiosimDocument, opts: EmitOptions = {}): string {
  const lines: string[] = [];
  lines.push(
    `<biosim xmlns="http://www.traclabs.com/biosim"`,
  );
  lines.push(`${INDENT}xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`);
  lines.push(
    `${INDENT}xsi:schemaLocation="${escapeAttr(opts.schemaLocation ?? DEFAULT_SCHEMA_LOCATION)}">`,
  );

  emitGlobals(doc, lines, INDENT);
  emitSimBioModules(doc, lines, INDENT);
  emitSensors(doc, lines, INDENT);

  lines.push(`</biosim>`);
  return lines.join("\n") + "\n";
}

// --- Globals -------------------------------------------------------------

function emitGlobals(doc: BiosimDocument, out: string[], indent: string) {
  const g = doc.globals;
  const attrs: Array<[string, string]> = [];
  if (g.driverStutterLength !== undefined)
    attrs.push(["driverStutterLength", String(g.driverStutterLength)]);
  if (g.crewsToWatch !== undefined) attrs.push(["crewsToWatch", g.crewsToWatch]);
  if (g.runTillCrewDeath !== undefined)
    attrs.push(["runTillCrewDeath", String(g.runTillCrewDeath)]);
  if (g.runTillN !== undefined) attrs.push(["runTillN", String(g.runTillN)]);
  if (g.startPaused !== undefined) attrs.push(["startPaused", String(g.startPaused)]);
  if (g.tickLength !== undefined) attrs.push(["tickLength", String(g.tickLength)]);
  for (const [k, v] of Object.entries(g.unknownAttributes ?? {})) attrs.push([k, v]);

  if (attrs.length === 0) {
    out.push(`${indent}<Globals/>`);
    return;
  }
  out.push(`${indent}<Globals ${formatAttrs(attrs)}>`);
  out.push(`${indent}</Globals>`);
}

// --- SimBioModules -------------------------------------------------------

function emitSimBioModules(doc: BiosimDocument, out: string[], indent: string) {
  out.push(`${indent}<SimBioModules>`);

  // Group modules by subsystem in the BioSim-conventional order
  const bySub = new Map<Subsystem, ModuleNode[]>();
  for (const m of doc.modules) {
    if (!bySub.has(m.subsystem)) bySub.set(m.subsystem, []);
    bySub.get(m.subsystem)!.push(m);
  }

  const subIndent = indent + INDENT;
  const modIndent = subIndent + INDENT;

  for (const sub of SUBSYSTEM_ORDER) {
    const mods = bySub.get(sub);
    if (!mods || mods.length === 0) continue;
    out.push(`${subIndent}<${sub}>`);
    for (const m of mods) emitModule(m, out, modIndent);
    out.push(`${subIndent}</${sub}>`);
  }

  out.push(`${indent}</SimBioModules>`);
}

function emitModule(m: ModuleNode, out: string[], indent: string) {
  const attrs: Array<[string, string]> = [["moduleName", m.moduleName]];
  for (const [k, v] of Object.entries(m.attrs ?? {})) attrs.push([k, v]);

  const childIndent = indent + INDENT;
  const childLines: string[] = [];

  for (const ep of m.endpoints) emitEndpoint(ep, childLines, childIndent);

  if (m.malfunction) {
    const malfAttrs: Array<[string, string]> = [
      ["intensity", m.malfunction.intensity],
      ["length", m.malfunction.length],
      ["occursAtTick", String(m.malfunction.occursAtTick)],
    ];
    childLines.push(`${childIndent}<malfunction ${formatAttrs(malfAttrs)}/>`);
  }

  if (m.crew && m.crew.length > 0) {
    for (const c of m.crew) {
      const cAttrs: Array<[string, string]> = [
        ["age", String(c.age)],
        ["name", c.name],
        ["sex", c.sex],
        ["weight", String(c.weight)],
      ];
      childLines.push(`${childIndent}<crewPerson ${formatAttrs(cAttrs)}>`);
      childLines.push(`${childIndent}${INDENT}<schedule>`);
      for (const a of c.schedule) {
        const aAttrs: Array<[string, string]> = [
          ["intensity", String(a.intensity)],
          ["name", a.name],
          ["length", String(a.length)],
        ];
        childLines.push(
          `${childIndent}${INDENT}${INDENT}<activity ${formatAttrs(aAttrs)}/>`,
        );
      }
      childLines.push(`${childIndent}${INDENT}</schedule>`);
      childLines.push(`${childIndent}</crewPerson>`);
    }
  }

  if (m.unknownChildren) {
    for (const u of m.unknownChildren) emitUnknown(u, childLines, childIndent);
  }

  if (childLines.length === 0) {
    out.push(`${indent}<${m.kind} ${formatAttrs(attrs)}/>`);
    return;
  }

  out.push(`${indent}<${m.kind} ${formatAttrs(attrs)}>`);
  for (const line of childLines) out.push(line);
  out.push(`${indent}</${m.kind}>`);
}

function emitEndpoint(ep: FlowEndpoint, out: string[], indent: string) {
  // Find the XML tag that corresponds to this typed endpoint.
  const tag = Object.keys(ENDPOINT_TAGS).find(
    (k) =>
      ENDPOINT_TAGS[k].resource === ep.resource &&
      ENDPOINT_TAGS[k].kind === ep.kind,
  );
  if (!tag) {
    // Should be unreachable for v1-scope endpoints.
    return;
  }
  const attrs: Array<[string, string]> = [];
  if (ep.kind === "consumer") {
    attrs.push(["inputs", ep.refs.join(" ")]);
  } else {
    attrs.push(["outputs", ep.refs.join(" ")]);
  }
  if (ep.desiredFlowRates) {
    attrs.push(["desiredFlowRates", ep.desiredFlowRates.join(" ")]);
  }
  if (ep.maxFlowRates) {
    attrs.push(["maxFlowRates", ep.maxFlowRates.join(" ")]);
  }
  out.push(`${indent}<${tag} ${formatAttrs(attrs)}/>`);
}

function emitUnknown(u: UnknownXml, out: string[], indent: string) {
  const attrs = Object.entries(u.attrs).map<[string, string]>(([k, v]) => [k, v]);
  if (u.children.length === 0 && !u.text) {
    if (attrs.length === 0) out.push(`${indent}<${u.tag}/>`);
    else out.push(`${indent}<${u.tag} ${formatAttrs(attrs)}/>`);
    return;
  }
  const openTag =
    attrs.length === 0
      ? `<${u.tag}>`
      : `<${u.tag} ${formatAttrs(attrs)}>`;
  out.push(`${indent}${openTag}`);
  if (u.text) out.push(`${indent}${INDENT}${escapeText(u.text)}`);
  for (const c of u.children) emitUnknown(c, out, indent + INDENT);
  out.push(`${indent}</${u.tag}>`);
}

// --- Sensors -------------------------------------------------------------

function emitSensors(doc: BiosimDocument, out: string[], indent: string) {
  if (doc.sensors.length === 0) return;

  out.push(`${indent}<Sensors>`);

  const bySub = new Map<Subsystem, SensorSpec[]>();
  for (const s of doc.sensors) {
    if (!bySub.has(s.subsystem)) bySub.set(s.subsystem, []);
    bySub.get(s.subsystem)!.push(s);
  }

  const subIndent = indent + INDENT;
  const sIndent = subIndent + INDENT;

  for (const sub of SUBSYSTEM_ORDER) {
    const sensors = bySub.get(sub);
    if (!sensors || sensors.length === 0) continue;
    out.push(`${subIndent}<${sub}>`);
    for (const s of sensors) emitSensor(s, out, sIndent);
    out.push(`${subIndent}</${sub}>`);
  }

  out.push(`${indent}</Sensors>`);
}

function emitSensor(s: SensorSpec, out: string[], indent: string) {
  const attrs: Array<[string, string]> = [
    ["input", s.input],
    ["moduleName", s.moduleName],
  ];
  if (s.gasType !== undefined) attrs.push(["gasType", s.gasType]);
  for (const [k, v] of Object.entries(s.unknownAttributes ?? {})) attrs.push([k, v]);

  const childLines: string[] = [];
  const child = indent + INDENT;
  if (s.alarms.length > 0) {
    childLines.push(`${child}<alarms>`);
    const aIndent = child + INDENT;
    for (const b of s.alarms) {
      childLines.push(
        `${aIndent}<${b.kind} ${formatAttrs([
          ["min", String(b.min)],
          ["max", String(b.max)],
        ])}/>`,
      );
    }
    childLines.push(`${child}</alarms>`);
  }
  if (s.normalStochasticFilter) {
    childLines.push(
      `${child}<normalStochasticFilter ${formatAttrs([
        ["deviation", String(s.normalStochasticFilter.deviation)],
      ])}/>`,
    );
  }

  if (childLines.length === 0) {
    out.push(`${indent}<${s.kind} ${formatAttrs(attrs)}/>`);
    return;
  }
  out.push(`${indent}<${s.kind} ${formatAttrs(attrs)}>`);
  for (const line of childLines) out.push(line);
  out.push(`${indent}</${s.kind}>`);
}

// --- Helpers -------------------------------------------------------------

function formatAttrs(attrs: Array<[string, string]>): string {
  return attrs.map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(" ");
}

function escapeAttr(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function escapeText(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
