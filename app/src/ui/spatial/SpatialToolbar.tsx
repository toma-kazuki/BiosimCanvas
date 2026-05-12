// Toolbar above the Spatial canvas: sidecar JSON I/O + view toggles.
//
// Save → triggers a browser download of the current layout as
// `<sourceName>.canvas.json`. Phase 9+ may upgrade this to use the
// File System Access API to write directly back to the original file.
// Load → file input that accepts JSON and replaces the in-memory
// layout via `setSpatialLayout`. Reset → drops the layout entirely so
// every module falls back to the default subsystem-column grid.

import { useRef } from "react";
import { useCanvasStore } from "../../state/store";
import {
  parseLayout,
  serializeLayout,
  sidecarFilename,
} from "../../domain/spatialLayout";

export function SpatialToolbar() {
  const doc = useCanvasStore((s) => s.doc)!;
  const setSpatialLayout = useCanvasStore((s) => s.setSpatialLayout);
  const setToast = useCanvasStore((s) => s.setToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const placedCount = doc.spatialLayout
    ? Object.keys(doc.spatialLayout).length
    : 0;

  const handleSave = () => {
    const json = serializeLayout(doc);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sidecarFilename(doc.sourceName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLoad = async (file: File) => {
    try {
      const text = await file.text();
      const layout = parseLayout(text);
      setSpatialLayout(layout);
      setToast(
        `Loaded layout for ${Object.keys(layout).length} modules from ${file.name}`,
      );
    } catch (err) {
      setToast(`Sidecar load failed: ${(err as Error).message}`);
    }
  };

  const handleReset = () => {
    setSpatialLayout(undefined);
    setToast("Layout reset to default grid");
  };

  return (
    <div className="spatial-toolbar">
      <div className="spatial-toolbar-status">
        {placedCount > 0 ? (
          <>
            <span className="spatial-pip on" /> {placedCount} placed
          </>
        ) : (
          <>
            <span className="spatial-pip off" /> default grid
          </>
        )}
      </div>

      <div className="spatial-toolbar-spacer" />

      <button
        type="button"
        className="spatial-btn"
        onClick={handleReset}
        disabled={placedCount === 0}
        title="Drop all custom positions; modules return to the default grid"
      >
        Reset
      </button>

      <label className="spatial-btn">
        Load…
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleLoad(f);
            e.target.value = "";
          }}
        />
      </label>

      <button
        type="button"
        className="spatial-btn primary"
        onClick={handleSave}
        title={`Download ${sidecarFilename(doc.sourceName)}`}
      >
        Save layout
      </button>
    </div>
  );
}
