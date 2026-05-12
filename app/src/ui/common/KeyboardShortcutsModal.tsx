import { useEffect } from "react";
import { VIEW_SEQUENCE } from "./views";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const rows: [string, string][] = [
    ["⌘ / Ctrl + Z", "Undo"],
    ["⌘ / Ctrl + Shift + Z", "Redo"],
    ["Ctrl + Y (Windows)", "Redo"],
    ["⌘ / Ctrl + S", "Save .biosim"],
    ["⌘ / Ctrl + O", "Open .biosim file…"],
    ["Alt + 1 … Alt + 5", "Switch view (order below)"],
    ["Escape", "Clear module selection"],
    ["?", "Show this help"],
  ];

  return (
    <div
      className="kbd-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-modal-title"
      onClick={onClose}
    >
      <div className="kbd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kbd-modal-head">
          <h2 id="kbd-modal-title">Keyboard shortcuts</h2>
          <button type="button" className="kbd-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="kbd-modal-lead">
          When focus is <strong>not</strong> in a text field, these shortcuts apply. In inputs and
          the XML editor, ⌘/Ctrl+Z applies the field's own undo stack.
        </p>
        <table className="kbd-table">
          <tbody>
            {rows.map(([keys, desc]) => (
              <tr key={keys}>
                <td>
                  <kbd className="kbd-keys">{keys}</kbd>
                </td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="kbd-modal-section">
          <div className="kbd-modal-section-title">View order (Alt + number)</div>
          <ol className="kbd-view-order">
            {VIEW_SEQUENCE.map((v, i) => (
              <li key={v.id}>
                <kbd className="kbd-keys">Alt + {i + 1}</kbd> {v.label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
