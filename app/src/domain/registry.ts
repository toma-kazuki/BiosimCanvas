import type { Subsystem, ResourceKind } from "./types";

/**
 * Per-tag metadata used when parsing/rendering modules:
 *  - which subsystem `<…>` wrapper it belongs under, and
 *  - a human-readable display label.
 *
 * Lists below are the subset used by template.biosim and
 * lunar/minihab.biosim (the v1 acceptance targets). Extending this list
 * is how we grow scope; see docs/03-requirements.md F-MODEL-2.
 */
export interface ModuleKindMeta {
  subsystem: Subsystem;
  label: string;
  /** Short two-letter glyph used inside the node body. */
  glyph: string;
}

export const MODULE_KINDS: Record<string, ModuleKindMeta> = {
  // environment
  SimEnvironment: { subsystem: "environment", label: "Environment", glyph: "ENV" },
  Fan: { subsystem: "environment", label: "Fan", glyph: "FN" },
  Dehumidifier: { subsystem: "environment", label: "Dehumidifier", glyph: "DH" },

  // air
  NitrogenStore: { subsystem: "air", label: "N₂ Store", glyph: "N2" },
  VCCR: { subsystem: "air", label: "VCCR", glyph: "VC" },
  OGS: { subsystem: "air", label: "OGS", glyph: "OG" },
  O2Store: { subsystem: "air", label: "O₂ Store", glyph: "O2" },
  H2Store: { subsystem: "air", label: "H₂ Store", glyph: "H2" },
  CO2Store: { subsystem: "air", label: "CO₂ Store", glyph: "CO" },

  // framework
  Injector: { subsystem: "framework", label: "Injector", glyph: "IJ" },

  // water
  WaterRS: { subsystem: "water", label: "Water RS", glyph: "WR" },
  DirtyWaterStore: { subsystem: "water", label: "Dirty Water", glyph: "DW" },
  GreyWaterStore: { subsystem: "water", label: "Grey Water", glyph: "GW" },
  PotableWaterStore: { subsystem: "water", label: "Potable Water", glyph: "PW" },

  // power
  PowerStore: { subsystem: "power", label: "Power Store", glyph: "PS" },
  PowerPS: { subsystem: "power", label: "Power Producer", glyph: "PP" },

  // food
  FoodStore: { subsystem: "food", label: "Food Store", glyph: "FS" },

  // waste
  DryWasteStore: { subsystem: "waste", label: "Dry Waste", glyph: "DW" },

  // crew
  CrewGroup: { subsystem: "crew", label: "Crew Group", glyph: "CR" },
};

/**
 * Mapping from a producer/consumer XML tag (the *child* of a module)
 * to the typed `ResourceKind` and direction. The XML uses tags like
 * `airConsumer`, `airProducer`, `O2Consumer`, etc. and references
 * other modules via `inputs` / `outputs` attributes.
 */
export interface EndpointTagMeta {
  resource: ResourceKind;
  kind: "consumer" | "producer";
}

export const ENDPOINT_TAGS: Record<string, EndpointTagMeta> = {
  airConsumer: { resource: "air", kind: "consumer" },
  airProducer: { resource: "air", kind: "producer" },

  O2Consumer: { resource: "O2", kind: "consumer" },
  O2Producer: { resource: "O2", kind: "producer" },

  CO2Consumer: { resource: "CO2", kind: "consumer" },
  CO2Producer: { resource: "CO2", kind: "producer" },

  H2Consumer: { resource: "H2", kind: "consumer" },
  H2Producer: { resource: "H2", kind: "producer" },

  nitrogenConsumer: { resource: "nitrogen", kind: "consumer" },
  nitrogenProducer: { resource: "nitrogen", kind: "producer" },

  potableWaterConsumer: { resource: "potableWater", kind: "consumer" },
  potableWaterProducer: { resource: "potableWater", kind: "producer" },

  greyWaterConsumer: { resource: "greyWater", kind: "consumer" },
  greyWaterProducer: { resource: "greyWater", kind: "producer" },

  dirtyWaterConsumer: { resource: "dirtyWater", kind: "consumer" },
  dirtyWaterProducer: { resource: "dirtyWater", kind: "producer" },

  powerConsumer: { resource: "power", kind: "consumer" },
  powerProducer: { resource: "power", kind: "producer" },

  foodConsumer: { resource: "food", kind: "consumer" },
  foodProducer: { resource: "food", kind: "producer" },

  biomassConsumer: { resource: "biomass", kind: "consumer" },
  biomassProducer: { resource: "biomass", kind: "producer" },

  dryWasteConsumer: { resource: "dryWaste", kind: "consumer" },
  dryWasteProducer: { resource: "dryWaste", kind: "producer" },
};

export const SUBSYSTEM_ORDER: Subsystem[] = [
  "environment",
  "air",
  "framework",
  "water",
  "power",
  "food",
  "waste",
  "crew",
];

export const SUBSYSTEM_LABEL: Record<Subsystem, string> = {
  environment: "Environment",
  air: "Air",
  water: "Water",
  power: "Power",
  food: "Food",
  waste: "Waste",
  framework: "Framework",
  crew: "Crew",
};

export const SUBSYSTEM_COLOR: Record<Subsystem, string> = {
  environment: "#5dd2c9",
  air: "#7fc8f7",
  water: "#3a82d8",
  power: "#f0c34a",
  food: "#7fd1a3",
  waste: "#a8a8a8",
  framework: "#c79bff",
  crew: "#e89ea8",
};

export const RESOURCE_COLOR: Record<ResourceKind, string> = {
  air: "#7fc8f7",
  O2: "#9fe07f",
  CO2: "#c79bff",
  H2: "#ffd86f",
  nitrogen: "#9fb7ff",
  vapor: "#b8e0ff",
  potableWater: "#3a82d8",
  greyWater: "#7fa9d8",
  dirtyWater: "#8b6f4e",
  power: "#f0c34a",
  food: "#7fd1a3",
  biomass: "#56c596",
  dryWaste: "#a8a8a8",
};

export const RESOURCE_LABEL: Record<ResourceKind, string> = {
  air: "Air",
  O2: "O₂",
  CO2: "CO₂",
  H2: "H₂",
  nitrogen: "N₂",
  vapor: "H₂O vapor",
  potableWater: "Potable Water",
  greyWater: "Grey Water",
  dirtyWater: "Dirty Water",
  power: "Power",
  food: "Food",
  biomass: "Biomass",
  dryWaste: "Dry Waste",
};
