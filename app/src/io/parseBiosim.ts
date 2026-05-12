import { XMLParser } from "fast-xml-parser";
import type {
  AlarmBand,
  AlarmBandKind,
  BiosimDocument,
  CrewActivity,
  CrewPerson,
  FlowEndpoint,
  Globals,
  MalfunctionSpec,
  ModuleNode,
  SensorSpec,
  Subsystem,
  UnknownXml,
} from "../domain/types";
import { ENDPOINT_TAGS, MODULE_KINDS } from "../domain/registry";

const ATTR_PREFIX = "@_";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  // BioSim XSD examples often use the `biosim:` prefix on every tag; strip
  // the namespace so keys match our unprefixed model (F-MODEL-3 pass-through).
  removeNSPrefix: true,
  // preserve element ordering by accumulating any element that appears more
  // than once into an array
  isArray: () => true,
  allowBooleanAttributes: true,
  parseAttributeValue: false, // keep strings — we coerce ourselves
  trimValues: true,
});

/**
 * Parse a BioSim configuration XML into the canonical document model.
 *
 * The parser is intentionally permissive: anything we do not specifically
 * understand is preserved under `unknownChildren` / `unknownAttributes`
 * so we can round-trip on export (see docs/03-requirements.md F-MODEL-3).
 */
export function parseBiosim(xml: string, sourceName?: string): BiosimDocument {
  const tree = parser.parse(normalizeXml(xml));
  const root = tree?.biosim?.[0];
  if (!root) {
    throw new Error("Expected a <biosim> root element");
  }

  const globals = parseGlobals(root.Globals?.[0]);

  const modules: ModuleNode[] = [];
  const sensors: SensorSpec[] = [];
  const unknownRoot: UnknownXml[] = [];

  const simBioModules = root.SimBioModules?.[0];
  if (simBioModules) {
    for (const subsystemKey of Object.keys(simBioModules)) {
      if (subsystemKey.startsWith(ATTR_PREFIX)) continue;
      const subsystem = subsystemKey as Subsystem;
      if (!isSubsystem(subsystem)) {
        for (const node of childElements(simBioModules[subsystemKey])) {
          unknownRoot.push(xmlToUnknown(subsystemKey, node));
        }
        continue;
      }
      const items = childElements(simBioModules[subsystemKey]);
      for (const wrapper of items) {
        for (const tag of Object.keys(wrapper)) {
          if (tag.startsWith(ATTR_PREFIX)) continue;
          if (tag === "#text") continue;
          const nodes = childElements(wrapper[tag]);
          for (const node of nodes) {
            modules.push(parseModule(tag, node, subsystem));
          }
        }
      }
    }
  }

  const sensorsRoot = root.Sensors?.[0];
  if (sensorsRoot) {
    for (const subsystemKey of Object.keys(sensorsRoot)) {
      if (subsystemKey.startsWith(ATTR_PREFIX)) continue;
      const subsystem = isSubsystem(subsystemKey)
        ? (subsystemKey as Subsystem)
        : "environment";
      const items = childElements(sensorsRoot[subsystemKey]);
      for (const wrapper of items) {
        for (const tag of Object.keys(wrapper)) {
          if (tag.startsWith(ATTR_PREFIX)) continue;
          if (tag === "#text") continue;
          const nodes = childElements(wrapper[tag]);
          for (const node of nodes) {
            sensors.push(parseSensor(tag, node, subsystem));
          }
        }
      }
    }
  }

  return {
    sourceName,
    globals,
    modules,
    sensors,
    unknownRoot: unknownRoot.length ? unknownRoot : undefined,
  };
}

type XmlNode = Record<string, unknown>;

/** Child element lists from fast-xml-parser: must not iterate raw strings (that walks each character). */
function childElements(v: unknown): XmlNode[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter((x) => x != null && typeof x === "object") as XmlNode[];
  if (typeof v === "object") return [v as XmlNode];
  return [];
}

