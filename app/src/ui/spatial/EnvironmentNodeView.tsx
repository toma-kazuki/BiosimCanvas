// Renders a SimEnvironment as a "room" on the spatial floor plan: a
// large translucent box with a header strip. Modules contained in
// the room are NOT children of this node — they're rendered as
// siblings at higher zIndex, so we just draw the room shell here.

import type { NodeProps } from "@xyflow/react";
import type { ModuleNode } from "../../domain/types";
import { SUBSYSTEM_COLOR } from "../../domain/registry";

export interface EnvironmentNodeData extends Record<string, unknown> {
  module: ModuleNode;
  width: number;
  height: number;
}

export function EnvironmentNodeView({ data, selected }: NodeProps) {
  const { module, width, height } = data as unknown as EnvironmentNodeData;
  const color = SUBSYSTEM_COLOR.environment;
  const volume = module.attrs.initialVolume;

  return (
    <div
      className={`env-room${selected ? " selected" : ""}`}
      style={{
        width,
        height,
        borderColor: color,
        background: `${color}10`,
      }}
    >
      <div className="env-room-header" style={{ background: `${color}22` }}>
        <span className="env-room-dot" style={{ background: color }} />
        <span className="env-room-name">{module.moduleName}</span>
        {volume && (
          <span className="env-room-sub">vol {volume} L</span>
        )}
      </div>
    </div>
  );
}
