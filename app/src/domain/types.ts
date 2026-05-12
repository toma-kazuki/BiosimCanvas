// Canonical in-memory model for BioSimCanvas.
//
// The model intentionally covers ONLY the subset of the BioSim schema used
// by `template.biosim` and `lunar/minihab.biosim` (the v1 acceptance targets).
// Anything we do not yet model is kept verbatim on the parent node as
// `unknownChildren` / `unknownAttributes` so we can round-trip unchanged.
//
// See docs/03-requirements.md §F-MODEL-* for the contract this implements.

export type Subsystem =
  | "environment"
  | "air"
  | "water"
  | "power"
  | "food"
  | "waste"
  | "framework"
  | "crew";

export type ResourceKind =
  | "air"
  | "O2"
  | "CO2"
  | "H2"
  | "nitrogen"
  | "vapor"
  | "potableWater"
  | "greyWater"
  | "dirtyWater"
  | "power"
  | "food"
  | "biomass"
  | "dryWaste";

/**
 * Producer / consumer endpoints on a module. A module can declare any
 * subset of these; only the ones present in the XML are kept.
 *
 * `inputs` / `outputs` are space-separated names in the source XML; we
 * normalize to string arrays.
 */
export interface FlowEndpoint {
  kind: "consumer" | "producer";
  resource: ResourceKind;
  /** target module names; for consumers these are "inputs", for producers "outputs" */
  refs: string[];
  desiredFlowRates?: number[];
  maxFlowRates?: number[];
}

export interface MalfunctionSpec {
  intensity: "SEVERE_MALF" | "MEDIUM_MALF" | "LOW_MALF";
  length: "TEMPORARY_MALF" | "PERMANENT_MALF";
  occursAtTick: number;
}

export interface CrewActivity {
  name: string;
  intensity: number;
  length: number;
}

export interface CrewPerson {
  name: string;
  age: number;
  sex: "MALE" | "FEMALE";
  weight: number;
  schedule: CrewActivity[];
}

export type AlarmBandKind =
  | "critical_low"
  | "warning_low"
  | "warning_high"
  | "critical_high";

export interface AlarmBand {
  kind: AlarmBandKind;
  min: number;
  max: number;
}

export interface SensorSpec {
  /** module type from the schema, e.g. GasPressureSensor */
  kind: string;
  moduleName: string;
  /** the environment the sensor reads from */
  input: string;
  gasType?: string;
  alarms: AlarmBand[];
  /** optional noise filter (preserved verbatim for now) */
  normalStochasticFilter?: { deviation: number };
  /** anything else we did not model */
  unknownAttributes?: Record<string, string>;
}

/**
 * One module in the producer/consumer graph. `kind` is the element tag
 * (e.g. SimEnvironment, OGS, VCCR, …). `attrs` keeps all primitive
 * attributes we parsed (and any we did not understand, for round-trip).
 */
export interface ModuleNode {
  /** XML element name (e.g. "SimEnvironment", "OGS", "Fan") */
  kind: string;
  /** Subsystem grouping in the XML (`<environment>…</environment>`, etc.) */
  subsystem: Subsystem;
  /** moduleName attribute; must be unique across the model */
  moduleName: string;
  /** Numeric / enum primitive attributes (initialVolume, capacity, level, etc.). */
  attrs: Record<string, string>;
  /** Producer / consumer endpoints declared on this module. */
  endpoints: FlowEndpoint[];
  /** Single optional config-time malfunction (Framework.xsd: maxOccurs=1). */
  malfunction?: MalfunctionSpec;
  /** For crew groups, the crew members. */
  crew?: CrewPerson[];
  /** Free-form children we did not model, kept for round-trip pass-through. */
  unknownChildren?: UnknownXml[];
  /** Attributes we did not specifically pluck out, kept for round-trip. */
  unknownAttributes?: Record<string, string>;
}

/** Verbatim chunk of XML kept for pass-through round-trip. */
export interface UnknownXml {
  tag: string;
  attrs: Record<string, string>;
  children: UnknownXml[];
  text?: string;
}

export interface Globals {
  driverStutterLength?: number;
  crewsToWatch?: string;
  runTillCrewDeath?: boolean;
  runTillN?: number | string; // may be a template literal like "{max_ticks}"
  startPaused?: boolean;
  tickLength?: number;
  unknownAttributes?: Record<string, string>;
}

/**
 * Top-level document model. Maps roughly 1:1 to the `<biosim>` root.
 */
export interface BiosimDocument {
  /** Original file name if any (useful for the title bar). */
  sourceName?: string;
  globals: Globals;
  modules: ModuleNode[];
  sensors: SensorSpec[];
  /** Anything else under <SimBioModules> / <Sensors> we did not model. */
  unknownRoot?: UnknownXml[];
}

/**
 * Lightweight ID accessor — module names are the natural identifier in
 * BioSim XML, but we expose this so callers can switch to UUIDs later
 * without churning every call site.
 */
export function idOf(m: ModuleNode): string {
  return m.moduleName;
}
