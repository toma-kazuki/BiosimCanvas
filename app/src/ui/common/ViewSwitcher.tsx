import { useCanvasStore, type CanvasView } from "../../state/store";

const VIEWS: { id: CanvasView; label: string }[] = [
  { id: "schematic", label: "Schematic" },
  { id: "spatial", label: "Spatial" },
  { id: "timeline", label: "Timeline" },
  { id: "review", label: "Review" },
  { id: "xml", label: "XML" },
];

export function ViewSwitcher() {
  const view = useCanvasStore((s) => s.view);
  const setView = useCanvasStore((s) => s.setView);

  return (
    <div className="view-switcher">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          className={`view-tab${view === v.id ? " active" : ""}`}
          onClick={() => setView(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
