import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildSchematic, type SchematicEdgeData } from "../../domain/graph";
import { ModuleNodeView } from "./ModuleNodeView";
import { SubsystemNodeView } from "./SubsystemNodeView";
import { Legend } from "./Legend";
import { useCanvasStore } from "../../state/store";
import {
  createDefaultModule,
  createEmptyEndpoint,
  generateUniqueModuleName,
} from "../../domain/factories";
import { RESOURCE_LABEL } from "../../domain/registry";
import type { ResourceKind } from "../../domain/types";
import { KIND_DRAG_MIME } from "../common/Palette";

const nodeTypes = { module: ModuleNodeView, subsystem: SubsystemNodeView };

interface PendingConnection {
  source: string;
  target: string;
  /** Mid-edge anchor in client (viewport) coordinates. */
  clientX: number;
  clientY: number;
}

export function Schematic() {
  const doc = useCanvasStore((s) => s.doc)!;
  const selectModule = useCanvasStore((s) => s.selectModule);
  const selectedModuleName = useCanvasStore((s) => s.selectedModuleName);
  const addModule = useCanvasStore((s) => s.addModule);
  const addEndpoint = useCanvasStore((s) => s.addEndpoint);
  const [pending, setPending] = useState<PendingConnection | null>(null);

  const { nodes, edges } = useMemo(() => buildSchematic(doc), [doc]);

  const annotatedNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.type === "module" && n.id === selectedModuleName,
      })),
    [nodes, selectedModuleName],
  );

  const onNodeClick: NodeMouseHandler = (_e, n) => {
    if (n.type !== "module") return;
    selectModule(n.id);
  };

  // --- drag-link: from one node's source handle to another's target ------

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target || params.source === params.target) {
        return;
      }
      // Anchor the picker over the target node so it doesn't end up off-screen.
      const el = document.querySelector(
        `.react-flow__node[data-id="${cssEscape(params.target)}"]`,
      ) as HTMLElement | null;
      const rect = el?.getBoundingClientRect();
      const anchor = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      setPending({
        source: params.source,
        target: params.target,
        clientX: anchor.x,
        clientY: anchor.y,
      });
    },
    [],
  );

  const commitPending = (resource: ResourceKind) => {
    if (!pending) return;
    const ep = createEmptyEndpoint("producer", resource);
    ep.refs = [pending.target];
    addEndpoint(pending.source, ep);
    setPending(null);
    selectModule(pending.source);
  };

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
      const name = generateUniqueModuleName(doc, kind);
      addModule(createDefaultModule(kind, name));
    },
    [doc, addModule],
  );

  return (
    <ReactFlowProvider>
      <div
        style={{ width: "100%", height: "100%", position: "relative" }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow<Node, Edge<SchematicEdgeData>>
          nodes={annotatedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => selectModule(null)}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable
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
        {pending && (
          <LinkResourcePopover
            pending={pending}
            onCommit={commitPending}
            onCancel={() => setPending(null)}
          />
        )}
      </div>
    </ReactFlowProvider>
  );
}

const RESOURCE_OPTIONS = Object.keys(RESOURCE_LABEL) as ResourceKind[];

function LinkResourcePopover({
  pending,
  onCommit,
  onCancel,
}: {
  pending: PendingConnection;
  onCommit: (r: ResourceKind) => void;
  onCancel: () => void;
}) {
  const [resource, setResource] = useState<ResourceKind>("air");
  return (
    <div
      className="link-popover"
      style={{ left: pending.clientX, top: pending.clientY }}
    >
      <div className="link-popover-head">
        <span className="link-popover-title">New flow</span>
        <button
          type="button"
          className="link-popover-x"
          onClick={onCancel}
          aria-label="Cancel"
        >
          ×
        </button>
      </div>
      <div className="link-popover-row">
        <span className="link-popover-from">{pending.source}</span>
        <span className="link-popover-arrow">→</span>
        <span className="link-popover-to">{pending.target}</span>
      </div>
      <select
        className="field"
        value={resource}
        onChange={(e) => setResource(e.target.value as ResourceKind)}
        autoFocus
      >
        {RESOURCE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {RESOURCE_LABEL[r]}
          </option>
        ))}
      </select>
      <div className="link-popover-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={() => onCommit(resource)}>
          Create flow
        </button>
      </div>
    </div>
  );
}

/**
 * Minimal CSS.escape polyfill — we use it to build a query selector for
 * a node id that may contain unusual characters. Falls back to
 * `CSS.escape` when available.
 */
function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
