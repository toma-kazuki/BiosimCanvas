// Spatial view — a floor-plan editor for the habitat.
//
// Three kinds of nodes are rendered (no edges):
//
//   1. SimEnvironment rooms: large translucent boxes with a header.
//      Draggable; size auto-fits contents in the default layout, and
//      moving a room translates everything currently inside it by the
//      same delta so contained hardware "sticks".
//
//   2. Inside-room modules (stores / hardware / crew groups): the
//      usual `ModuleNodeView`, positioned in absolute canvas coords.
//      Default layout drops them into a 2-column grid inside their
//      "home" SimEnvironment (chosen by inspecting their air-port refs).
//
//   3. Boundary connectors (Fans bridging A → B): small pills
//      auto-placed at the midpoint between the two rooms. Not
//      draggable; multiple connectors between the same pair stack
//      vertically so they never overlap.
//
// The sidecar JSON stores positions for (1) and (2). (3) is always
// derived, so its layout follows whatever rooms you place.

import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ModuleNode, Position } from "../../domain/types";
import { SUBSYSTEM_COLOR } from "../../domain/registry";
import {
  boundaryBridge,
  boundaryConnectorPosition,
  collectSimEnvs,
  defaultSpatialLayout,
  envBox,
  ENV_H,
  ENV_W,
  groupBoundaryConnectors,
  modulePosition,
  NODE_H,
  NODE_W,
  type BoundaryBridge,
} from "../../domain/spatialLayout";
import {
  createDefaultModule,
  generateUniqueModuleName,
} from "../../domain/factories";
import { ModuleNodeView } from "../schematic/ModuleNodeView";
import { useCanvasStore } from "../../state/store";
import { KIND_DRAG_MIME } from "../common/Palette";
import { SpatialToolbar } from "./SpatialToolbar";
import {
  BoundaryConnectorView,
  type BoundaryConnectorNodeData,
} from "./BoundaryConnectorView";
import {
  EnvironmentNodeView,
  type EnvironmentNodeData,
} from "./EnvironmentNodeView";

const nodeTypes = {
  module: ModuleNodeView,
  envRoom: EnvironmentNodeView,
  boundaryConnector: BoundaryConnectorView,
};

interface EnvBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Spatial() {
  return (
    <ReactFlowProvider>
      <SpatialInner />
    </ReactFlowProvider>
  );
}

