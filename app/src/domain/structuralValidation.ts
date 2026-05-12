// Soft structural checks over the in-memory model — informational and
// warning severities only (no hard export blocks; see requirements).

import { MODULE_KINDS } from "./registry";
import type { BiosimDocument } from "./types";

export type ValidationSeverity = "info" | "warn";

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  /** Module to focus in the canvas / side panel, when applicable. */
  moduleName?: string;
  /** Secondary module (e.g. broken ref target). */
  relatedModuleName?: string;
}

/**
 * Run all v1 structural checks. Deterministic order: by code, then message.
 */
export function validateStructural(doc: BiosimDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const names = new Set(doc.modules.map((m) => m.moduleName));
  const nameList = doc.modules.map((m) => m.moduleName);
  const dupNames = nameList.filter((n, i) => nameList.indexOf(n) !== i);
  const dupUnique = [...new Set(dupNames)];
  for (const n of dupUnique) {
    issues.push({
      severity: "warn",
      code: "DUP_NAME",
      message: `Duplicate moduleName "${n}" — BioSim expects unique names.`,
      moduleName: n,
    });
  }

  if (doc.globals.tickLength === undefined) {
    issues.push({
      severity: "warn",
      code: "GLOB_TICK",
      message: "Globals.tickLength is unset — simulation tick duration is undefined.",
    });
  }
  if (doc.globals.runTillN === undefined && doc.globals.runTillCrewDeath !== true) {
    issues.push({
      severity: "info",
      code: "GLOB_RUN",
      message:
        "Neither runTillN nor runTillCrewDeath is set — verify the run horizon is intentional.",
    });
  }

  for (const m of doc.modules) {
    if (!MODULE_KINDS[m.kind]) {
      issues.push({
        severity: "info",
        code: "UNK_KIND",
        message: `Module kind "${m.kind}" is not in the v1 registry — export may still work via pass-through.`,
        moduleName: m.moduleName,
      });
    }

    if (m.kind === "SimEnvironment" && m.attrs.initialVolume === undefined) {
      issues.push({
        severity: "warn",
        code: "ENV_VOL",
        message: "SimEnvironment has no initialVolume — BioSim may default or reject.",
        moduleName: m.moduleName,
      });
    }

    if (m.kind.endsWith("Store")) {
      if (m.attrs.capacity === undefined) {
        issues.push({
          severity: "warn",
          code: "STORE_CAP",
          message: `${m.kind} has no capacity attribute.`,
          moduleName: m.moduleName,
        });
      }
    }

    for (let i = 0; i < m.endpoints.length; i++) {
      const ep = m.endpoints[i];
      const label = `${ep.kind} ${ep.resource} (#${i + 1})`;
      if (ep.refs.length === 0) {
        issues.push({
          severity: "warn",
          code: "EMPTY_REFS",
          message: `${label} has no linked modules — connect inputs/outputs in the side panel or schematic.`,
          moduleName: m.moduleName,
        });
      }
      for (const r of ep.refs) {
        if (r === m.moduleName) {
          issues.push({
            severity: "warn",
            code: "SELF_REF",
            message: `${label} references this module — self-connections are usually invalid.`,
            moduleName: m.moduleName,
            relatedModuleName: r,
          });
        } else if (!names.has(r)) {
          issues.push({
            severity: "warn",
            code: "BAD_REF",
            message: `${label} references "${r}", which is not a module in this document.`,
            moduleName: m.moduleName,
            relatedModuleName: r,
          });
        }
      }
    }

    if (m.kind === "CrewGroup" && (!m.crew || m.crew.length === 0)) {
      issues.push({
        severity: "warn",
        code: "CREW_EMPTY",
        message: "CrewGroup has no crew members defined.",
        moduleName: m.moduleName,
      });
    }
  }

  for (const s of doc.sensors) {
    if (!s.input?.trim()) {
      issues.push({
        severity: "warn",
        code: "SENSOR_INPUT",
        message: `Sensor "${s.moduleName}" has no input module.`,
        moduleName: s.moduleName,
      });
    } else if (!names.has(s.input)) {
      issues.push({
        severity: "warn",
        code: "SENSOR_BAD_REF",
        message: `Sensor "${s.moduleName}" input "${s.input}" is not a module.`,
        moduleName: s.moduleName,
        relatedModuleName: s.input,
      });
    }
  }

  issues.sort((a, b) => {
    const sev = a.severity === b.severity ? 0 : a.severity === "warn" ? -1 : 1;
    if (sev !== 0) return sev;
    const c = a.code.localeCompare(b.code);
    if (c !== 0) return c;
    return a.message.localeCompare(b.message);
  });

  return issues;
}

export function validationSummary(issues: ValidationIssue[]): {
  warn: number;
  info: number;
} {
  let warn = 0;
  let info = 0;
  for (const i of issues) {
    if (i.severity === "warn") warn++;
    else info++;
  }
  return { warn, info };
}

/** Modules with no endpoints and not referenced as a flow target (likely unwired). */
export function isolatedModuleNames(doc: BiosimDocument): string[] {
  const refTargets = new Set<string>();
  for (const m of doc.modules) {
    for (const ep of m.endpoints) {
      for (const r of ep.refs) refTargets.add(r);
    }
  }
  const out: string[] = [];
  for (const m of doc.modules) {
    if (m.kind === "SimEnvironment") continue;
    if (m.endpoints.length > 0) continue;
    if (refTargets.has(m.moduleName)) continue;
    out.push(m.moduleName);
  }
  return out.sort();
}

export function issuesWithIsolatedModules(doc: BiosimDocument): ValidationIssue[] {
  const base = validateStructural(doc);
  const iso = isolatedModuleNames(doc);
  for (const name of iso) {
    const m = doc.modules.find((x) => x.moduleName === name);
    if (!m) continue;
    base.push({
      severity: "info",
      code: "ISOLATED",
      message:
        "Module has no flow endpoints and is not referenced by any — newly added hardware may need wiring.",
      moduleName: name,
    });
  }
  return base.sort((a, b) => {
    const sev = a.severity === b.severity ? 0 : a.severity === "warn" ? -1 : 1;
    if (sev !== 0) return sev;
    const c = a.code.localeCompare(b.code);
    if (c !== 0) return c;
    return a.message.localeCompare(b.message);
  });
}
