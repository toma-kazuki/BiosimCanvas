// Pure (immutable) mutations on the canonical BiosimDocument.
//
// Every mutation takes the document and returns a NEW document — never
// touches the input. This is what makes React/zustand re-render correctly
// and what will make undo/redo trivial when we add it (Phase 9).
//
// Cross-reference propagation lives here too: renaming a module updates
// every producer/consumer `refs` entry and every sensor `input` that points
// at the old name (see docs/03-requirements.md F-MODEL-4, F-EDIT-4).

import type {
  BiosimDocument,
  CrewActivity,
  CrewPerson,
  FlowEndpoint,
  Globals,
  MalfunctionSpec,
  ModuleNode,
  SensorSpec,
} from "./types";

// --- Globals -------------------------------------------------------------

export function patchGlobals(doc: BiosimDocument, patch: Partial<Globals>): BiosimDocument {
  return { ...doc, globals: { ...doc.globals, ...patch } };
}

// --- Modules -------------------------------------------------------------

export function patchModule(
  doc: BiosimDocument,
  name: string,
  patch: Partial<ModuleNode>,
): BiosimDocument {
  return {
    ...doc,
    modules: doc.modules.map((m) => (m.moduleName === name ? { ...m, ...patch } : m)),
  };
}

export function patchModuleAttr(
  doc: BiosimDocument,
  name: string,
  key: string,
  value: string | undefined,
): BiosimDocument {
  return {
    ...doc,
    modules: doc.modules.map((m) => {
      if (m.moduleName !== name) return m;
      const nextAttrs = { ...m.attrs };
      if (value === undefined || value === "") {
        delete nextAttrs[key];
      } else {
        nextAttrs[key] = value;
      }
      return { ...m, attrs: nextAttrs };
    }),
  };
}

export class RenameCollisionError extends Error {
  constructor(name: string) {
    super(`Module name "${name}" already exists`);
    this.name = "RenameCollisionError";
  }
}

export function renameModule(
  doc: BiosimDocument,
  oldName: string,
  newName: string,
): BiosimDocument {
  if (oldName === newName) return doc;
  if (newName.trim() === "") throw new Error("Module name cannot be empty");
  if (doc.modules.some((m) => m.moduleName === newName)) {
    throw new RenameCollisionError(newName);
  }

  return {
    ...doc,
    modules: doc.modules.map((m) => {
      const renamedSelf = m.moduleName === oldName ? { ...m, moduleName: newName } : m;
      // Update endpoint refs that point at the old name.
      let endpointsChanged = false;
      const endpoints = renamedSelf.endpoints.map((ep) => {
        if (!ep.refs.includes(oldName)) return ep;
        endpointsChanged = true;
        return { ...ep, refs: ep.refs.map((r) => (r === oldName ? newName : r)) };
      });
      return endpointsChanged ? { ...renamedSelf, endpoints } : renamedSelf;
    }),
    sensors: doc.sensors.map((s) =>
      s.input === oldName ? { ...s, input: newName } : s,
    ),
  };
}

// --- Endpoints -----------------------------------------------------------

export function patchEndpoint(
  doc: BiosimDocument,
  moduleName: string,
  endpointIndex: number,
  patch: Partial<FlowEndpoint>,
): BiosimDocument {
  return {
    ...doc,
    modules: doc.modules.map((m) => {
      if (m.moduleName !== moduleName) return m;
      const endpoints = m.endpoints.map((ep, i) =>
        i === endpointIndex ? { ...ep, ...patch } : ep,
      );
      return { ...m, endpoints };
    }),
  };
}

// --- Malfunction ---------------------------------------------------------

export function setMalfunction(
  doc: BiosimDocument,
  moduleName: string,
  malfunction: MalfunctionSpec | undefined,
): BiosimDocument {
  return {
    ...doc,
    modules: doc.modules.map((m) =>
      m.moduleName === moduleName ? { ...m, malfunction } : m,
    ),
  };
}

// --- Crew ----------------------------------------------------------------

export function patchCrewPerson(
  doc: BiosimDocument,
  groupName: string,
  index: number,
  patch: Partial<CrewPerson>,
): BiosimDocument {
  return {
    ...doc,
    modules: doc.modules.map((m) => {
      if (m.moduleName !== groupName || !m.crew) return m;
      const crew = m.crew.map((c, i) => (i === index ? { ...c, ...patch } : c));
      return { ...m, crew };
    }),
  };
}

export function patchCrewActivity(
  doc: BiosimDocument,
  groupName: string,
  crewIndex: number,
  activityIndex: number,
  patch: Partial<CrewActivity>,
): BiosimDocument {
  return {
    ...doc,
    modules: doc.modules.map((m) => {
      if (m.moduleName !== groupName || !m.crew) return m;
      const crew = m.crew.map((c, i) => {
        if (i !== crewIndex) return c;
        const schedule = c.schedule.map((a, j) =>
          j === activityIndex ? { ...a, ...patch } : a,
        );
        return { ...c, schedule };
      });
      return { ...m, crew };
    }),
  };
}

// --- Sensors -------------------------------------------------------------

export function patchSensor(
  doc: BiosimDocument,
  moduleName: string,
  patch: Partial<SensorSpec>,
): BiosimDocument {
  return {
    ...doc,
    sensors: doc.sensors.map((s) =>
      s.moduleName === moduleName ? { ...s, ...patch } : s,
    ),
  };
}
