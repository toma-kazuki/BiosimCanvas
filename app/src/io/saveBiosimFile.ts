// Persist emitted XML: File System Access API when available, else
// classic download anchor (Chromium-first; see NGO browser note).

export type SaveBiosimResult =
  | { kind: "cancelled" }
  | { kind: "written"; fileName: string; handle: FileSystemFileHandle }
  | { kind: "downloaded"; fileName: string };

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?*:|"<>]/g, "_").trim() || "untitled.biosim";
}

export function defaultBiosimFilename(sourceName: string | undefined): string {
  const base = sourceName?.trim() || "untitled.biosim";
  if (base.toLowerCase().endsWith(".biosim")) return sanitizeFilename(base);
  return sanitizeFilename(`${base}.biosim`);
}

export interface SaveBiosimOptions {
  xml: string;
  suggestedName: string;
  /** When present and caller did not request "Save as", write here in place. */
  existingHandle?: FileSystemFileHandle | null;
  /** If true, never use existingHandle (always show picker when supported). */
  saveAs?: boolean;
}

/**
 * Write XML to disk. Order: optional in-place handle → save picker → download.
 */
export async function saveBiosimFile(opts: SaveBiosimOptions): Promise<SaveBiosimResult> {
  const { xml, suggestedName, existingHandle, saveAs } = opts;
  const safeName = sanitizeFilename(suggestedName);

  if (existingHandle && !saveAs) {
    try {
      const writable = await existingHandle.createWritable();
      await writable.write(xml);
      await writable.close();
      return { kind: "written", fileName: existingHandle.name, handle: existingHandle };
    } catch {
      // e.g. permission revoked — fall through to picker / download
    }
  }

  const w = window as Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };

  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: safeName,
        types: [
          {
            description: "BioSim configuration",
            accept: { "application/xml": [".biosim", ".xml"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(xml);
      await writable.close();
      return { kind: "written", fileName: handle.name, handle };
    } catch (e) {
      if ((e as Error).name === "AbortError") return { kind: "cancelled" };
      // fall through to download
    }
  }

  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { kind: "downloaded", fileName: safeName };
}
