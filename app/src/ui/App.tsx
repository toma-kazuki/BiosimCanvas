import { useCallback, useEffect, useState } from "react";
import { useCanvasStore } from "../state/store";
import { parseBiosim } from "../io/parseBiosim";
import { emitBiosim } from "../io/emitBiosim";
import { defaultBiosimFilename, saveBiosimFile } from "../io/saveBiosimFile";
import { Schematic } from "./schematic/Schematic";
import { SidePanel } from "./side-panel/SidePanel";
import { Palette } from "./common/Palette";
import { ViewSwitcher } from "./common/ViewSwitcher";
import { Spatial } from "./spatial/Spatial";
import { Timeline } from "./timeline/Timeline";
import { Review } from "./review/Review";
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
    id: "empty",
    label: "Empty / minimal",
    path: "/templates/empty-minimal.biosim",
    displayName: "empty-minimal.biosim",
  },
  {
    id: "template",
    label: "Default (ISS-class)",
    path: "/templates/template.biosim",
    displayName: "template.biosim",
  },
  {
    id: "lunar-minihab",
    label: "Lunar minihab",
    path: "/templates/lunar-minihab.biosim",
    displayName: "lunar-minihab.biosim",
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
  const biosimFileHandle = useCanvasStore((s) => s.biosimFileHandle);
  const applyBiosimSave = useCanvasStore((s) => s.applyBiosimSave);
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

  const saveBiosim = useCallback(
    async (saveAs: boolean) => {
      if (!doc) return;
      const xml = emitBiosim(doc);
      const suggested = defaultBiosimFilename(doc.sourceName);
      const result = await saveBiosimFile({
        xml,
        suggestedName: suggested,
        existingHandle: biosimFileHandle,
        saveAs,
      });
      if (result.kind === "cancelled") return;
      if (result.kind === "written") {
        applyBiosimSave(result.fileName, result.handle, "fs");
        return;
      }
      applyBiosimSave(result.fileName, null, "download");
    },
    [doc, biosimFileHandle, applyBiosimSave],
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
        <button
          type="button"
          title="Write the current model to disk (reuses last path when possible)"
          onClick={() => saveBiosim(false)}
        >
          Save .biosim
        </button>
        <button
          type="button"
          title="Always choose a new file location"
          onClick={() => saveBiosim(true)}
        >
          Save as…
        </button>
      </div>

      <Palette />

      <div className="canvas">
        <ViewSwitcher />
        {doc ? (
          view === "schematic" ? (
            <Schematic />
          ) : view === "spatial" ? (
            <Spatial />
          ) : view === "timeline" ? (
            <Timeline />
          ) : view === "review" ? (
            <Review />
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
        <span>BioSimCanvas v0.x · local-first authoring</span>
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
