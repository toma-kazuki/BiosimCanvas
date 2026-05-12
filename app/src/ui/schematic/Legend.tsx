import { useMemo } from "react";
import { useCanvasStore } from "../../state/store";
import { RESOURCE_COLOR, RESOURCE_LABEL } from "../../domain/registry";
import type { ResourceKind } from "../../domain/types";

/**
 * A compact, in-canvas legend listing only the resources actually present
 * in the loaded model. Sits inside ReactFlow and is non-interactive.
 */
export function Legend() {
  const doc = useCanvasStore((s) => s.doc);
  const resources = useMemo(() => {
    if (!doc) return [] as ResourceKind[];
    const set = new Set<ResourceKind>();
    for (const m of doc.modules) {
      for (const ep of m.endpoints) {
        if (ep.refs.length) set.add(ep.resource);
      }
    }
    return Array.from(set);
  }, [doc]);

  if (!resources.length) return null;

  return (
    <div className="legend">
      <span style={{ color: "var(--text-muted)" }}>Flows:</span>
      {resources.map((r) => (
        <span className="item" key={r}>
          <span className="swatch" style={{ background: RESOURCE_COLOR[r] }} />
          {RESOURCE_LABEL[r]}
        </span>
      ))}
    </div>
  );
}
