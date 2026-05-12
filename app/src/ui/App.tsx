import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../state/store";
import {
  clearSession,
  loadAutosavePreference,
  persistSession,
  readSession,
  type StoredSessionV1,
} from "../session/autosave";
import { parseBiosim } from "../io/parseBiosim";
import { emitBiosim } from "../io/emitBiosim";
import { defaultBiosimFilename, saveBiosimFile } from "../io/saveBiosimFile";
import { Schematic } from "./schematic/Schematic";
import { SidePanel } from "./side-panel/SidePanel";
import { Palette } from "./common/Palette";
import { ViewSwitcher } from "./common/ViewSwitcher";
import { KeyboardShortcutsModal } from "./common/KeyboardShortcutsModal";
import { exportCanvasViewPng } from "./common/exportViewPng";
import { viewFromDigit } from "./common/views";
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
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const pastLen = useCanvasStore((s) => s.past.length);
  const futureLen = useCanvasStore((s) => s.future.length);
  const autosaveEnabled = useCanvasStore((s) => s.autosaveEnabled);
  const setAutosaveEnabled = useCanvasStore((s) => s.setAutosaveEnabled);
  const setView = useCanvasStore((s) => s.setView);
  const selectModule = useCanvasStore((s) => s.selectModule);
  const setToast = useCanvasStore((s) => s.setToast);
  const view = useCanvasStore((s) => s.view);
  const biosimFileHandle = useCanvasStore((s) => s.biosimFileHandle);
  const applyBiosimSave = useCanvasStore((s) => s.applyBiosimSave);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [sessionOffer, setSessionOffer] = useState<StoredSessionV1 | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const openFileRef = useRef<HTMLInputElement>(null);

  const loadXml = useCallback(
    async (xml: string, sourceName: string) => {
      try {
        const parsed = parseBiosim(xml, sourceName);
        setDoc(parsed);
        setToast(null);
      } catch (err) {
        console.error("[BioSimCanvas] failed to parse", sourceName, err);
        setToast(`Parse error (${sourceName}): ${(err as Error).message}`);
      }
    },
    [setDoc, setToast],
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
        setToast(
          `Could not load template "${tpl.label}": ${(err as Error).message}`,
        );
      }
    },
    [loadXml, setToast],
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

  const runExportPng = useCallback(async () => {
    if (!doc) {
      setToast("Load a document first");
      return;
    }
    try {
      await exportCanvasViewPng({
        view,
        baseName: doc.sourceName ?? "biosim-view",
      });
      setToast("PNG downloaded");
    } catch (e) {
      setToast((e as Error).message);
    }
  }, [doc, view, setToast]);

  const showHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    if (doc) return;
    loadBundledTemplate(DEFAULT_TEMPLATE_ID);
  }, [doc, loadBundledTemplate]);

  useEffect(() => {
    if (!loadAutosavePreference()) return;
    const s = readSession();
    if (s) setSessionOffer(s);
  }, []);

  useEffect(() => {
    if (!autosaveEnabled || !doc) return;
    const id = window.setTimeout(() => persistSession(doc), 1500);
    return () => window.clearTimeout(id);
  }, [doc, autosaveEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const tag = target?.tagName ?? "";
      const inHtmlField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        if (helpOpen) {
          e.preventDefault();
          closeHelp();
          return;
        }
        if (!inHtmlField) selectModule(null);
        return;
      }

      if (inHtmlField) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        showHelp();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (e.altKey && !mod && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const v = viewFromDigit(e.key);
        if (v) setView(v);
        return;
      }

      if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        void saveBiosim(false);
        return;
      }
      if (mod && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        openFileRef.current?.click();
        return;
      }

      if (!mod) return;
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "y" && e.ctrlKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    undo,
    redo,
    saveBiosim,
    selectModule,
    setView,
    showHelp,
    closeHelp,
    helpOpen,
  ]);

  const dismissSessionOffer = useCallback(() => {
    clearSession();
    setSessionOffer(null);
  }, []);

  const restoreSessionOffer = useCallback(() => {
    if (!sessionOffer) return;
    setDoc(sessionOffer.doc);
    setActiveTemplateId(null);
    setSessionOffer(null);
  }, [sessionOffer, setDoc]);

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      await loadXml(text, file.name);
      setActiveTemplateId(null); // user-loaded file is not one of ours
    },
    [loadXml],
  );

  return (
    <div className={sessionOffer ? "app app--session-offer" : "app"}>
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
            ref={openFileRef}
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

      {sessionOffer && (
        <div className="session-restore">
          <span className="session-restore-text">
            Restore previous session from{" "}
            {new Date(sessionOffer.savedAt).toLocaleString()}
            {sessionOffer.sourceName ? ` (${sessionOffer.sourceName})` : ""}?
          </span>
          <div className="session-restore-actions">
            <button type="button" className="primary" onClick={restoreSessionOffer}>
              Restore
            </button>
            <button type="button" onClick={dismissSessionOffer}>
              Discard
            </button>
          </div>
        </div>
      )}

      <Palette />

      <div className="canvas">
        <ViewSwitcher onExportPng={runExportPng} onShowHelp={showHelp} />
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

      <KeyboardShortcutsModal open={helpOpen} onClose={closeHelp} />

      <div className="statusbar">
        <span>
          {doc
            ? `${doc.modules.length} modules · ${doc.sensors.length} sensors`
            : "Loading template.biosim…"}
        </span>
        <span className="statusbar-sep" aria-hidden>
          ·
        </span>
        <button
          type="button"
          className="status-undo"
          disabled={pastLen === 0}
          title="Undo (⌘/Ctrl+Z)"
          onClick={() => undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="status-redo"
          disabled={futureLen === 0}
          title="Redo (⌘/Ctrl+Shift+Z or Ctrl+Y)"
          onClick={() => redo()}
        >
          Redo
        </button>
        <label className="autosave-toggle">
          <input
            type="checkbox"
            checked={autosaveEnabled}
            onChange={(e) => setAutosaveEnabled(e.target.checked)}
          />
          Session autosave
        </label>
        <span style={{ flex: 1 }} />
        <span>BioSimCanvas v0.x · local-first authoring</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-canvas">
      <p className="empty-canvas-title">No document in memory yet</p>
      <p className="empty-canvas-lead">
        A bundled template loads automatically. If this message persists, check the network tab
        or use <strong>Open .biosim</strong> in the bar above.
      </p>
      <p className="empty-canvas-hint">
        <kbd className="kbd-keys">⌘O</kbd> / <kbd className="kbd-keys">Ctrl+O</kbd> open a file ·{" "}
        <kbd className="kbd-keys">?</kbd> shortcuts
      </p>
    </div>
  );
}
