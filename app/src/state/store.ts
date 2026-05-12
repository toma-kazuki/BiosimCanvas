import { create } from "zustand";
import type { BiosimDocument } from "../domain/types";

interface CanvasState {
  doc: BiosimDocument | null;
  selectedModuleName: string | null;
  setDoc: (doc: BiosimDocument | null) => void;
  selectModule: (name: string | null) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  doc: null,
  selectedModuleName: null,
  setDoc: (doc) => set({ doc, selectedModuleName: null }),
  selectModule: (name) => set({ selectedModuleName: name }),
}));
