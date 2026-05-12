// Browser session backup of the in-memory document (localStorage).
// Gated by an explicit user preference — see `AUTOSAVE_PREF_KEY`.

import type { BiosimDocument } from "../domain/types";

export const SESSION_STORAGE_KEY = "biosimcanvas:sessionV1";
export const AUTOSAVE_PREF_KEY = "biosimcanvas:autosaveEnabled";

export interface StoredSessionV1 {
  v: 1;
  savedAt: number;
  sourceName?: string;
  doc: BiosimDocument;
}

export function loadAutosavePreference(): boolean {
  try {
    return localStorage.getItem(AUTOSAVE_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveAutosavePreference(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(AUTOSAVE_PREF_KEY, "1");
    else localStorage.removeItem(AUTOSAVE_PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function persistSession(doc: BiosimDocument | null): void {
  if (!doc) return;
  try {
    const payload: StoredSessionV1 = {
      v: 1,
      savedAt: Date.now(),
      sourceName: doc.sourceName,
      doc,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("[BioSimCanvas] session autosave failed", e);
  }
}

export function readSession(): StoredSessionV1 | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredSessionV1;
    if (data?.v !== 1 || !data.doc || typeof data.savedAt !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
