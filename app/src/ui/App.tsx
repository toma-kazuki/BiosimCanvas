import { useCallback, useEffect } from "react";
import { useCanvasStore } from "../state/store";
import { parseBiosim } from "../io/parseBiosim";
import { Schematic } from "./schematic/Schematic";
import { SidePanel } from "./side-panel/SidePanel";
import { Palette } from "./common/Palette";

const BUNDLED_TEMPLATE = "/templates/template.biosim";

export function App() {
  const doc = useCanvasStore((s) => s.doc);
  const setDoc = useCanvasStore((s) => s.setDoc);

  const loadXml = useCallback(
    async (xml: string, sourceName: string) => {
      try {
        const parsed = parseBiosim(xml, sourceName);
        setDoc(parsed);
      } catch (err) {
        console.error("[BioSimCanvas] failed to parse", sourceName, err);
        alert(`Failed to parse ${sourceName}: ${(err as Error).message}`);
      }
    },
    [setDoc],
  );

  useEffect(() => {
    if (doc) return;
    fetch(BUNDLED_TEMPLATE)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((xml) => loadXml(xml, "template.biosim"))
      .catch((err) => {
        console.warn("[BioSimCanvas] no bundled template found:", err);
      });
  }, [doc, loadXml]);

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      await loadXml(text, file.name);
    },
    [loadXml],
  );

  return (
    <div className="app">
      <div className="appbar">
        <div className="brand">BioSimCanvas</div>
        <div className="filename">{doc?.sourceName ?? "(no file)"}</div>
        <div className="spacer" />
        <label className="file-button">
          <button type="button">Open .biosim</button>
          <input
            type="file"
            accept=".biosim,.xml,application/xml,text/xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = ""; // allow re-loading same file
            }}
          />
        </label>
      </div>

      <Palette />

      <div className="canvas">
        {doc ? <Schematic /> : <EmptyState />}
      </div>

      <SidePanel />

      <div className="statusbar">
        <span>
          {doc
            ? `${doc.modules.length} modules · ${doc.sensors.length} sensors`
            : "Loading template.biosim…"}
        </span>
        <span style={{ flex: 1 }} />
        <span>BioSimCanvas v0.x · schematic-only preview</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      Open a .biosim file to begin.
    </div>
  );
}
