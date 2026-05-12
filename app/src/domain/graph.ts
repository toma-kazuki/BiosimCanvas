import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type { BiosimDocument, ModuleNode, ResourceKind } from "./types";
import { RESOURCE_COLOR, SUBSYSTEM_COLOR } from "./registry";

/**
 * Build the XYFlow node + edge arrays from the canonical document model.
 *
 * Producer/consumer endpoints reference other modules by name; we resolve
 * each reference into a directed edge from producer-module → consumer-module
 * (i.e. the data-flow direction).
 *
 * Endpoints whose target module is missing are silently dropped here — the
 * export-time validator (F-EXPORT-2) is the right place to surface those
 * as warnings; for v0.x we just keep the diagram clean.
 */
export interface SchematicNodeData extends Record<string, unknown> {
  module: ModuleNode;
  subsystem: ModuleNode["subsystem"];
}

export interface SchematicEdgeData extends Record<string, unknown> {
  resource: ResourceKind;
  fromModule: string;
  toModule: string;
}

export function buildSchematic(doc: BiosimDocument): {
  nodes: Node<SchematicNodeData>[];
  edges: Edge<SchematicEdgeData>[];
} {
  const byName = new Map<string, ModuleNode>();
  for (const m of doc.modules) byName.set(m.moduleName, m);

  const nodes: Node<SchematicNodeData>[] = doc.modules.map((m) => ({
    id: m.moduleName,
    type: "module",
    position: { x: 0, y: 0 }, // overwritten by layout
    data: { module: m, subsystem: m.subsystem },
    style: { borderColor: SUBSYSTEM_COLOR[m.subsystem] },
  }));

  const edges: Edge<SchematicEdgeData>[] = [];
  const seen = new Set<string>();

  for (const m of doc.modules) {
    for (const ep of m.endpoints) {
      for (const ref of ep.refs) {
        if (!byName.has(ref)) continue;
        // Always orient producer-side → consumer-side
        const fromModule = ep.kind === "producer" ? m.moduleName : ref;
        const toModule = ep.kind === "producer" ? ref : m.moduleName;
        const key = `${fromModule}->${toModule}:${ep.resource}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({
          id: key,
          source: fromModule,
          target: toModule,
          data: { resource: ep.resource, fromModule, toModule },
          style: {
            stroke: RESOURCE_COLOR[ep.resource],
            strokeWidth: 1.6,
          },
          animated: false,
        });
      }
    }
  }

  return layoutDagre(nodes, edges);
}

export function layoutDagre<
  N extends Node<SchematicNodeData>,
  E extends Edge<SchematicEdgeData>,
>(nodes: N[], edges: E[]): { nodes: N[]; edges: E[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 64, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const NODE_W = 168;
  const NODE_H = 64;

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const p = g.node(n.id);
    return {
      ...n,
      position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
    };
  });
  return { nodes: laidOut, edges };
}
