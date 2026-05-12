import type { CanvasView } from "../../state/store";

/** Tab order — keep in sync with ViewSwitcher labels. */
export const VIEW_SEQUENCE: { id: CanvasView; label: string }[] = [
  { id: "schematic", label: "Schematic" },
  { id: "spatial", label: "Spatial" },
  { id: "timeline", label: "Timeline" },
  { id: "review", label: "Review" },
  { id: "xml", label: "XML" },
];

export function viewFromDigit(d: string): CanvasView | undefined {
  const n = Number(d);
  if (n < 1 || n > VIEW_SEQUENCE.length) return undefined;
  return VIEW_SEQUENCE[n - 1]!.id;
}
