import { create } from "zustand";
import type {
  BiosimDocument,
  CrewActivity,
  CrewPerson,
  FlowEndpoint,
  Globals,
  MalfunctionSpec,
  SensorSpec,
} from "../domain/types";
import {
  patchCrewActivity,
  patchCrewPerson,
  patchEndpoint,
  patchGlobals,
  patchModuleAttr,
  patchSensor,
  renameModule,
  setMalfunction,
} from "../domain/mutations";

export type CanvasView = "schematic" | "xml";

interface CanvasState {
  doc: BiosimDocument | null;
  selectedModuleName: string | null;
  /** Active center-canvas view. */
  view: CanvasView;
  /** Surface short-lived banner text (rename collisions, etc.). */
  toast: string | null;

  setDoc: (doc: BiosimDocument | null) => void;
  selectModule: (name: string | null) => void;
  setView: (v: CanvasView) => void;
  setToast: (msg: string | null) => void;

  patchGlobals: (patch: Partial<Globals>) => void;
  patchModuleAttr: (moduleName: string, key: string, value: string | undefined) => void;
  renameModule: (oldName: string, newName: string) => void;
  patchEndpoint: (
    moduleName: string,
    index: number,
    patch: Partial<FlowEndpoint>,
  ) => void;
  setMalfunction: (moduleName: string, malf: MalfunctionSpec | undefined) => void;
  patchCrewPerson: (
    groupName: string,
    index: number,
    patch: Partial<CrewPerson>,
  ) => void;
  patchCrewActivity: (
    groupName: string,
    crewIndex: number,
    activityIndex: number,
    patch: Partial<CrewActivity>,
  ) => void;
  patchSensor: (sensorName: string, patch: Partial<SensorSpec>) => void;
}

function requireDoc(state: CanvasState): BiosimDocument {
  if (!state.doc) throw new Error("No document loaded");
  return state.doc;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  doc: null,
  selectedModuleName: null,
  view: "schematic",
  toast: null,

  setDoc: (doc) => set({ doc, selectedModuleName: null, toast: null }),
  selectModule: (name) => set({ selectedModuleName: name }),
  setView: (v) => set({ view: v }),
  setToast: (msg) => set({ toast: msg }),

  patchGlobals: (patch) => set({ doc: patchGlobals(requireDoc(get()), patch) }),

  patchModuleAttr: (moduleName, key, value) =>
    set({ doc: patchModuleAttr(requireDoc(get()), moduleName, key, value) }),

  renameModule: (oldName, newName) => {
    try {
      const next = renameModule(requireDoc(get()), oldName, newName);
      set({
        doc: next,
        selectedModuleName:
          get().selectedModuleName === oldName ? newName : get().selectedModuleName,
        toast: null,
      });
    } catch (err) {
      set({ toast: (err as Error).message });
    }
  },

  patchEndpoint: (moduleName, index, patch) =>
    set({ doc: patchEndpoint(requireDoc(get()), moduleName, index, patch) }),

  setMalfunction: (moduleName, malf) =>
    set({ doc: setMalfunction(requireDoc(get()), moduleName, malf) }),

  patchCrewPerson: (groupName, index, patch) =>
    set({ doc: patchCrewPerson(requireDoc(get()), groupName, index, patch) }),

  patchCrewActivity: (groupName, crewIndex, activityIndex, patch) =>
    set({
      doc: patchCrewActivity(
        requireDoc(get()),
        groupName,
        crewIndex,
        activityIndex,
        patch,
      ),
    }),

  patchSensor: (sensorName, patch) =>
    set({ doc: patchSensor(requireDoc(get()), sensorName, patch) }),
}));
