import type { NodeProps } from "@xyflow/react";
import type { SubsystemNodeData } from "../../domain/graph";
import { SUBSYSTEM_COLOR } from "../../domain/registry";

/**
 * A non-interactive labeled "lane" rendered behind a group of module
 * nodes. Communicates subsystem grouping at a glance. Modules sit on
 * top (higher zIndex) and receive all pointer events.
 */
export function SubsystemNodeView({ data }: NodeProps) {
  const { subsystem, label, width, height } = data as unknown as SubsystemNodeData;
  const color = SUBSYSTEM_COLOR[subsystem];

  return (
    <div
      className="subsystem-box"
      style={{
        width,
        height,
        // Border: dashed in subsystem color. Background: very faint tint
        // so the box is visible without overpowering the module nodes.
        border: `1.5px dashed ${color}`,
        borderRadius: 14,
        background: `${color}10`,
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <div
        className="subsystem-header"
        style={{
          position: "absolute",
          top: 8,
          left: 14,
          color,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          // little colored dot
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            marginRight: 8,
            verticalAlign: "middle",
          }}
        />
        {label}
      </div>
    </div>
  );
}
