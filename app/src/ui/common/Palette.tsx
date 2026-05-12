import { useMemo } from "react";
import { useCanvasStore } from "../../state/store";
import { MODULE_KINDS, SUBSYSTEM_LABEL, SUBSYSTEM_ORDER } from "../../domain/registry";
import type { ModuleNode, Subsystem } from "../../domain/types";

/**
 * v0.x palette. In this phase it's a *legend / outline* of the modules
 * present in the loaded model rather than a drag source, because we
 * have not yet wired up authoring of new modules. Clicking an entry
 * focuses that module on the canvas.
 *
 * Drag-to-place authoring lands in a later phase (see
 * docs/03-requirements.md F-EDIT-1).
 */
export function Palette() {
  const doc = useCanvasStore((s) => s.doc);
  const selectModule = useCanvasStore((s) => s.selectModule);
  const selectedName = useCanvasStore((s) => s.selectedModuleName);

  const bySubsystem = useMemo(() => {
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
        <h3>Modules</h3>
        <div className="placeholder">
          Loading template.biosim — modules will appear here grouped by
          subsystem.
        </div>
      </aside>
    );
  }

  return (
    <aside className="palette">
      {SUBSYSTEM_ORDER.map((sub) => {
        const items = bySubsystem[sub];
        if (!items || items.length === 0) return null;
        return (
          <div key={sub}>
            <h3>{SUBSYSTEM_LABEL[sub]}</h3>
            <div>
              {items.map((m) => {
                const meta = MODULE_KINDS[m.kind];
                const active = m.moduleName === selectedName;
                return (
                  <button
                    type="button"
                    key={m.moduleName}
                    onClick={() => selectModule(m.moduleName)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginBottom: 4,
                      padding: "5px 8px",
                      fontSize: 12,
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      background: active ? "var(--surface-3)" : "var(--surface-2)",
                    }}
                    title={meta?.label ?? m.kind}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                      {meta?.glyph ?? "??"}
                    </span>{" "}
                    {m.moduleName}
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
