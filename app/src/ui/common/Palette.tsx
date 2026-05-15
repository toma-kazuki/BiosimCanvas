// Left-side palette. Two sections:
//
//   1. CATALOG — every module kind from `MODULE_KINDS`, grouped by
//      subsystem. Each chip is HTML5-draggable; the canvas listens
//      for drops and inserts a new module of that kind. Click also
//      works as a fallback (keyboard / accessibility): clicking adds
//      the module with a default position (no drop coordinates).
//
//   2. IN DOCUMENT — every module currently in the doc, grouped by
//      subsystem. Clicking focuses the module on the canvas.
//
// Drag protocol (kept private to this file + the drop targets):
//   dataTransfer key:   "application/biosim-kind"
//   dataTransfer value: the module kind string ("Fan", "OGS", …)

import { useMemo, useState } from "react";
import { useCanvasStore } from "../../state/store";
import {
  MODULE_KINDS,
  SUBSYSTEM_COLOR,
  SUBSYSTEM_LABEL,
  SUBSYSTEM_ORDER,
} from "../../domain/registry";
import {
  createDefaultModule,
  generateUniqueModuleName,
} from "../../domain/factories";
import type { ModuleNode, Subsystem } from "../../domain/types";
import { PhysicsTooltip } from "./PhysicsTooltip";

export const KIND_DRAG_MIME = "application/biosim-kind";

export function Palette() {
  const doc = useCanvasStore((s) => s.doc);
  const addModule = useCanvasStore((s) => s.addModule);
  const selectModule = useCanvasStore((s) => s.selectModule);
  const selectedName = useCanvasStore((s) => s.selectedModuleName);
  const [dragging, setDragging] = useState(false);

  const catalogBySub = useMemo(() => groupKindsBySubsystem(), []);

  const inDocBySubsystem = useMemo(() => {
    const groups: Partial<Record<Subsystem, ModuleNode[]>> = {};
    if (!doc) return groups;
    for (const m of doc.modules) {
      (groups[m.subsystem] ||= []).push(m);
    }
    return groups;
  }, [doc]);

  if (!doc) {
    return (
      <aside className="palette">
        <h3>Catalog</h3>
        <div className="placeholder">
          Loading or waiting for a document. Use the template picker or{" "}
          <kbd className="kbd-keys">⌘O</kbd>/<kbd className="kbd-keys">Ctrl+O</kbd> to open a file —
          then the catalog and module list appear here.
        </div>
      </aside>
    );
  }

  const handleCatalogClick = (kind: string) => {
    const name = generateUniqueModuleName(doc, kind);
    addModule(createDefaultModule(kind, name));
  };

  return (
    <aside className="palette">
      <h3>Catalog</h3>
      <div className="palette-hint">
        Drag onto the canvas, or click to add.
      </div>
      {SUBSYSTEM_ORDER.map((sub) => {
        const kinds = catalogBySub.get(sub) ?? [];
        if (kinds.length === 0) return null;
        return (
          <div key={`cat-${sub}`} className="palette-group">
            <div
              className="palette-sub-label"
              style={{ color: SUBSYSTEM_COLOR[sub] }}
            >
              {SUBSYSTEM_LABEL[sub]}
            </div>
            <div>
              {kinds.map((kind) => {
                const meta = MODULE_KINDS[kind];
                return (
                  <PhysicsTooltip key={`cat-${kind}`} moduleType={kind} suppress={dragging}>
                    <button
                      type="button"
                      className="catalog-chip"
                      draggable
                      onDragStart={(e) => {
                        setDragging(true);
                        e.dataTransfer.setData(KIND_DRAG_MIME, kind);
                        e.dataTransfer.setData("text/plain", kind);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => setDragging(false)}
                      onClick={() => handleCatalogClick(kind)}
                      title={`Add a new ${meta.label}`}
                    >
                      <span className="catalog-glyph">{meta.glyph}</span>
                      <span className="catalog-label">{meta.label}</span>
                    </button>
                  </PhysicsTooltip>
                );
              })}
            </div>
          </div>
        );
      })}

      <h3 style={{ marginTop: 16 }}>In document</h3>
      {SUBSYSTEM_ORDER.map((sub) => {
        const items = inDocBySubsystem[sub];
        if (!items || items.length === 0) return null;
        return (
          <div key={`doc-${sub}`} className="palette-group">
            <div
              className="palette-sub-label"
              style={{ color: SUBSYSTEM_COLOR[sub] }}
            >
              {SUBSYSTEM_LABEL[sub]} ({items.length})
            </div>
            <div>
              {items.map((m) => {
                const meta = MODULE_KINDS[m.kind];
                const active = m.moduleName === selectedName;
                return (
                  <button
                    type="button"
                    key={m.moduleName}
                    className={`doc-chip${active ? " active" : ""}`}
                    onClick={() => selectModule(m.moduleName)}
                    title={meta?.label ?? m.kind}
                  >
                    <span className="doc-glyph">{meta?.glyph ?? "??"}</span>
                    <span className="doc-name">{m.moduleName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

// --- helpers -------------------------------------------------------------

function groupKindsBySubsystem(): Map<Subsystem, string[]> {
  const out = new Map<Subsystem, string[]>();
  for (const [kind, meta] of Object.entries(MODULE_KINDS)) {
    const list = out.get(meta.subsystem) ?? [];
    list.push(kind);
    out.set(meta.subsystem, list);
  }
  for (const [, list] of out) {
    list.sort();
  }
  return out;
}
