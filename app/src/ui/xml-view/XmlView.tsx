import { useMemo, useState } from "react";
import { useCanvasStore } from "../../state/store";
import { emitBiosim } from "../../io/emitBiosim";
import { parseBiosim } from "../../io/parseBiosim";

/**
 * Read / edit the current document as XML. Read-only by default; the
 * "Edit" toggle enables a textarea and commit-on-Apply re-parses the
 * text back into the canonical model.
 *
 * For v0.x we use a plain <textarea> with monospace styling rather
 * than bringing in Monaco; the polish can come later (Phase 10).
 */
export function XmlView() {
  const doc = useCanvasStore((s) => s.doc);
  const replaceDoc = useCanvasStore((s) => s.replaceDoc);
  const setToast = useCanvasStore((s) => s.setToast);

  const [editing, setEditing] = useState(false);
  const [buf, setBuf] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);

  const xml = useMemo(() => (doc ? emitBiosim(doc) : ""), [doc]);

  if (!doc) {
    return <div className="empty xml-empty">No file loaded.</div>;
  }

  const enterEdit = () => {
    setBuf(xml);
    setParseError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setBuf("");
    setParseError(null);
    setEditing(false);
  };

  const applyEdit = () => {
    try {
      const next = parseBiosim(buf, doc.sourceName);
      replaceDoc(next);
      setEditing(false);
      setBuf("");
      setParseError(null);
      setToast(null);
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  return (
    <div className="xml-view">
      <div className="xml-toolbar">
        <span className="xml-label">XML expert view</span>
        <span className="spacer" />
        {!editing ? (
          <>
            <button type="button" onClick={() => copyToClipboard(xml, setToast)}>
              Copy
            </button>
            <button type="button" onClick={enterEdit}>
              Edit
            </button>
          </>
        ) : (
          <>
            {parseError && <span className="xml-error">{parseError}</span>}
            <button type="button" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={applyEdit}>
              Apply
            </button>
          </>
        )}
      </div>
      {editing ? (
        <textarea
          className="xml-text"
          spellCheck={false}
          value={buf}
          onChange={(e) => {
            setBuf(e.target.value);
            setParseError(null);
          }}
        />
      ) : (
        <pre className="xml-text readonly">{xml}</pre>
      )}
    </div>
  );
}

function copyToClipboard(text: string, setToast: (s: string | null) => void) {
  navigator.clipboard
    .writeText(text)
    .then(() => setToast("XML copied to clipboard"))
    .catch(() => setToast("Failed to copy"));
}
