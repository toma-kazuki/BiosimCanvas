import { useCallback, useEffect, useState } from "react";
import { useCanvasStore } from "../state/store";
import { parseBiosim } from "../io/parseBiosim";
import { Schematic } from "./schematic/Schematic";
import { SidePanel } from "./side-panel/SidePanel";
import { Palette } from "./common/Palette";
import { ViewSwitcher } from "./common/ViewSwitcher";
import { Timeline } from "./timeline/Timeline";
import { XmlView } from "./xml-view/XmlView";

interface BundledTemplate {
  id: string;
  label: string;
  /** Filename served from /public/templates/. */
  path: string;
  /** Display-name shown in the title bar after load. */
  displayName: string;
}

const BUNDLED_TEMPLATES: BundledTemplate[] = [
  {
    id: "template",
    label: "Default",
    path: "/templates/template.biosim",
    displayName: "template.biosim",
  },
  {
    id: "anomalies",
    label: "Anomalies demo",
    path: "/templates/template-anomalies.biosim",
    displayName: "template-anomalies.biosim",
  },
];

const DEFAULT_TEMPLATE_ID = "template";

export function App() {
  const doc = useCanvasStore((s) => s.doc);
  const setDoc = useCanvasStore((s) => s.setDoc);
  const view = useCanvasStore((s) => s.view);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

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

  const loadBundledTemplate = useCallback(
    async (id: string) => {
      const tpl = BUNDLED_TEMPLATES.find((t) => t.id === id);
      if (!tpl) return;
      try {
        const r = await fetch(tpl.path);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const xml = await r.text();
        await loadXml(xml, tpl.displayName);
        setActiveTemplateId(id);
      } catch (err) {
        console.warn("[BioSimCanvas] failed to load bundled template", id, err);
      }
    },
    [loadXml],
  );

  useEffect(() => {
    if (doc) return;
    loadBundledTemplate(DEFAULT_TEMPLATE_ID);
  }, [doc, loadBundledTemplate]);

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      await loadXml(text, file.name);
      setActiveTemplateId(null); // user-loaded file is not one of ours
    },
    [loadXml],
  );

  return (
    <div className="app">
      <div className="appbar">
        <div className="brand">BioSimCanvas</div>
        <div className="filename">{doc?.sourceName ?? "(no file)"}</div>
        <div className="spacer" />
        <label className="template-picker" title="Load a bundled template">
          <span className="template-picker-label">template</span>
          <select
            value={activeTemplateId ?? ""}
            onChange={(e) => loadBundledTemplate(e.target.value)}
          >
            {activeTemplateId === null && (
              <option value="" disabled>
                (custom)
              </option>
            )}
            {BUNDLED_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="file-button">
          <button type="button">Open .biosim</button>
          <input
            type="file"
            accept=".biosim,.xml,application/xml,text/xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <Palette />

      <div className="canvas">
        <ViewSwitcher />
        {doc ? (
          view === "schematic" ? (
            <Schematic />
          ) : view === "timeline" ? (
            <Timeline />
          ) : (
            <XmlView />
          )
        ) : (
          <EmptyState />
        )}
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
