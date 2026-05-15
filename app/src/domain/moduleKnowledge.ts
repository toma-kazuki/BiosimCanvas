import type { ResourceKind } from "./types";

// ---------------------------------------------------------------------------
// Static, curated knowledge base for all v1 BioSim module types.
//
// Content is derived from the BioSim Java source at commit edb93e81
// (v2.0.0-35-gedb93e81). Update this file when NF-8 (schema pin) changes.
//
// Used by: physics tooltips (F-KNOW-1), Module Encyclopedia (F-KNOW-2),
//          and optionally the LLM system prompt (F-LLM-*).
// ---------------------------------------------------------------------------

export interface PortDef {
  tag: string;
  resource: ResourceKind;
  direction: "consumer" | "producer";
  description: string;
}

export interface AttributeDef {
  name: string;
  type: "number" | "string" | "enum" | "boolean";
  unit?: string;
  description: string;
  /** false = hardcoded in Java; not settable via XML config */
  configurableViaXml: boolean;
}

export interface MalfunctionBehavior {
  low: string;
  medium: string;
  severe: string;
  temporary: string;
  permanent: string;
}

export interface ModuleKnowledgeEntry {
  moduleType: string;
  summary: string;
  /** Ancestry from root interface down to concrete class. */
  classHierarchy: string[];
  ports: PortDef[];
  attributes: AttributeDef[];
  malfunctionBehavior: MalfunctionBehavior;
  /** Describe runtime behavior invisible in the XML. Omit if none. */
  hiddenPhysicsNote?: string;
}

// ---------------------------------------------------------------------------
// Shared attribute definitions reused across many module types
// ---------------------------------------------------------------------------

const FLOW_RATE_ATTRS: AttributeDef[] = [
  {
    name: "desiredFlowRates",
    type: "number",
    unit: "kg/tick (space-separated per store)",
    description:
      "How much of the resource the module wants to move each tick. " +
      "The simulator satisfies this up to the available amount.",
    configurableViaXml: true,
  },
  {
    name: "maxFlowRates",
    type: "number",
    unit: "kg/tick (space-separated per store)",
    description: "Hard upper bound on flow per connected store per tick.",
    configurableViaXml: true,
  },
];

const STORE_CORE_ATTRS: AttributeDef[] = [
  {
    name: "capacity",
    type: "number",
    unit: "kg",
    description: "Maximum amount the store can hold.",
    configurableViaXml: true,
  },
  {
    name: "level",
    type: "number",
    unit: "kg",
    description: "Initial fill level at simulation start.",
    configurableViaXml: true,
  },
  {
    name: "resupplyFrequency",
    type: "number",
    unit: "ticks",
    description:
      "How often the store is automatically replenished. 0 = never.",
    configurableViaXml: true,
  },
  {
    name: "resupplyAmount",
    type: "number",
    unit: "kg",
    description: "Amount added per resupply event.",
    configurableViaXml: true,
  },
  {
    name: "pipe",
    type: "boolean",
    description:
      "When true, the store acts as a pipe: capacity resets to current level each tick, " +
      "effectively preventing accumulation.",
    configurableViaXml: true,
  },
];

const STORE_MALFUNCTION: MalfunctionBehavior = {
  low: "Store leaks 5% of current level per tick.",
  medium: "Store leaks 10% of current level per tick.",
  severe: "Store leaks 20% of current level per tick.",
  temporary: "Leaking stops when the malfunction ends.",
  permanent: "Additionally reduces maximum capacity (LOW: ×0.5, MEDIUM: ×0.25, SEVERE: →0).",
};

// ---------------------------------------------------------------------------
// Knowledge entries
// ---------------------------------------------------------------------------

