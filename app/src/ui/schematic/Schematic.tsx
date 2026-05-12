import { useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildSchematic, type SchematicEdgeData } from "../../domain/graph";
import { ModuleNodeView } from "./ModuleNodeView";
import { SubsystemNodeView } from "./SubsystemNodeView";
import { Legend } from "./Legend";
import { useCanvasStore } from "../../state/store";

const nodeTypes = { module: ModuleNodeView, subsystem: SubsystemNodeView };

export function Schematic() {
  const doc = useCanvasStore((s) => s.doc)!;
  const selectModule = useCanvasStore((s) => s.selectModule);
  const selectedModuleName = useCanvasStore((s) => s.selectedModuleName);

  const { nodes, edges } = useMemo(() => buildSchematic(doc), [doc]);

  // tag selection on nodes so the renderer can outline
  const annotatedNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.type === "module" && n.id === selectedModuleName,
      })),
    [nodes, selectedModuleName],
  );

  const onNodeClick: NodeMouseHandler = (_e, n) => {
    // Subsystem containers are non-interactive but XYFlow still bubbles
    // clicks through; ignore them so the side panel stays put.
    if (n.type !== "module") return;
    selectModule(n.id);
  };

  return (
    <ReactFlowProvider>
      <ReactFlow<Node, Edge<SchematicEdgeData>>
        nodes={annotatedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => selectModule(null)}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#1f2330" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            if (n.type !== "module") return "transparent";
            return (n.style?.borderColor as string | undefined) ?? "#888";
          }}
          nodeStrokeColor="transparent"
          maskColor="rgba(15,17,21,0.7)"
        />
        <Controls showInteractive={false} />
        <Legend />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

