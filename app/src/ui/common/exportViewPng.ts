import { toPng } from "html-to-image";
import type { CanvasView } from "../../state/store";

const BG = "#0f1115";

/**
 * Capture the active React Flow surface inside `.canvas` (schematic or spatial).
 */
export async function exportCanvasViewPng(opts: {
  view: CanvasView;
  baseName: string;
}): Promise<void> {
  const { view, baseName } = opts;
  if (view !== "schematic" && view !== "spatial") {
    throw new Error("PNG export works in Schematic or Spatial view only.");
  }
  const el = document.querySelector(".canvas .react-flow") as HTMLElement | null;
  if (!el) {
    throw new Error("No canvas found to capture.");
  }
  const safeBase = baseName.replace(/[/\\?*:|"<>]/g, "_").replace(/\.biosim$/i, "") || "biosim";
  const dataUrl = await toPng(el, {
    backgroundColor: BG,
    pixelRatio: 2,
    cacheBust: true,
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${safeBase}-${view}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
