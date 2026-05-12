// Renders a boundary connector (e.g. a Fan that bridges IHab → HALO)
// as a small pill straddling the gap between two rooms. The pill
// shows the module's moduleName and a directional arrow so reviewers
// can tell which way air flows. Not draggable — position is computed
// from the room geometry by the Spatial view.

import type { NodeProps } from "@xyflow/react";
import type { ModuleNode } from "../../domain/types";
import { MODULE_KINDS } from "../../domain/registry";
import type { BoundaryBridge } from "../../domain/spatialLayout";

export interface BoundaryConnectorNodeData extends Record<string, unknown> {
  module: ModuleNode;
  bridge: BoundaryBridge;
}

export function BoundaryConnectorView({ data, selected }: NodeProps) {
  const { module, bridge } = data as unknown as BoundaryConnectorNodeData;
  const meta = MODULE_KINDS[module.kind];
  const label = meta?.label ?? module.kind;
  const glyph = meta?.glyph ?? "??";

  return (
    <div className={`bdy-connector${selected ? " selected" : ""}`}>
      <span className="bdy-port">{bridge.from}</span>
      <span className="bdy-arrow">→</span>
      <div className="bdy-body">
        <span className="bdy-glyph">{glyph}</span>
        <div className="bdy-text">
          <div className="bdy-kind">{label}</div>
          <div className="bdy-name">{module.moduleName}</div>
        </div>
      </div>
      <span className="bdy-arrow">→</span>
      <span className="bdy-port">{bridge.to}</span>
      {module.malfunction && (
        <span
          className="bdy-malf"
          title={`malfunction @ tick ${module.malfunction.occursAtTick}`}
        >
          ⚠
        </span>
      )}
    </div>
  );
}