function SpatialInner() {
  const doc = useCanvasStore((s) => s.doc)!;
  const selectModule = useCanvasStore((s) => s.selectModule);
  const selectedModuleName = useCanvasStore((s) => s.selectedModuleName);
  const setModulePosition = useCanvasStore((s) => s.setModulePosition);
  const bulkSetPositions = useCanvasStore((s) => s.bulkSetPositions);
  const addModule = useCanvasStore((s) => s.addModule);
  const { screenToFlowPosition } = useReactFlow();

  const fallbackLayout = useMemo(() => defaultSpatialLayout(doc), [doc]);

  // Classify every module into one of: env, boundary, inside-room.
  const { envs, insideRoomModules, boundaryItems } = useMemo(() => {
    const envModules = collectSimEnvs(doc);
    const envNames = new Set(envModules.map((e) => e.moduleName));
    const insides: ModuleNode[] = [];
    const boundaries: { module: ModuleNode; bridge: BoundaryBridge }[] = [];
    for (const m of doc.modules) {
      if (m.kind === "SimEnvironment") continue;
      const bridge = boundaryBridge(m, envNames);
      if (bridge) boundaries.push({ module: m, bridge });
      else insides.push(m);
    }
    return {
      envs: envModules,
      insideRoomModules: insides,
      boundaryItems: boundaries,
    };
  }, [doc]);

  // Effective box per env (stored override > default).
  const envBoxes = useMemo(() => {
    const m = new Map<string, EnvBox>();
    for (const env of envs) {
      m.set(env.moduleName, envBox(doc, env, fallbackLayout));
    }
    return m;
  }, [doc, envs, fallbackLayout]);

  const nodes: Node[] = useMemo(() => {
    const out: Node[] = [];

    for (const env of envs) {
      const b = envBoxes.get(env.moduleName)!;
      out.push({
        id: env.moduleName,
        type: "envRoom",
        position: { x: b.x, y: b.y },
        data: {
          module: env,
          width: b.w,
          height: b.h,
        } satisfies EnvironmentNodeData,
        style: { width: b.w, height: b.h, zIndex: 1 },
        selected: env.moduleName === selectedModuleName,
        zIndex: 1,
      });
    }

    for (const m of insideRoomModules) {
      const pos = modulePosition(doc, m, fallbackLayout);
      out.push({
        id: m.moduleName,
        type: "module",
        position: pos,
        data: { module: m, subsystem: m.subsystem },
        style: { borderColor: SUBSYSTEM_COLOR[m.subsystem], zIndex: 10 },
        selected: m.moduleName === selectedModuleName,
        zIndex: 10,
      });
    }

    // Boundary connectors — group by room pair, stack vertically.
    const grouped = groupBoundaryConnectors(boundaryItems);
    for (const [, items] of grouped) {
      items.forEach((c, i) => {
        const fromBox = envBoxes.get(c.bridge.from);
        const toBox = envBoxes.get(c.bridge.to);
        if (!fromBox || !toBox) return;
        const stackOffset = (i - (items.length - 1) / 2) * (NODE_H + 12);
        const pos = boundaryConnectorPosition(fromBox, toBox, stackOffset);
        out.push({
          id: c.module.moduleName,
          type: "boundaryConnector",
          position: pos,
          data: {
            module: c.module,
            bridge: c.bridge,
          } satisfies BoundaryConnectorNodeData,
          draggable: false,
          selected: c.module.moduleName === selectedModuleName,
          zIndex: 20,
          style: { zIndex: 20 },
        });
      });
    }

    return out;
  }, [doc, envs, envBoxes, insideRoomModules, boundaryItems, fallbackLayout, selectedModuleName]);

  const onNodeClick: NodeMouseHandler = (_e, n) => {
    selectModule(n.id);
  };

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_e, node) => {
      if (node.type === "envRoom") {
        // Translate every module currently inside this room by the
        // same delta so contents move with the room.
        const oldBox = envBoxes.get(node.id)!;
        const dx = node.position.x - oldBox.x;
        const dy = node.position.y - oldBox.y;
        const updates: Record<string, Position> = {
          [node.id]: { x: node.position.x, y: node.position.y, w: oldBox.w, h: oldBox.h },
        };
        if (dx !== 0 || dy !== 0) {
          for (const m of insideRoomModules) {
            const cur = modulePosition(doc, m, fallbackLayout);
            const inOldBox =
              cur.x >= oldBox.x &&
              cur.x <= oldBox.x + oldBox.w &&
              cur.y >= oldBox.y &&
              cur.y <= oldBox.y + oldBox.h;
            if (inOldBox) {
              updates[m.moduleName] = { x: cur.x + dx, y: cur.y + dy };
            }
          }
        }
        bulkSetPositions(updates);
      } else if (node.type === "module") {
        setModulePosition(node.id, { x: node.position.x, y: node.position.y });
      }
      // boundary connectors are not draggable; ignore.
    },
    [doc, envBoxes, insideRoomModules, fallbackLayout, bulkSetPositions, setModulePosition],
  );

  // No flow edges in the spatial view.
  const edges: Edge[] = [];

  // --- drag-from-palette --------------------------------------------------

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes(KIND_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const kind = e.dataTransfer.getData(KIND_DRAG_MIME);
      if (!kind) return;
      e.preventDefault();

      // Convert screen → flow coordinates and center the new node on the cursor.
      const drop = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const isEnv = kind === "SimEnvironment";
      const w = isEnv ? ENV_W : NODE_W;
      const h = isEnv ? ENV_H : NODE_H;
      const pos: Position = { x: drop.x - w / 2, y: drop.y - h / 2 };
      if (isEnv) {
        pos.w = ENV_W;
        pos.h = ENV_H;
      }

      const name = generateUniqueModuleName(doc, kind);
      const mod = createDefaultModule(kind, name);
      addModule(mod);
      // `addModule` already selects; place it at the cursor.
      setModulePosition(name, pos);
    },
    [doc, addModule, setModulePosition, screenToFlowPosition],
  );

  return (
    <div className="spatial-view">
      <SpatialToolbar />
      <div className="spatial-canvas" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => selectModule(null)}
          onNodeDragStop={onNodeDragStop}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} color="#1f2330" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              if (n.type === "envRoom") return SUBSYSTEM_COLOR.environment + "55";
              if (n.type === "boundaryConnector") return SUBSYSTEM_COLOR.environment;
              return (n.style?.borderColor as string | undefined) ?? "#888";
            }}
            nodeStrokeColor="transparent"
            maskColor="rgba(15,17,21,0.7)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
