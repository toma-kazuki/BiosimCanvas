import { useMemo } from "react";
import { useCanvasStore } from "../../state/store";
import { MODULE_KINDS, RESOURCE_LABEL, SUBSYSTEM_LABEL } from "../../domain/registry";
import type { FlowEndpoint, ModuleNode } from "../../domain/types";

export function SidePanel() {
  const doc = useCanvasStore((s) => s.doc);
  const selectedName = useCanvasStore((s) => s.selectedModuleName);

  const module = useMemo(() => {
    if (!doc || !selectedName) return null;
    return doc.modules.find((m) => m.moduleName === selectedName) ?? null;
  }, [doc, selectedName]);

  if (!doc) {
    return (
      <aside className="side">
        <div className="empty">No file loaded.</div>
      </aside>
    );
  }

  if (!module) {
    return (
      <aside className="side">
        <h2>Inspector</h2>
        <div className="empty">
          Select a module on the canvas to inspect its properties.
        </div>
        <div className="section">
          <h3>Document</h3>
          <Row label="Source">
            <span className="v">{doc.sourceName ?? "(unsaved)"}</span>
          </Row>
          <Row label="Modules">
            <span className="v">{doc.modules.length}</span>
          </Row>
          <Row label="Sensors">
            <span className="v">{doc.sensors.length}</span>
          </Row>
          {doc.globals.tickLength !== undefined && (
            <Row label="tickLength">
              <span className="v">{doc.globals.tickLength}</span>
            </Row>
          )}
          {doc.globals.runTillN !== undefined && (
            <Row label="runTillN">
              <span className="v">{String(doc.globals.runTillN)}</span>
            </Row>
          )}
        </div>
      </aside>
    );
  }

  const meta = MODULE_KINDS[module.kind];
  return (
    <aside className="side">
      <h2>{module.moduleName}</h2>
      <div className="kind">
        {(meta?.label ?? module.kind)} · {SUBSYSTEM_LABEL[module.subsystem]}
      </div>

      {Object.keys(module.attrs).length > 0 && (
        <div className="section">
          <h3>Attributes</h3>
          {Object.entries(module.attrs).map(([k, v]) => (
            <Row label={k} key={k}>
              <span className="v">{v}</span>
            </Row>
          ))}
        </div>
      )}

      {module.endpoints.length > 0 && (
        <div className="section">
          <h3>Flows</h3>
          {module.endpoints.map((ep, i) => (
            <EndpointView ep={ep} key={i} />
          ))}
        </div>
      )}

      {module.malfunction && (
        <div className="section">
          <h3>Malfunction</h3>
          <Row label="intensity">
            <span className="v">{module.malfunction.intensity}</span>
          </Row>
          <Row label="length">
            <span className="v">{module.malfunction.length}</span>
          </Row>
          <Row label="occursAtTick">
            <span className="v">{module.malfunction.occursAtTick}</span>
          </Row>
        </div>
      )}

      {module.crew && module.crew.length > 0 && (
        <div className="section">
          <h3>Crew ({module.crew.length})</h3>
          {module.crew.map((c, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <Row label={c.name}>
                <span className="v">
                  {c.sex.toLowerCase()} · {c.age}y · {c.weight}kg
                </span>
              </Row>
              {c.schedule.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                  {c.schedule.map((a) => `${a.name}:${a.length}h`).join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {renderModule(module)}
    </aside>
  );
}

function EndpointView({ ep }: { ep: FlowEndpoint }) {
  const arrow = ep.kind === "producer" ? "→" : "←";
  return (
    <Row label={`${RESOURCE_LABEL[ep.resource]} ${arrow}`}>
      <span className="v">
        {ep.refs.length ? ep.refs.join(", ") : "(unconnected)"}
        {ep.desiredFlowRates && (
          <span style={{ color: "var(--text-muted)" }}>
            {" "}
            · desired={ep.desiredFlowRates.join(",")}
          </span>
        )}
        {ep.maxFlowRates && (
          <span style={{ color: "var(--text-muted)" }}>
            {" "}
            · max={ep.maxFlowRates.join(",")}
          </span>
        )}
      </span>
    </Row>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <label>{label}</label>
      {children}
    </div>
  );
}

function renderModule(_m: ModuleNode): React.ReactNode {
  // Reserved for module-specific rich renderers (sensors, schedule editor, ...)
  return null;
}