function parseGlobals(node: XmlNode | undefined): Globals {
  if (!node) return {};
  const attrs = takeAttrs(node);
  return {
    driverStutterLength: numOrUndef(attrs.driverStutterLength),
    crewsToWatch: attrs.crewsToWatch,
    runTillCrewDeath: boolOrUndef(attrs.runTillCrewDeath),
    runTillN: attrs.runTillN, // keep as string in case it's a template literal
    startPaused: boolOrUndef(attrs.startPaused),
    tickLength: numOrUndef(attrs.tickLength),
    unknownAttributes: passthroughAttrs(attrs, [
      "driverStutterLength",
      "crewsToWatch",
      "runTillCrewDeath",
      "runTillN",
      "startPaused",
      "tickLength",
    ]),
  };
}

function parseModule(tag: string, node: XmlNode, subsystem: Subsystem): ModuleNode {
  const attrs = takeAttrs(node);
  const moduleName = attrs.moduleName ?? "(unnamed)";
  const known = MODULE_KINDS[tag];
  const recognized = !!known;

  const endpoints: FlowEndpoint[] = [];
  const unknownChildren: UnknownXml[] = [];
  let malfunction: MalfunctionSpec | undefined;
  let crew: CrewPerson[] | undefined;

  for (const child of Object.keys(node)) {
    if (child.startsWith(ATTR_PREFIX)) continue;
    if (child === "#text") continue;
    for (const occ of childElements(node[child])) {
      const endpointMeta = ENDPOINT_TAGS[child];
      if (endpointMeta) {
        endpoints.push(parseEndpoint(child, occ));
        continue;
      }
      if (child === "malfunction") {
        malfunction = parseMalfunction(occ);
        continue;
      }
      if (child === "crewPerson") {
        crew ??= [];
        crew.push(parseCrewPerson(occ));
        continue;
      }
      unknownChildren.push(xmlToUnknown(child, occ));
    }
  }

  return {
    kind: tag,
    subsystem: recognized ? known.subsystem : subsystem,
    moduleName,
    attrs: passthroughAttrs(attrs, ["moduleName"]) ?? {},
    endpoints,
    malfunction,
    crew,
    unknownChildren: unknownChildren.length ? unknownChildren : undefined,
    unknownAttributes: recognized ? undefined : { __recognized: "false" },
  };
}

function parseEndpoint(tag: string, node: XmlNode): FlowEndpoint {
  const meta = ENDPOINT_TAGS[tag];
  const attrs = takeAttrs(node);
  const refsRaw = meta.kind === "consumer" ? attrs.inputs : attrs.outputs;
  const refs = refsRaw ? refsRaw.split(/\s+/).filter(Boolean) : [];
  const desiredFlowRates = numArr(attrs.desiredFlowRates);
  const maxFlowRates = numArr(attrs.maxFlowRates);
  return {
    kind: meta.kind,
    resource: meta.resource,
    refs,
    desiredFlowRates,
    maxFlowRates,
  };
}

function parseMalfunction(node: XmlNode): MalfunctionSpec {
  const attrs = takeAttrs(node);
  return {
    intensity: (attrs.intensity ?? "MEDIUM_MALF") as MalfunctionSpec["intensity"],
    length: (attrs.length ?? "TEMPORARY_MALF") as MalfunctionSpec["length"],
    occursAtTick: Number(attrs.occursAtTick ?? 0),
  };
}

function parseCrewPerson(node: XmlNode): CrewPerson {
  const attrs = takeAttrs(node);
  const schedule: CrewActivity[] = [];
  const scheduleNode = (node.schedule as XmlNode[] | undefined)?.[0];
  if (scheduleNode) {
    const activities = childElements(scheduleNode.activity);
    for (const a of activities) {
      const aa = takeAttrs(a);
      schedule.push({
        name: aa.name ?? "",
        intensity: Number(aa.intensity ?? 0),
        length: Number(aa.length ?? 0),
      });
    }
  }
  return {
    name: attrs.name ?? "(unnamed)",
    age: Number(attrs.age ?? 0),
    sex: (attrs.sex ?? "MALE") as CrewPerson["sex"],
    weight: Number(attrs.weight ?? 0),
    schedule,
  };
}

