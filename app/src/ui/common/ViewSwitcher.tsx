import { useCanvasStore } from "../../state/store";
import { VIEW_SEQUENCE } from "./views";

interface Props {
  onExportPng: () => void;
  onShowHelp: () => void;
}

export function ViewSwitcher({ onExportPng, onShowHelp }: Props) {
  const view = useCanvasStore((s) => s.view);
  const setView = useCanvasStore((s) => s.setView);

  return (
    <div className="view-switcher" role="tablist" aria-label="Main views">
      {VIEW_SEQUENCE.map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={view === v.id}
          className={`view-tab${view === v.id ? " active" : ""}`}
          onClick={() => setView(v.id)}
        >
          {v.label}
        </button>
      ))}
      <span className="view-switcher-spacer" />
      <button
        type="button"
        className="view-tab view-tab-action"
        title="Download PNG of Schematic or Spatial canvas"
        onClick={onExportPng}
      >
        Screenshot PNG
      </button>
      <button
        type="button"
        className="view-tab view-tab-action"
        title="Keyboard shortcuts (?)"
        onClick={onShowHelp}
        aria-label="Keyboard shortcuts"
      >
        ?
      </button>
    </div>
  );
}
