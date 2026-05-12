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
import { buildSchematic, type SchematicEdgeData, type SchematicNodeData } from "../../domain/graph";
import { ModuleNodeView } from "./ModuleNodeView";
import { Legend } from "./Legend";
import { useCanvasStore } from "../../state/store";

const nodeTypes = { module: ModuleNodeView };

export function Schematic() {
  const doc = useCanvasStore((s) => s.doc)!;
  const selectModule = useCanvasStore((s) => s.selectModule);
  const selectedModuleName = useCanvasStore((s) => s.selectedModuleName);

  const { nodes, edges } = useMemo(() => buildSchematic(doc), [doc]);

  // tag selection on nodes so the renderer can outline
  const annotatedNodes: Node<SchematicNodeData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedModuleName,
      })),
    [nodes, selectedModuleName],
  );

  const onNodeClick: NodeMouseHandler = (_e, n) => {
    selectModule(n.id);
  };

  return (
    <ReactFlowProvider>
      <ReactFlow<Node<SchematicNodeData>, Edge<SchematicEdgeData>>
        nodes={annotatedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => selectModule(null)}
        fitView
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#1f2330" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) =>
            (n.style?.borderColor as string | undefined) ?? "#888"
          }
          nodeStrokeColor="transparent"
          maskColor="rgba(15,17,21,0.7)"
        />
        <Controls showInteractive={false} />
        <Legend />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
