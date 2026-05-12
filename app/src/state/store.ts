import { create } from "zustand";
import type {
  BiosimDocument,
  CrewActivity,
  CrewPerson,
  FlowEndpoint,
  Globals,
  MalfunctionSpec,
  ModuleNode,
  Position,
  SensorSpec,
  SpatialLayout,
} from "../domain/types";
import {
  addEndpoint,
  addModule,
  bulkSetPositions,
  deleteModule,
  patchCrewActivity,
  patchCrewPerson,
  patchEndpoint,
  patchGlobals,
  patchModuleAttr,
  patchSensor,
  removeEndpoint,
  renameModule,
  setMalfunction,
  setModulePosition,
  setSpatialLayout,
} from "../domain/mutations";

export type CanvasView = "schematic" | "spatial" | "timeline" | "xml" | "review";

interface CanvasState {
  doc: BiosimDocument | null;
  selectedModuleName: string | null;
  /** Active center-canvas view. */
  view: CanvasView;
  /** Surface short-lived banner text (rename collisions, etc.). */
  toast: string | null;
  /**
   * Last successful File System Access save handle for the main `.biosim`
   * file — cleared when a new document is loaded. Not available after
   * download fallback.
   */
  biosimFileHandle: FileSystemFileHandle | null;

  setDoc: (doc: BiosimDocument | null) => void;
  selectModule: (name: string | null) => void;
  setView: (v: CanvasView) => void;
  setToast: (msg: string | null) => void;
  /** After Save to disk — updates `sourceName` and optional write handle. */
  applyBiosimSave: (
    fileName: string,
    handle: FileSystemFileHandle | null,
    mode: "fs" | "download",
  ) => void;

  patchGlobals: (patch: Partial<Globals>) => void;
  patchModuleAttr: (moduleName: string, key: string, value: string | undefined) => void;
  renameModule: (oldName: string, newName: string) => void;
  patchEndpoint: (
    moduleName: string,
    index: number,
    patch: Partial<FlowEndpoint>,
  ) => void;
  setMalfunction: (moduleName: string, malf: MalfunctionSpec | undefined) => void;
  addModule: (mod: ModuleNode) => void;
  deleteModule: (moduleName: string) => void;
  addEndpoint: (moduleName: string, endpoint: FlowEndpoint) => void;
  removeEndpoint: (moduleName: string, index: number) => void;
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
  setModulePosition: (moduleName: string, position: Position) => void;
  bulkSetPositions: (positions: Record<string, Position>) => void;
  setSpatialLayout: (layout: SpatialLayout | undefined) => void;
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
  biosimFileHandle: null,

  setDoc: (doc) => set({ doc, selectedModuleName: null, toast: null, biosimFileHandle: null }),

  applyBiosimSave: (fileName, handle, mode) =>
    set((state) => {
      const d = state.doc;
      if (!d) return state;
      const toast =
        mode === "download"
          ? `Downloaded ${fileName} — open this file to edit; use Save in Chromium to attach a writable path.`
          : `Saved ${fileName}`;
      return {
        doc: { ...d, sourceName: fileName },
        biosimFileHandle: handle,
        toast,
      };
    }),
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

  addModule: (mod) => {
    try {
      const next = addModule(requireDoc(get()), mod);
      set({ doc: next, selectedModuleName: mod.moduleName, toast: null });
    } catch (err) {
      set({ toast: (err as Error).message });
    }
  },

  deleteModule: (name) => {
    const next = deleteModule(requireDoc(get()), name);
    set({
      doc: next,
      selectedModuleName:
        get().selectedModuleName === name ? null : get().selectedModuleName,
      toast: `Deleted module ${name}`,
    });
  },

  addEndpoint: (moduleName, endpoint) =>
    set({ doc: addEndpoint(requireDoc(get()), moduleName, endpoint) }),

  removeEndpoint: (moduleName, index) =>
    set({ doc: removeEndpoint(requireDoc(get()), moduleName, index) }),

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

  setModulePosition: (moduleName, position) =>
    set({ doc: setModulePosition(requireDoc(get()), moduleName, position) }),

  bulkSetPositions: (positions) =>
    set({ doc: bulkSetPositions(requireDoc(get()), positions) }),

  setSpatialLayout: (layout) =>
    set({ doc: setSpatialLayout(requireDoc(get()), layout) }),
}));
