import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SchematicNodeData } from "../../domain/graph";
import { MODULE_KINDS, SUBSYSTEM_COLOR, SUBSYSTEM_LABEL } from "../../domain/registry";

export function ModuleNodeView(props: NodeProps) {
  const { data, selected } = props;
  const { module } = data as unknown as SchematicNodeData;
  const meta = MODULE_KINDS[module.kind];
  const subLabel = meta?.label ?? module.kind;
  const sub = module.subsystem;
  const glyph = meta?.glyph ?? "??";
  const meta2 = secondaryLine(module);

  return (
    <div
      className={`mod-node${selected ? " selected" : ""}`}
      style={{ borderColor: SUBSYSTEM_COLOR[sub] }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="kind-row">
        <span className="glyph">{glyph}</span>
        <span>{subLabel}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: SUBSYSTEM_COLOR[sub], fontWeight: 600 }}>
          {SUBSYSTEM_LABEL[sub]}
        </span>
      </div>
      <div className="name">{module.moduleName}</div>
      {meta2 && <div className="meta">{meta2}</div>}
      {module.malfunction && (
        <div className="malf-badge">
          ⚠ malfunction @ tick {module.malfunction.occursAtTick}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function secondaryLine(m: SchematicNodeData["module"]): string | null {
  const a = m.attrs;
  const parts: string[] = [];
  if (a.initialVolume) parts.push(`vol=${a.initialVolume}`);
  if (a.capacity) parts.push(`cap=${a.capacity}`);
  if (a.level !== undefined) parts.push(`lvl=${a.level}`);
  if (a.generationType) parts.push(a.generationType);
  if (a.upperPowerGeneration) parts.push(`gen≤${a.upperPowerGeneration}`);
  if (m.crew && m.crew.length) parts.push(`crew=${m.crew.length}`);
  return parts.length ? parts.join(" · ") : null;
}
