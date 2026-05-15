import { create } from "zustand";
import type { LlmMessage } from "../llm/openaiAdapter";

export type ChatMessage = LlmMessage & {
  /** True when this assistant message also updated the canvas config. */
  appliedConfig?: boolean;
};
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
import { clearSession, loadAutosavePreference, saveAutosavePreference } from "../session/autosave";
import {
  redoSnapshot,
  selectionAfterDocChange,
  undoSnapshot,
  withHistory,
} from "./history";

export type CanvasView = "schematic" | "spatial" | "timeline" | "xml" | "review";
export type RightPanelTab = "properties" | "encyclopedia" | "chat";

interface CanvasState {
  doc: BiosimDocument | null;
  selectedModuleName: string | null;
  /** Active center-canvas view. */
  view: CanvasView;
  /** Surface short-lived banner text (rename collisions, etc.). */
  toast: string | null;

  /** UI panel visibility — not part of undo history. */
  rightPanelTab: RightPanelTab;
  rightPanelOpen: boolean;
  paletteOpen: boolean;

  /** LLM chat history — not part of undo history. */
  chatMessages: ChatMessage[];
  /**
   * Last successful File System Access save handle for the main `.biosim`
   * file — cleared when a new document is loaded. Not available after
   * download fallback.
   */
  biosimFileHandle: FileSystemFileHandle | null;

  /** Undo stack — snapshots before each editing mutation. */
  past: BiosimDocument[];
  /** Redo stack — snapshots shelved by undo. */
  future: BiosimDocument[];

  /** When true, debounced writes go to localStorage (session backup). */
  autosaveEnabled: boolean;

  setDoc: (doc: BiosimDocument | null) => void;
  /** Replace document from XML Apply — keeps biosim handle; participates in undo. */
  replaceDoc: (doc: BiosimDocument) => void;
  selectModule: (name: string | null) => void;
  setView: (v: CanvasView) => void;
  setToast: (msg: string | null) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setRightPanelOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setAutosaveEnabled: (enabled: boolean) => void;
  undo: () => void;
  redo: () => void;

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

export const useCanvasStore = create<CanvasState>((set) => ({
  doc: null,
  selectedModuleName: null,
  view: "schematic",
  toast: null,
  biosimFileHandle: null,
  past: [],
  future: [],
  autosaveEnabled: loadAutosavePreference(),
  rightPanelTab: "properties",
  rightPanelOpen: true,
  paletteOpen: true,
  chatMessages: [],

  setDoc: (doc) =>
    set({
      doc,
      selectedModuleName: null,
      toast: null,
      biosimFileHandle: null,
      past: [],
      future: [],
    }),

  replaceDoc: (next) =>
    set((s) => {
      const h = withHistory(s.doc, s.past, next);
      return {
        ...h,
        selectedModuleName: selectionAfterDocChange(s.selectedModuleName, h.doc),
        toast: null,
      };
    }),

  selectModule: (name) =>
    set({
      selectedModuleName: name,
      // Auto-open right panel on Properties tab when a module is selected
      ...(name !== null
        ? { rightPanelOpen: true, rightPanelTab: "properties" as RightPanelTab }
        : {}),
    }),
  setView: (v) => set({ view: v }),
  setToast: (msg) => set({ toast: msg }),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  setAutosaveEnabled: (enabled) => {
    saveAutosavePreference(enabled);
    if (!enabled) clearSession();
    set({ autosaveEnabled: enabled });
  },

  undo: () =>
    set((s) => {
      const step = undoSnapshot(s.doc, s.past, s.future);
      if (!step) return s;
      return {
        ...step,
        selectedModuleName: selectionAfterDocChange(s.selectedModuleName, step.doc),
      };
    }),

  redo: () =>
    set((s) => {
      const step = redoSnapshot(s.doc, s.past, s.future);
      if (!step) return s;
      return {
        ...step,
        selectedModuleName: selectionAfterDocChange(s.selectedModuleName, step.doc),
      };
    }),

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

  patchGlobals: (patch) =>
    set((s) => {
      const next = patchGlobals(requireDoc(s), patch);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  patchModuleAttr: (moduleName, key, value) =>
    set((s) => {
      const next = patchModuleAttr(requireDoc(s), moduleName, key, value);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  renameModule: (oldName, newName) => {
    try {
      set((s) => {
        const next = renameModule(requireDoc(s), oldName, newName);
        return {
          ...withHistory(s.doc, s.past, next),
          selectedModuleName:
            s.selectedModuleName === oldName ? newName : s.selectedModuleName,
          toast: null,
        };
      });
    } catch (err) {
      set({ toast: (err as Error).message });
    }
  },

  patchEndpoint: (moduleName, index, patch) =>
    set((s) => {
      const next = patchEndpoint(requireDoc(s), moduleName, index, patch);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  setMalfunction: (moduleName, malf) =>
    set((s) => {
      const next = setMalfunction(requireDoc(s), moduleName, malf);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  addModule: (mod) => {
    try {
      set((s) => {
        const next = addModule(requireDoc(s), mod);
        return {
          ...withHistory(s.doc, s.past, next),
          selectedModuleName: mod.moduleName,
          toast: null,
        };
      });
    } catch (err) {
      set({ toast: (err as Error).message });
    }
  },

  deleteModule: (name) =>
    set((s) => {
      const next = deleteModule(requireDoc(s), name);
      return {
        ...withHistory(s.doc, s.past, next),
        selectedModuleName:
          s.selectedModuleName === name ? null : s.selectedModuleName,
        toast: `Deleted module ${name}`,
      };
    }),

  addEndpoint: (moduleName, endpoint) =>
    set((s) => {
      const next = addEndpoint(requireDoc(s), moduleName, endpoint);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  removeEndpoint: (moduleName, index) =>
    set((s) => {
      const next = removeEndpoint(requireDoc(s), moduleName, index);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  patchCrewPerson: (groupName, index, patch) =>
    set((s) => {
      const next = patchCrewPerson(requireDoc(s), groupName, index, patch);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  patchCrewActivity: (groupName, crewIndex, activityIndex, patch) =>
    set((s) => {
      const next = patchCrewActivity(
        requireDoc(s),
        groupName,
        crewIndex,
        activityIndex,
        patch,
      );
      return { ...withHistory(s.doc, s.past, next) };
    }),

  patchSensor: (sensorName, patch) =>
    set((s) => {
      const next = patchSensor(requireDoc(s), sensorName, patch);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  setModulePosition: (moduleName, position) =>
    set((s) => {
      const next = setModulePosition(requireDoc(s), moduleName, position);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  bulkSetPositions: (positions) =>
    set((s) => {
      const next = bulkSetPositions(requireDoc(s), positions);
      return { ...withHistory(s.doc, s.past, next) };
    }),

  setSpatialLayout: (layout) =>
    set((s) => {
      const next = setSpatialLayout(requireDoc(s), layout);
      return { ...withHistory(s.doc, s.past, next) };
    }),
}));