function parseSensor(tag: string, node: XmlNode, subsystem: Subsystem): SensorSpec {
  const attrs = takeAttrs(node);
  const alarms: AlarmBand[] = [];
  const alarmsNode = (node.alarms as XmlNode[] | undefined)?.[0];
  if (alarmsNode) {
    for (const band of Object.keys(alarmsNode)) {
      if (band.startsWith(ATTR_PREFIX)) continue;
      if (band === "#text") continue;
      for (const occ of childElements(alarmsNode[band])) {
        const bAttrs = takeAttrs(occ);
        alarms.push({
          kind: band as AlarmBandKind,
          min: Number(bAttrs.min ?? 0),
          max: Number(bAttrs.max ?? 0),
        });
      }
    }
  }
  const filterNode = (node.normalStochasticFilter as XmlNode[] | undefined)?.[0];
  const filterAttrs = filterNode ? takeAttrs(filterNode) : undefined;
  return {
    kind: tag,
    moduleName: attrs.moduleName ?? "(unnamed)",
    input: attrs.input ?? "",
    subsystem,
    gasType: attrs.gasType,
    alarms,
    normalStochasticFilter: filterAttrs
      ? { deviation: Number(filterAttrs.deviation ?? 0) }
      : undefined,
    unknownAttributes: passthroughAttrs(attrs, [
      "moduleName",
      "input",
      "gasType",
    ]),
  };
}

function xmlToUnknown(tag: string, node: XmlNode): UnknownXml {
  const attrs = takeAttrs(node);
  const children: UnknownXml[] = [];
  for (const k of Object.keys(node)) {
    if (k.startsWith(ATTR_PREFIX)) continue;
    if (k === "#text") continue;
    for (const occ of childElements(node[k])) {
      children.push(xmlToUnknown(k, occ));
    }
  }
  const textRaw = node["#text"];
  const text =
    typeof textRaw === "string"
      ? textRaw
      : Array.isArray(textRaw)
        ? textRaw.map(String).join("")
        : undefined;
  return { tag, attrs, children, text };
}

function takeAttrs(node: XmlNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(node)) {
    if (!k.startsWith(ATTR_PREFIX)) continue;
    const v = node[k];
    if (v == null) continue;
    out[k.slice(ATTR_PREFIX.length)] = String(v);
  }
  return out;
}

function passthroughAttrs(
  attrs: Record<string, string>,
  consumed: string[],
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const k of Object.keys(attrs)) {
    if (consumed.includes(k)) continue;
    out[k] = attrs[k];
  }
  return Object.keys(out).length ? out : undefined;
}

function numOrUndef(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function boolOrUndef(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

function numArr(v: string | undefined): number[] | undefined {
  if (v == null || v === "") return undefined;
  return v
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => Number(tok))
    .filter((n) => Number.isFinite(n));
}

const ALL_SUBSYSTEMS: Subsystem[] = [
  "environment",
  "air",
  "water",
  "power",
  "food",
  "waste",
  "framework",
  "crew",
];

function isSubsystem(s: string): s is Subsystem {
  return (ALL_SUBSYSTEMS as string[]).includes(s);
}

/**
 * Tolerate trailing junk after `</biosim>`. Some authored files include
 * leftovers from external templating tools (e.g. Python triple-quoted
 * f-strings); those are out of scope to "fix" — we just clip and parse.
 */
function normalizeXml(xml: string): string {
  const closers = ["</biosim:biosim>", "</biosim>"];
  let end = -1;
  let tagLen = 0;
  for (const c of closers) {
    const i = xml.lastIndexOf(c);
    if (i > end) {
      end = i;
      tagLen = c.length;
    }
  }
  if (end === -1) return xml;
  return xml.slice(0, end + tagLen);
}
