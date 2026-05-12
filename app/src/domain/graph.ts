import dagre from "dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { BiosimDocument, ModuleNode, ResourceKind, Subsystem } from "./types";
import { RESOURCE_COLOR, SUBSYSTEM_COLOR, SUBSYSTEM_LABEL, SUBSYSTEM_ORDER } from "./registry";

/**
 * Build the XYFlow node + edge arrays from the canonical document model.
 *
 * Layout strategy (v0.2):
 *   1. Group modules by subsystem (environment / air / water / …).
 *   2. For each subsystem, run dagre on its **intra-subsystem** edges so
 *      modules that feed each other end up adjacent.
 *   3. Add a translucent "subsystem container" node behind each group
 *      so meetings can see, at a glance, *which subsystem* a module
 *      belongs to.
 *   4. Shelf-pack the subsystem containers in a grid (wrap when row
 *      width exceeds MAX_ROW_W) so a typical habitat fits a 1080p
 *      screen at default zoom (F-VIEW-1 / O-3).
 *   5. Edges are emitted producer → consumer and carry an arrowhead.
 */

export interface SchematicNodeData extends Record<string, unknown> {
  module: ModuleNode;
  subsystem: Subsystem;
}

export interface SubsystemNodeData extends Record<string, unknown> {
  subsystem: Subsystem;
  label: string;
  width: number;
  height: number;
}

export interface SchematicEdgeData extends Record<string, unknown> {
  resource: ResourceKind;
  fromModule: string;
  toModule: string;
}

// --- layout constants ----------------------------------------------------

const NODE_W = 168;
const NODE_H = 64;
const SUB_PADDING = 16;
const SUB_HEADER_H = 28;
const SUB_GAP = 36;
const MAX_ROW_W = 1700;

const INTRA_NODESEP = 24;
const INTRA_RANKSEP = 56;

// --- public API ----------------------------------------------------------

export function buildSchematic(doc: BiosimDocument): {
  nodes: Node[];
  edges: Edge<SchematicEdgeData>[];
} {
  const byName = new Map<string, ModuleNode>();
  const bySub = new Map<Subsystem, ModuleNode[]>();
  for (const m of doc.modules) {
    byName.set(m.moduleName, m);
    if (!bySub.has(m.subsystem)) bySub.set(m.subsystem, []);
    bySub.get(m.subsystem)!.push(m);
  }

  const edges = computeEdges(doc.modules, byName);

  // Per-subsystem local layouts
  const layouts = new Map<
    Subsystem,
    { positions: Map<string, { x: number; y: number }>; w: number; h: number }
  >();
  for (const sub of SUBSYSTEM_ORDER) {
    const modules = bySub.get(sub);
    if (!modules?.length) continue;
    const inSub = new Set(modules.map((m) => m.moduleName));
    const intraEdges = edges.filter((e) => inSub.has(e.source) && inSub.has(e.target));
    layouts.set(sub, layoutSubsystem(modules, intraEdges));
  }

  // Pack subsystems into a 2D grid
  const subPositions = shelfPack(layouts);

  // Compose final nodes
  const nodes: Node[] = [];

  for (const [sub, layout] of layouts) {
    const origin = subPositions.get(sub)!;
    nodes.push({
      id: `__sub__${sub}`,
      type: "subsystem",
      position: origin,
      data: {
        subsystem: sub,
        label: SUBSYSTEM_LABEL[sub],
        width: layout.w,
        height: layout.h,
      } satisfies SubsystemNodeData,
      style: {
        width: layout.w,
        height: layout.h,
        zIndex: 0,
        pointerEvents: "none",
      },
      draggable: false,
      selectable: false,
      zIndex: 0,
    });

    for (const m of bySub.get(sub)!) {
      const local = layout.positions.get(m.moduleName)!;
      nodes.push({
        id: m.moduleName,
        type: "module",
        position: { x: origin.x + local.x, y: origin.y + local.y },
        data: { module: m, subsystem: sub } satisfies SchematicNodeData,
        style: { borderColor: SUBSYSTEM_COLOR[sub], zIndex: 10 },
        zIndex: 10,
      });
    }
  }

  return { nodes, edges };
}

// --- edges ---------------------------------------------------------------

function computeEdges(
  modules: ModuleNode[],
  byName: Map<string, ModuleNode>,
): Edge<SchematicEdgeData>[] {
  const edges: Edge<SchematicEdgeData>[] = [];
  const seen = new Set<string>();

  for (const m of modules) {
    for (const ep of m.endpoints) {
      for (const ref of ep.refs) {
        if (!byName.has(ref)) continue;
        const fromModule = ep.kind === "producer" ? m.moduleName : ref;
        const toModule = ep.kind === "producer" ? ref : m.moduleName;
        const key = `${fromModule}->${toModule}:${ep.resource}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const color = RESOURCE_COLOR[ep.resource];
        edges.push({
          id: key,
          source: fromModule,
          target: toModule,
          data: { resource: ep.resource, fromModule, toModule },
          style: { stroke: color, strokeWidth: 1.6 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color,
          },
          type: "default",
          zIndex: 5,
        });
      }
    }
  }

  return edges;
}

// --- per-subsystem layout (dagre on intra-subsystem edges) ---------------

function layoutSubsystem(
  modules: ModuleNode[],
  intraEdges: Edge<SchematicEdgeData>[],
): {
  positions: Map<string, { x: number; y: number }>;
  w: number;
  h: number;
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    nodesep: INTRA_NODESEP,
    ranksep: INTRA_RANKSEP,
    marginx: 0,
    marginy: 0,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const m of modules) g.setNode(m.moduleName, { width: NODE_W, height: NODE_H });
  for (const e of intraEdges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const m of modules) {
    const p = g.node(m.moduleName);
    const x = p.x - NODE_W / 2;
    const y = p.y - NODE_H / 2;
    positions.set(m.moduleName, { x, y });
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + NODE_W > maxX) maxX = x + NODE_W;
    if (y + NODE_H > maxY) maxY = y + NODE_H;
  }

  // Translate so that local (0, 0) is the top-left of the inner area.
  // Container header lives in the top SUB_HEADER_H pixels.
  const dx = SUB_PADDING - minX;
  const dy = SUB_PADDING + SUB_HEADER_H - minY;
  for (const [id, p] of positions) {
    positions.set(id, { x: p.x + dx, y: p.y + dy });
  }

  const w = Math.max(NODE_W + 2 * SUB_PADDING, maxX - minX + 2 * SUB_PADDING);
  const h = maxY - minY + 2 * SUB_PADDING + SUB_HEADER_H;

  return { positions, w, h };
}

// --- shelf-packing of subsystem boxes ------------------------------------

function shelfPack(
  layouts: Map<Subsystem, { w: number; h: number }>,
): Map<Subsystem, { x: number; y: number }> {
  const positions = new Map<Subsystem, { x: number; y: number }>();
  let cursorX = 0;
  let cursorY = 0;
  let rowH = 0;

  for (const sub of SUBSYSTEM_ORDER) {
    const layout = layouts.get(sub);
    if (!layout) continue;

    if (cursorX > 0 && cursorX + layout.w > MAX_ROW_W) {
      cursorX = 0;
      cursorY += rowH + SUB_GAP;
      rowH = 0;
    }
    positions.set(sub, { x: cursorX, y: cursorY });
    cursorX += layout.w + SUB_GAP;
    if (layout.h > rowH) rowH = layout.h;
  }

  return positions;
}
