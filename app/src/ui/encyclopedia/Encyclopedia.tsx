import { useState, useMemo } from "react";
import {
  MODULE_KNOWLEDGE,
  type ModuleKnowledgeEntry,
} from "../../domain/moduleKnowledge";
import {
  SUBSYSTEM_ORDER,
  SUBSYSTEM_LABEL,
  SUBSYSTEM_COLOR,
  MODULE_KINDS,
} from "../../domain/registry";

/**
 * Module Encyclopedia panel — right-panel "Encyclopedia" tab.
 * Implements F-KNOW-2: browsable reference for all v1 module types.
 */
export function Encyclopedia() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filteredBySubsystem = useMemo(() => {
    const q = query.toLowerCase();
    const result: Array<{ sub: string; kinds: string[] }> = [];
    for (const sub of SUBSYSTEM_ORDER) {
      const kinds = Object.entries(MODULE_KINDS)
        .filter(([, meta]) => meta.subsystem === sub)
        .map(([kind]) => kind)
        .filter((kind) => {
          if (!q) return true;
          const entry = MODULE_KNOWLEDGE[kind];
          return (
            kind.toLowerCase().includes(q) ||
            SUBSYSTEM_LABEL[sub].toLowerCase().includes(q) ||
            entry?.summary.toLowerCase().includes(q)
          );
        });
      if (kinds.length) result.push({ sub, kinds });
    }
    return result;
  }, [query]);

  const entry = selected ? MODULE_KNOWLEDGE[selected] : null;

  return (
    <div className="encyclopedia">
      {entry && selected ? (
        <EncyclopediaEntry
          entry={entry}
          moduleType={selected}
          onBack={() => setSelected(null)}
        />
      ) : (
        <>
          <div className="enc-search-row">
            <input
              className="enc-search"
              type="search"
              placeholder="Search modules…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="enc-list">
            {filteredBySubsystem.map(({ sub, kinds }) => (
              <div key={sub} className="enc-group">
                <div
                  className="enc-sub-label"
                  style={{ color: SUBSYSTEM_COLOR[sub as keyof typeof SUBSYSTEM_COLOR] }}
                >
                  {SUBSYSTEM_LABEL[sub as keyof typeof SUBSYSTEM_LABEL]}
                </div>
                {kinds.map((kind) => {
                  const e = MODULE_KNOWLEDGE[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      className="enc-item"
                      onClick={() => setSelected(kind)}
                    >
                      <span className="enc-item-name">{kind}</span>
                      {e && (
                        <span className="enc-item-summary">{e.summary}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {filteredBySubsystem.length === 0 && (
              <div className="enc-empty">No modules match "{query}"</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface EntryProps {
  moduleType: string;
  entry: ModuleKnowledgeEntry;
  onBack: () => void;
}

function EncyclopediaEntry({ moduleType, entry, onBack }: EntryProps) {
  const meta = MODULE_KINDS[moduleType];
  const sub = meta?.subsystem;
  const consumers = entry.ports.filter((p) => p.direction === "consumer");
  const producers = entry.ports.filter((p) => p.direction === "producer");

  return (
    <div className="enc-entry">
      <button type="button" className="enc-back" onClick={onBack}>
        ← All modules
      </button>

      <div className="enc-entry-header">
        <span className="enc-entry-name">{moduleType}</span>
        {sub && (
          <span
            className="enc-entry-badge"
            style={{ background: SUBSYSTEM_COLOR[sub] + "33", color: SUBSYSTEM_COLOR[sub] }}
          >
            {SUBSYSTEM_LABEL[sub]}
          </span>
        )}
      </div>

      <p className="enc-entry-summary">{entry.summary}</p>

      {/* Class hierarchy */}
      <div className="enc-section-title">Class hierarchy</div>
      <div className="enc-hierarchy">
        {entry.classHierarchy.map((cls, i) => (
          <span key={cls}>
            {i > 0 && <span className="enc-hier-sep"> › </span>}
            <span className={cls === moduleType ? "enc-hier-self" : "enc-hier-ancestor"}>
              {cls}
            </span>
          </span>
        ))}
      </div>
      <p className="enc-hierarchy-note">
        Module types are fixed Java classes — custom module creation requires modifying the BioSim source code.
      </p>

      {/* Ports */}
      {entry.ports.length > 0 && (
        <>
          <div className="enc-section-title">Resource ports</div>
          <table className="enc-table">
            <thead>
              <tr>
                <th>Port tag</th>
                <th>Resource</th>
                <th>Direction</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {consumers.map((p) => (
                <tr key={p.tag}>
                  <td className="enc-mono">{p.tag}</td>
                  <td>{p.resource}</td>
                  <td className="enc-consumer">consumer</td>
                  <td>{p.description}</td>
                </tr>
              ))}
              {producers.map((p) => (
                <tr key={p.tag}>
                  <td className="enc-mono">{p.tag}</td>
                  <td>{p.resource}</td>
                  <td className="enc-producer">producer</td>
                  <td>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Attributes */}
      {entry.attributes.length > 0 && (
        <>
          <div className="enc-section-title">Configurable attributes</div>
          <table className="enc-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Type / unit</th>
                <th>Description</th>
                <th>Via XML?</th>
              </tr>
            </thead>
            <tbody>
              {entry.attributes.map((a) => (
                <tr key={a.name}>
                  <td className="enc-mono">{a.name}</td>
                  <td>{a.unit ? `${a.type} (${a.unit})` : a.type}</td>
                  <td>{a.description}</td>
                  <td className={a.configurableViaXml ? "enc-yes" : "enc-no"}>
                    {a.configurableViaXml ? "Yes" : "No — simulator-internal"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Malfunction behavior */}
      <div className="enc-section-title">Malfunction behavior</div>
      <table className="enc-table">
        <thead>
          <tr>
            <th>Intensity</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="enc-malf-low">LOW_MALF</td>
            <td>{entry.malfunctionBehavior.low}</td>
          </tr>
          <tr>
            <td className="enc-malf-med">MEDIUM_MALF</td>
            <td>{entry.malfunctionBehavior.medium}</td>
          </tr>
          <tr>
            <td className="enc-malf-sev">SEVERE_MALF</td>
            <td>{entry.malfunctionBehavior.severe}</td>
          </tr>
        </tbody>
      </table>
      <table className="enc-table" style={{ marginTop: 4 }}>
        <thead>
          <tr>
            <th>Duration</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>TEMPORARY_MALF</td>
            <td>{entry.malfunctionBehavior.temporary}</td>
          </tr>
          <tr>
            <td>PERMANENT_MALF</td>
            <td>{entry.malfunctionBehavior.permanent}</td>
          </tr>
        </tbody>
      </table>

      {/* Hidden physics */}
      {entry.hiddenPhysicsNote && (
        <>
          <div className="enc-section-title">Hidden physics</div>
          <div className="enc-physics-note">
            {entry.hiddenPhysicsNote.split("\n").map((line, i) => (
              <p key={i} style={{ margin: "2px 0" }}>{line}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
