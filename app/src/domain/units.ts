// Unit conventions for BioSim configuration values.
//
// BioSim doesn't carry units in its XSDs, so the right unit for each
// attribute has to be recovered from the Java source. The references
// below cite the relevant BioSim file/line so we can audit when the
// upstream convention changes.
//
//   - tickLength            float, hours          BioDriver.setTickLength
//                                                  + getTicksInHumanReadableFormat
//                                                  (server/framework/BioDriver.java)
//   - runTillN              integer, ticks        Framework.xsd / BioDriver
//   - driverStutterLength   integer, ms           Thread.sleep in BioDriver.runSimulation
//   - CrewPerson.age        years
//   - CrewPerson.weight     kg                    (BioSim metabolic-rate code in
//                                                  CrewPerson.calculateO2Needed)
//   - Activity.length       integer, ticks        BioSim labels these as "h" in
//                                                  Schedule.toString assuming the
//                                                  default 1 tick = 1 hour. We label
//                                                  them as ticks (the actual stored
//                                                  unit) and surface the wall-clock
//                                                  equivalent in the schedule header.
//   - Activity.intensity    integer level         used in O2/food/water metabolic
//                                                  formulae as a 0…5 multiplier
//   - SimEnvironment.initialVolume    liters      SimEnvironment.setInitialVolume Javadoc
//   - power stores level/capacity      W          PowerPS labels "watts" everywhere
//   - water stores level/capacity      liters     WaterRS/Dehumidifier comments
//   - gas stores level/capacity        moles      gas store Javadocs (mol of substance)
//   - dry waste store level/capacity   kg         dry waste store convention
//   - upperPowerGeneration             W          PowerPS.getPowerProduced (watts)
//   - occursAtTick                     ticks      MalfunctionType.occursAtTick
//
// Flow rate units follow from the resource type: power flows are W,
// water flows are L/tick, gas flows are mol/tick. Per-tick because
// BioSim applies a single desired/max value per simulation tick.

import type { ResourceKind } from "./types";

/** Unit string for an attribute on `<Globals>`. */
export function globalUnit(name: string): string | undefined {
  switch (name) {
    case "tickLength":
      return "h";
    case "runTillN":
      return "ticks";
    case "driverStutterLength":
      return "ms";
    default:
      return undefined;
  }
}

/** Unit string for a known attribute on a particular module kind. */
export function attrUnit(kind: string, attr: string): string | undefined {
  // Common store fields. Every kind that ends with "Store" carries a
  // `level` and `capacity`; the unit depends on what the store holds.
  if (attr === "level" || attr === "capacity") {
    if (/PowerStore$/.test(kind)) return "W";
    if (/(O2|CO2|H2|Nitrogen|Methane)Store$/.test(kind)) return "mol";
    if (/(Dirty|Grey|Potable)WaterStore$/.test(kind)) return "L";
    if (kind === "FoodStore") return "cal";
    if (kind === "DryWasteStore") return "kg";
    if (kind === "BiomassStore") return "kg";
    return undefined;
  }

  // SimEnvironment volumes.
  if (kind === "SimEnvironment") {
    if (attr === "initialVolume" || attr === "airLockVolume") return "L";
  }

  // PowerPS.
  if (kind === "PowerPS") {
    if (attr === "upperPowerGeneration") return "W";
  }

  // CrewPerson-ish attributes that show up on crew cards (those rows
  // are rendered separately, but include here for completeness).
  if (attr === "weight") return "kg";
  if (attr === "age") return "yr";

  return undefined;
}

/** Unit for desired/max flow rates of a producer/consumer endpoint. */
export function flowRateUnit(resource: ResourceKind): string {
  switch (resource) {
    case "power":
      return "W";
    case "potableWater":
    case "greyWater":
    case "dirtyWater":
    case "vapor":
      return "L/tick";
    case "O2":
    case "CO2":
    case "H2":
    case "nitrogen":
    case "air":
      return "mol/tick";
    case "food":
      return "cal/tick";
    case "biomass":
      return "kg/tick";
    case "dryWaste":
      return "kg/tick";
    default:
      return "";
  }
}

/**
 * Render a tick count as a human-readable wall-clock duration, given
 * the current `tickLength` (in hours). Returns e.g. "2.2 h", "1 d 4 h",
 * or "—" when tickLength is non-positive / unknown.
 */
export function ticksToWallClock(
  ticks: number,
  tickLengthHours: number | undefined,
): string {
  if (!Number.isFinite(ticks) || ticks <= 0) return "0 h";
  if (!tickLengthHours || tickLengthHours <= 0) return "—";
  const totalHours = ticks * tickLengthHours;
  if (totalHours < 1) {
    const minutes = totalHours * 60;
    return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`;
  }
  if (totalHours < 24) {
    return `${totalHours.toFixed(totalHours < 10 ? 1 : 0)} h`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = Math.round(totalHours - days * 24);
  return remHours === 0 ? `${days} d` : `${days} d ${remHours} h`;
}
