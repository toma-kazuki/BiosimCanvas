// Undo / redo history for `doc` mutations — one snapshot before each edit.

import type { BiosimDocument } from "../domain/types";

export const MAX_HISTORY = 80;

export interface HistorySlice {
  doc: BiosimDocument;
  past: BiosimDocument[];
  future: BiosimDocument[];
}

export function snapshotForHistory(doc: BiosimDocument): BiosimDocument {
  return structuredClone(doc);
}

/**
 * Push current document onto `past`, replace with `nextDoc`, clear `future`.
 * When there is no current doc, only sets `nextDoc` and leaves stacks empty.
 */
export function withHistory(
  current: BiosimDocument | null,
  past: BiosimDocument[],
  nextDoc: BiosimDocument,
): Pick<HistorySlice, "doc" | "past" | "future"> {
  if (!current) {
    return { doc: nextDoc, past: [], future: [] };
  }
  const nextPast = [...past, snapshotForHistory(current)].slice(-MAX_HISTORY);
  return { doc: nextDoc, past: nextPast, future: [] };
}

export function undoSnapshot(
  doc: BiosimDocument | null,
  past: BiosimDocument[],
  future: BiosimDocument[],
): Pick<HistorySlice, "doc" | "past" | "future"> | null {
  if (!doc || past.length === 0) return null;
  const prev = past[past.length - 1];
  const newPast = past.slice(0, -1);
  const nextFuture = [snapshotForHistory(doc), ...future].slice(0, MAX_HISTORY);
  return { doc: snapshotForHistory(prev), past: newPast, future: nextFuture };
}

export function redoSnapshot(
  doc: BiosimDocument | null,
  past: BiosimDocument[],
  future: BiosimDocument[],
): Pick<HistorySlice, "doc" | "past" | "future"> | null {
  if (!doc || future.length === 0) return null;
  const next = future[0];
  const newFuture = future.slice(1);
  const newPast = [...past, snapshotForHistory(doc)].slice(-MAX_HISTORY);
  return { doc: snapshotForHistory(next), past: newPast, future: newFuture };
}

/** Keep selection if the module still exists after history navigation. */
export function selectionAfterDocChange(
  selectedModuleName: string | null,
  doc: BiosimDocument,
): string | null {
  if (!selectedModuleName) return null;
  return doc.modules.some((m) => m.moduleName === selectedModuleName)
    ? selectedModuleName
    : null;
}