export const MODULE_KNOWLEDGE: Record<string, ModuleKnowledgeEntry> = {

  // ── Environment ──────────────────────────────────────────────────────────

  SimEnvironment: {
    moduleType: "SimEnvironment",
    summary:
      "Habitat volume that holds a mixed gas atmosphere; required container for crew and air-processing modules.",
    classHierarchy: ["IBioModule", "BioModule", "SimBioModule", "SimEnvironment"],
    ports: [
      {
        tag: "airConsumer",
        resource: "air",
        direction: "consumer",
        description: "Receives processed air (e.g. from VCCR output).",
      },
      {
        tag: "airProducer",
        resource: "air",
        direction: "producer",
        description: "Supplies air to consumers (e.g. VCCR, crew).",
      },
    ],
    attributes: [
      {
        name: "initialO2Moles",
        type: "number",
        unit: "mol",
        description: "Initial moles of O₂ in the environment at simulation start.",
        configurableViaXml: true,
      },
      {
        name: "initialCO2Moles",
        type: "number",
        unit: "mol",
        description: "Initial moles of CO₂.",
        configurableViaXml: true,
      },
      {
        name: "initialN2Moles",
        type: "number",
        unit: "mol",
        description: "Initial moles of N₂.",
        configurableViaXml: true,
      },
      {
        name: "initialOtherMoles",
        type: "number",
        unit: "mol",
        description: "Initial moles of trace gases.",
        configurableViaXml: true,
      },
      {
        name: "initialVolume",
        type: "number",
        unit: "m³",
        description: "Total pressurized volume. Affects partial pressure calculations.",
        configurableViaXml: true,
      },
      ...FLOW_RATE_ATTRS,
    ],
    malfunctionBehavior: {
      low: "Minor atmosphere leak; gas composition drifts slowly.",
      medium: "Moderate leak; partial pressure imbalance affects crew metabolism.",
      severe: "Rapid depressurization; crew life-support at immediate risk.",
      temporary: "Leak stops at malfunction end.",
      permanent: "Permanent reduction in effective volume.",
    },
  },

  Fan: {
    moduleType: "Fan",
    summary: "Circulates air between two environments to equalize gas composition.",
    classHierarchy: ["IBioModule", "BioModule", "SimBioModule", "Fan"],
    ports: [
      {
        tag: "airConsumer",
        resource: "air",
        direction: "consumer",
        description: "Draws air from one environment.",
      },
      {
        tag: "airProducer",
        resource: "air",
        direction: "producer",
        description: "Pushes air into another environment.",
      },
      {
        tag: "powerConsumer",
        resource: "power",
        direction: "consumer",
        description: "Draws power to run the fan motor.",
      },
    ],
    attributes: FLOW_RATE_ATTRS,
    malfunctionBehavior: {
      low: "Reduced airflow; slower gas equalization between environments.",
      medium: "Significantly reduced airflow; environments may stratify.",
      severe: "Fan stops; no air circulation between connected environments.",
      temporary: "Fan resumes after malfunction ends.",
      permanent: "Fan is permanently disabled.",
    },
  },

  Dehumidifier: {
    moduleType: "Dehumidifier",
    summary:
      "Removes water vapor from habitat air, producing grey water as a byproduct.",
    classHierarchy: ["IBioModule", "BioModule", "SimBioModule", "Dehumidifier"],
    ports: [
      {
        tag: "airConsumer",
        resource: "air",
        direction: "consumer",
        description: "Takes humid air from the environment.",
      },
      {
        tag: "airProducer",
        resource: "air",
        direction: "producer",
        description: "Returns drier air to the environment.",
      },
      {
        tag: "greyWaterProducer",
        resource: "greyWater",
        direction: "producer",
        description: "Outputs condensed water vapor as grey water.",
      },
      {
        tag: "powerConsumer",
        resource: "power",
        direction: "consumer",
        description: "Draws power to run condensation process.",
      },
    ],
    attributes: FLOW_RATE_ATTRS,
    malfunctionBehavior: {
      low: "Reduced condensation efficiency; humidity rises slightly.",
      medium: "Significantly reduced output; habitat humidity climbs.",
      severe: "No condensation; humidity uncontrolled.",
      temporary: "Efficiency restored after malfunction ends.",
      permanent: "Permanently degraded; humidity management compromised.",
    },
  },

  // ── Air ──────────────────────────────────────────────────────────────────

  OGS: {
    moduleType: "OGS",
    summary:
      "Electrolyzes potable water into O₂ and H₂; primary oxygen source for the habitat.",
    classHierarchy: ["IBioModule", "BioModule", "SimBioModule", "OGS"],
    ports: [
      {
        tag: "powerConsumer",
        resource: "power",
        direction: "consumer",
        description: "Draws power to drive electrolysis.",
      },
      {
        tag: "potableWaterConsumer",
        resource: "potableWater",
        direction: "consumer",
        description: "Consumes potable water as electrolysis feedstock.",
      },
      {
        tag: "O2Producer",
        resource: "O2",
        direction: "producer",
        description: "Outputs O₂ to an O₂ store.",
      },
      {
        tag: "H2Producer",
        resource: "H2",
        direction: "producer",
        description: "Outputs H₂ byproduct to an H₂ store.",
      },
    ],
    attributes: FLOW_RATE_ATTRS,
    malfunctionBehavior: {
      low: "O₂ and H₂ output reduced by ~5%; water consumption unchanged.",
      medium: "Output reduced by ~50%; power draw proportionally reduced.",
      severe: "Electrolysis stops; no O₂ or H₂ produced.",
      temporary: "Production resumes after malfunction ends.",
      permanent: "Permanent capacity reduction; OGS cannot recover to full output.",
    },
    hiddenPhysicsNote:
      "Stoichiometry: 2H₂O → 2H₂ + O₂. Water consumed per tick = " +
      "(powerConsumed / 75) × 0.04167 × tickLength. " +
      "Molar conversion: liters → moles via (liters × 1000) / 18.015. " +
      "Power and water consumption are coupled — reducing power also reduces water draw.",
  },

  VCCR: {
    moduleType: "VCCR",
    summary:
      "Removes CO₂ from habitat air using a two-bed adsorption process; requires power.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "SimBioModule",
      "AbstractVCCR",
      "VCCR",
    ],
    ports: [
      {
        tag: "powerConsumer",
        resource: "power",
        direction: "consumer",
        description: "Drives the internal pumps and valves.",
      },
      {
        tag: "airConsumer",
        resource: "air",
        direction: "consumer",
        description: "Draws cabin air containing CO₂.",
      },
      {
        tag: "airProducer",
        resource: "air",
        direction: "producer",
        description: "Returns cleaned air to the environment.",
      },
      {
        tag: "CO2Producer",
        resource: "CO2",
        direction: "producer",
        description: "Outputs extracted CO₂ to a CO₂ store.",
      },
    ],
    attributes: [
      {
        name: "implementation",
        type: "enum",
        description:
          'Selects physics fidelity: "DETAILED" runs the full 16-subsystem model; ' +
          '"LINEAR" uses a simplified linear approximation (faster, less accurate).',
        configurableViaXml: true,
      },
      ...FLOW_RATE_ATTRS,
    ],
    malfunctionBehavior: {
      low: "Reduced CO₂ removal rate; cabin CO₂ rises slowly.",
      medium: "CO₂ removal significantly impaired; cabin levels approach warning threshold.",
      severe: "CO₂ removal stops; cabin CO₂ rises rapidly.",
      temporary: "CO₂ removal resumes after malfunction ends.",
      permanent: "Permanent capacity reduction.",
    },
    hiddenPhysicsNote:
      "DETAILED mode contains 16 internal subsystems — 2 desiccant beds, 2 CO₂ adsorption beds, " +
      "2 pumps, 1 heat exchanger, and 9 valves — whose interconnections are hardcoded in the " +
      "Java constructor and are not configurable via XML. " +
      "The subsystems tick independently each simulation step. " +
      "Only the overall flow rates and the implementation mode are XML-configurable.",
  },

  NitrogenStore: {
    moduleType: "NitrogenStore",
    summary: "Stores pressurized N₂; used for atmosphere top-up and pressure regulation.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "NitrogenStore",
    ],
    ports: [
      {
        tag: "nitrogenConsumer",
        resource: "nitrogen",
        direction: "consumer",
        description: "Receives N₂ from producers (e.g. resupply).",
      },
      {
        tag: "nitrogenProducer",
        resource: "nitrogen",
        direction: "producer",
        description: "Supplies N₂ to consumers (e.g. environment top-up).",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  O2Store: {
    moduleType: "O2Store",
    summary: "Stores O₂ produced by OGS for distribution to environments and crew.",
    classHierarchy: ["IBioModule", "BioModule", "PassiveModule", "Store", "O2Store"],
    ports: [
      {
        tag: "O2Consumer",
        resource: "O2",
        direction: "consumer",
        description: "Receives O₂ (e.g. from OGS).",
      },
      {
        tag: "O2Producer",
        resource: "O2",
        direction: "producer",
        description: "Supplies O₂ to consumers (e.g. environment, crew).",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  H2Store: {
    moduleType: "H2Store",
    summary: "Stores H₂ byproduct from OGS electrolysis.",
    classHierarchy: ["IBioModule", "BioModule", "PassiveModule", "Store", "H2Store"],
    ports: [
      {
        tag: "H2Consumer",
        resource: "H2",
        direction: "consumer",
        description: "Receives H₂ (e.g. from OGS).",
      },
      {
        tag: "H2Producer",
        resource: "H2",
        direction: "producer",
        description: "Supplies H₂ to downstream consumers.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  CO2Store: {
    moduleType: "CO2Store",
    summary: "Stores CO₂ extracted by VCCR; may feed Sabatier or venting systems.",
    classHierarchy: ["IBioModule", "BioModule", "PassiveModule", "Store", "CO2Store"],
    ports: [
      {
        tag: "CO2Consumer",
        resource: "CO2",
        direction: "consumer",
        description: "Receives CO₂ (e.g. from VCCR).",
      },
      {
        tag: "CO2Producer",
        resource: "CO2",
        direction: "producer",
        description: "Supplies CO₂ to downstream consumers.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  // ── Framework ─────────────────────────────────────────────────────────────

  Injector: {
    moduleType: "Injector",
    summary:
      "Generic pass-through: moves any resource from one set of stores to another; implements all consumer/producer interfaces.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "SimBioModule",
      "ResourceMover",
      "Injector",
    ],
    ports: [
      {
        tag: "airConsumer / airProducer",
        resource: "air",
        direction: "consumer",
        description: "Can pass air. Only the pairs declared in XML are active.",
      },
      {
        tag: "O2Consumer / O2Producer",
        resource: "O2",
        direction: "consumer",
        description: "Can pass O₂.",
      },
      {
        tag: "potableWaterConsumer / potableWaterProducer",
        resource: "potableWater",
        direction: "consumer",
        description: "Can pass potable water.",
      },
      {
        tag: "powerConsumer / powerProducer",
        resource: "power",
        direction: "consumer",
        description: "Can pass power.",
      },
    ],
    attributes: [
      {
        name: "(any consumer/producer pair)",
        type: "string",
        description:
          "Injector implements all 13 consumer/producer resource pairs. " +
          "Only the pairs with inputs/outputs specified in XML are active. " +
          "Each active pair has desiredFlowRates and maxFlowRates.",
        configurableViaXml: true,
      },
      ...FLOW_RATE_ATTRS,
    ],
    malfunctionBehavior: {
      low: "Reduced transfer rate on all active resource pairs.",
      medium: "Significantly reduced transfer; downstream modules may starve.",
      severe: "All resource transfer stops.",
      temporary: "Transfer resumes after malfunction ends.",
      permanent: "Permanent capacity reduction.",
    },
    hiddenPhysicsNote:
      "Injector has zero internal state — it simply calls getMostResourceFromStores() " +
      "each tick and pushes the result. It implements all 13 BioSim resource interfaces " +
      "simultaneously; only the ones with XML-declared inputs/outputs actually move material.",
  },

  // ── Water ─────────────────────────────────────────────────────────────────

  WaterRS: {
    moduleType: "WaterRS",
    summary:
      "Recovers potable water from dirty and grey water; output rate depends on available power.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "SimBioModule",
      "AbstractWaterRS",
      "WaterRS",
    ],
    ports: [
      {
        tag: "powerConsumer",
        resource: "power",
        direction: "consumer",
        description: "Drives the four internal processing subsystems.",
      },
      {
        tag: "dirtyWaterConsumer",
        resource: "dirtyWater",
        direction: "consumer",
        description: "Receives wastewater from crew and other sources.",
      },
      {
        tag: "greyWaterConsumer",
        resource: "greyWater",
        direction: "consumer",
        description: "Receives grey water (e.g. from dehumidifier).",
      },
      {
        tag: "potableWaterProducer",
        resource: "potableWater",
        direction: "producer",
        description: "Outputs recovered potable water.",
      },
      {
        tag: "greyWaterProducer",
        resource: "greyWater",
        direction: "producer",
        description: "Outputs partially processed grey water in lower-power modes.",
      },
    ],
    attributes: FLOW_RATE_ATTRS,
    malfunctionBehavior: {
      low: "AES subsystem fails; system drops to PARTIAL mode (~85% potable output).",
      medium: "RO subsystem fails; system drops to GREY_WATER_ONLY mode.",
      severe: "Both AES and RO fail; no potable water produced.",
      temporary: "Affected subsystems recover after malfunction ends.",
      permanent: "Permanently reduced recovery capacity.",
    },
    hiddenPhysicsNote:
      "WaterRS contains 4 internal processing subsystems (BWP, RO, AES, PPS). " +
      "Each tick the simulator selects one of four operational modes based on available power:\n" +
      "• FULL — all 4 subsystems on; maximum potable water output\n" +
      "• PARTIAL — AES off; ~85% potable output; lower power draw\n" +
      "• GREY_WATER_ONLY — only BWP + RO; no potable water\n" +
      "• OFF — all subsystems disabled\n" +
      "Mode selection is automatic and not configurable via XML. " +
      "Increasing desiredFlowRates on the powerConsumer unlocks higher modes.",
  },

  DirtyWaterStore: {
    moduleType: "DirtyWaterStore",
    summary: "Collects wastewater from crew and processes; feeds WaterRS for recovery.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "DirtyWaterStore",
    ],
    ports: [
      {
        tag: "dirtyWaterConsumer",
        resource: "dirtyWater",
        direction: "consumer",
        description: "Receives dirty water from crew/environment.",
      },
      {
        tag: "dirtyWaterProducer",
        resource: "dirtyWater",
        direction: "producer",
        description: "Supplies dirty water to WaterRS.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  GreyWaterStore: {
    moduleType: "GreyWaterStore",
    summary: "Buffers grey water between dehumidifier/WaterRS outputs and WaterRS inputs.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "GreyWaterStore",
    ],
    ports: [
      {
        tag: "greyWaterConsumer",
        resource: "greyWater",
        direction: "consumer",
        description: "Receives grey water.",
      },
      {
        tag: "greyWaterProducer",
        resource: "greyWater",
        direction: "producer",
        description: "Supplies grey water to WaterRS.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  PotableWaterStore: {
    moduleType: "PotableWaterStore",
    summary: "Stores potable water for crew consumption and OGS feedstock.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "PotableWaterStore",
    ],
    ports: [
      {
        tag: "potableWaterConsumer",
        resource: "potableWater",
        direction: "consumer",
        description: "Receives potable water (e.g. from WaterRS, OGS feedstock loop).",
      },
      {
        tag: "potableWaterProducer",
        resource: "potableWater",
        direction: "producer",
        description: "Supplies potable water to crew and OGS.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  // ── Power ─────────────────────────────────────────────────────────────────

  PowerStore: {
    moduleType: "PowerStore",
    summary: "Stores electrical power (battery/capacitor model) for distribution.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "PowerStore",
    ],
    ports: [
      {
        tag: "powerConsumer",
        resource: "power",
        direction: "consumer",
        description: "Receives power from generators/producers.",
      },
      {
        tag: "powerProducer",
        resource: "power",
        direction: "producer",
        description: "Distributes power to all consuming modules.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: {
      ...STORE_MALFUNCTION,
      severe:
        "Power store leaks 20% of current level per tick; permanent SEVERE reduces capacity to 0 (total failure).",
    },
  },

  PowerPS: {
    moduleType: "PowerPS",
    summary: "Power production source (solar array, fuel cell, etc.); generates power each tick.",
    classHierarchy: ["IBioModule", "BioModule", "SimBioModule", "PowerPS"],
    ports: [
      {
        tag: "powerProducer",
        resource: "power",
        direction: "producer",
        description: "Outputs generated power to power stores.",
      },
    ],
    attributes: FLOW_RATE_ATTRS,
    malfunctionBehavior: {
      low: "Power generation reduced ~5%.",
      medium: "Power generation reduced ~50%.",
      severe: "Power generation stops.",
      temporary: "Generation resumes after malfunction ends.",
      permanent: "Permanent generation capacity loss.",
    },
  },

  // ── Food ──────────────────────────────────────────────────────────────────

  FoodStore: {
    moduleType: "FoodStore",
    summary: "Stores food supplies for crew consumption.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "FoodStore",
    ],
    ports: [
      {
        tag: "foodConsumer",
        resource: "food",
        direction: "consumer",
        description: "Receives food (e.g. from resupply).",
      },
      {
        tag: "foodProducer",
        resource: "food",
        direction: "producer",
        description: "Supplies food to crew.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  // ── Waste ─────────────────────────────────────────────────────────────────

  DryWasteStore: {
    moduleType: "DryWasteStore",
    summary: "Collects solid/dry waste produced by crew metabolism and food processing.",
    classHierarchy: [
      "IBioModule",
      "BioModule",
      "PassiveModule",
      "Store",
      "DryWasteStore",
    ],
    ports: [
      {
        tag: "dryWasteConsumer",
        resource: "dryWaste",
        direction: "consumer",
        description: "Receives dry waste from crew.",
      },
      {
        tag: "dryWasteProducer",
        resource: "dryWaste",
        direction: "producer",
        description: "Supplies dry waste to downstream processors.",
      },
    ],
    attributes: STORE_CORE_ATTRS,
    malfunctionBehavior: STORE_MALFUNCTION,
  },

  // ── Crew ──────────────────────────────────────────────────────────────────

  CrewGroup: {
    moduleType: "CrewGroup",
    summary:
      "Group of crew members; consumes O₂, food, and water each tick based on activity schedules, and produces CO₂, dirty water, and dry waste.",
    classHierarchy: ["IBioModule", "BioModule", "CrewGroup"],
    ports: [
      {
        tag: "O2Consumer",
        resource: "O2",
        direction: "consumer",
        description: "Crew breathes O₂; consumption scales with activity intensity.",
      },
      {
        tag: "CO2Producer",
        resource: "CO2",
        direction: "producer",
        description: "Crew exhales CO₂ proportional to O₂ consumed.",
      },
      {
        tag: "potableWaterConsumer",
        resource: "potableWater",
        direction: "consumer",
        description: "Crew drinks potable water; rate varies by activity.",
      },
      {
        tag: "dirtyWaterProducer",
        resource: "dirtyWater",
        direction: "producer",
        description: "Crew produces dirty water (urine, sweat).",
      },
      {
        tag: "foodConsumer",
        resource: "food",
        direction: "consumer",
        description: "Crew consumes food; rate varies by activity.",
      },
      {
        tag: "dryWasteProducer",
        resource: "dryWaste",
        direction: "producer",
        description: "Crew produces solid waste.",
      },
    ],
    attributes: [
      {
        name: "crewPerson (child elements)",
        type: "string",
        description:
          "Each <crewPerson> child defines name, age, sex, weight, and a 24-hour activity schedule. " +
          "Activity schedules must sum to 24 hours.",
        configurableViaXml: true,
      },
    ],
    malfunctionBehavior: {
      low: "Slight increase in metabolic byproduct production.",
      medium: "Elevated metabolic demands; higher O₂/food consumption.",
      severe: "Crew incapacitation; drastically elevated resource consumption.",
      temporary: "Crew recovers after malfunction ends.",
      permanent: "Permanent metabolic impairment.",
    },
    hiddenPhysicsNote:
      "Crew metabolism rates are not fixed constants — they scale each tick with the current " +
      "activity's intensity value from the schedule. The CO₂/O₂ respiratory quotient is " +
      "hardcoded in the CrewGroup Java class and is not configurable via XML.",
  },
};
