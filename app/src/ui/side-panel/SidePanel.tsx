import { useMemo } from "react";
import { useCanvasStore } from "../../state/store";
import {
  MODULE_KINDS,
  RESOURCE_LABEL,
  SUBSYSTEM_LABEL,
} from "../../domain/registry";
import type {
  FlowEndpoint,
  MalfunctionSpec,
  ModuleNode,
  SensorSpec,
} from "../../domain/types";
import {
  NumberArrayRow,
  NumberRow,
  RefsRow,
  RenameRow,
  Row,
  SelectRow,
  TextRow,
} from "./fields";

const MALF_INTENSITY = ["LOW_MALF", "MEDIUM_MALF", "SEVERE_MALF"] as const;
const MALF_LENGTH = ["TEMPORARY_MALF", "PERMANENT_MALF"] as const;
const CREW_SEX = ["MALE", "FEMALE"] as const;

export function SidePanel() {
  const doc = useCanvasStore((s) => s.doc);
  const selectedName = useCanvasStore((s) => s.selectedModuleName);
  const toast = useCanvasStore((s) => s.toast);

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

  return (
    <aside className="side">
      {toast && <div className="toast">{toast}</div>}
      {module ? <ModuleInspector module={module} /> : <DocumentInspector />}
    </aside>
  );
}

// --- Document-level inspector (when nothing is selected) -----------------

function DocumentInspector() {
  const doc = useCanvasStore((s) => s.doc)!;
  const patchGlobals = useCanvasStore((s) => s.patchGlobals);
  const g = doc.globals;

  return (
    <>
      <h2>Document</h2>
      <div className="kind">
        Select a module on the canvas to inspect / edit it.
      </div>

      <div className="section">
        <h3>Stats</h3>
        <Row label="Source">
          <span className="v">{doc.sourceName ?? "(unsaved)"}</span>
        </Row>
        <Row label="Modules">
          <span className="v">{doc.modules.length}</span>
        </Row>
        <Row label="Sensors">
          <span className="v">{doc.sensors.length}</span>
        </Row>
      </div>

      <div className="section">
        <h3>Globals</h3>
        <NumberRow
          label="tickLength"
          value={g.tickLength}
          onChange={(v) => patchGlobals({ tickLength: v })}
        />
        <TextRow
          label="runTillN"
          value={g.runTillN === undefined ? "" : String(g.runTillN)}
          onChange={(v) => patchGlobals({ runTillN: v === "" ? undefined : v })}
          placeholder="integer or template literal"
        />
        <NumberRow
          label="driverStutter"
          value={g.driverStutterLength}
          onChange={(v) => patchGlobals({ driverStutterLength: v })}
        />
        <TextRow
          label="crewsToWatch"
          value={g.crewsToWatch ?? ""}
          onChange={(v) =>
            patchGlobals({ crewsToWatch: v === "" ? undefined : v })
          }
        />
      </div>

      {doc.sensors.length > 0 && <SensorListInspector sensors={doc.sensors} />}
    </>
  );
}

// --- Module inspector ----------------------------------------------------

function ModuleInspector({ module }: { module: ModuleNode }) {
  const meta = MODULE_KINDS[module.kind];

  const renameModule = useCanvasStore((s) => s.renameModule);
  const patchModuleAttr = useCanvasStore((s) => s.patchModuleAttr);

  return (
    <>
      <h2>{module.moduleName}</h2>
      <div className="kind">
        {meta?.label ?? module.kind} · {SUBSYSTEM_LABEL[module.subsystem]}
      </div>

      <div className="section">
        <h3>Identity</h3>
        <RenameRow
          label="moduleName"
          value={module.moduleName}
          onCommit={(v) => renameModule(module.moduleName, v)}
        />
        <Row label="kind">
          <span className="v">{module.kind}</span>
        </Row>
      </div>

      {Object.keys(module.attrs).length > 0 && (
        <div className="section">
          <h3>Attributes</h3>
          {Object.entries(module.attrs).map(([k, v]) => (
            <TextRow
              key={k}
              label={k}
              value={v}
              onChange={(next) =>
                patchModuleAttr(module.moduleName, k, next === "" ? undefined : next)
              }
            />
          ))}
        </div>
      )}

      {module.endpoints.length > 0 && (
        <EndpointsSection moduleName={module.moduleName} endpoints={module.endpoints} />
      )}

      <MalfunctionSection module={module} />

      {module.crew && module.crew.length > 0 && (
        <CrewSection groupName={module.moduleName} crew={module.crew} />
      )}
    </>
  );
}

// --- Endpoints -----------------------------------------------------------

function EndpointsSection({
  moduleName,
  endpoints,
}: {
  moduleName: string;
  endpoints: FlowEndpoint[];
}) {
  const patchEndpoint = useCanvasStore((s) => s.patchEndpoint);

  return (
    <div className="section">
      <h3>Flows</h3>
      {endpoints.map((ep, i) => {
        const arrow = ep.kind === "producer" ? "→" : "←";
        return (
          <div key={i} className="endpoint">
            <div className="endpoint-head">
              <span className="endpoint-tag" style={{ borderColor: "var(--border)" }}>
                {ep.kind}
              </span>
              <span className="endpoint-resource">
                {RESOURCE_LABEL[ep.resource]} {arrow}
              </span>
            </div>
            <RefsRow
              label="refs"
              value={ep.refs}
              onChange={(refs) => patchEndpoint(moduleName, i, { refs })}
            />
            <NumberArrayRow
              label="desired"
              value={ep.desiredFlowRates}
              onChange={(v) =>
                patchEndpoint(moduleName, i, { desiredFlowRates: v })
              }
            />
            <NumberArrayRow
              label="max"
              value={ep.maxFlowRates}
              onChange={(v) => patchEndpoint(moduleName, i, { maxFlowRates: v })}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- Malfunction ---------------------------------------------------------

function MalfunctionSection({ module }: { module: ModuleNode }) {
  const setMalfunction = useCanvasStore((s) => s.setMalfunction);

  if (!module.malfunction) {
    return (
      <div className="section">
        <div className="section-head">
          <h3>Malfunction</h3>
          <button
            type="button"
            onClick={() =>
              setMalfunction(module.moduleName, {
                intensity: "MEDIUM_MALF",
                length: "TEMPORARY_MALF",
                occursAtTick: 0,
              })
            }
          >
            + Add
          </button>
        </div>
        <div className="empty" style={{ fontSize: 11 }}>
          No config-time malfunction scheduled. Max 1 per module.
        </div>
      </div>
    );
  }

  const malf: MalfunctionSpec = module.malfunction;
  const update = (patch: Partial<MalfunctionSpec>) =>
    setMalfunction(module.moduleName, { ...malf, ...patch });

  return (
    <div className="section">
      <div className="section-head">
        <h3>Malfunction</h3>
        <button type="button" onClick={() => setMalfunction(module.moduleName, undefined)}>
          Remove
        </button>
      </div>
      <SelectRow
        label="intensity"
        value={malf.intensity}
        options={MALF_INTENSITY}
        onChange={(v) => update({ intensity: v })}
      />
      <SelectRow
        label="length"
        value={malf.length}
        options={MALF_LENGTH}
        onChange={(v) => update({ length: v })}
      />
      <NumberRow
        label="occursAtTick"
        value={malf.occursAtTick}
        onChange={(v) => update({ occursAtTick: v ?? 0 })}
        step={1}
      />
    </div>
  );
}

// --- Crew ----------------------------------------------------------------

function CrewSection({
  groupName,
  crew,
}: {
  groupName: string;
  crew: NonNullable<ModuleNode["crew"]>;
}) {
  const patchCrewPerson = useCanvasStore((s) => s.patchCrewPerson);
  const patchCrewActivity = useCanvasStore((s) => s.patchCrewActivity);

  return (
    <div className="section">
      <h3>Crew ({crew.length})</h3>
      {crew.map((c, i) => (
        <div key={i} className="crew-card">
          <TextRow
            label="name"
            value={c.name}
            onChange={(v) => patchCrewPerson(groupName, i, { name: v })}
          />
          <NumberRow
            label="age"
            value={c.age}
            onChange={(v) => patchCrewPerson(groupName, i, { age: v ?? 0 })}
            step={1}
          />
          <SelectRow
            label="sex"
            value={c.sex}
            options={CREW_SEX}
            onChange={(v) => patchCrewPerson(groupName, i, { sex: v })}
          />
          <NumberRow
            label="weight"
            value={c.weight}
            onChange={(v) => patchCrewPerson(groupName, i, { weight: v ?? 0 })}
          />
          {c.schedule.length > 0 && (
            <div className="schedule">
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginTop: 6,
                  marginBottom: 2,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                schedule (sum {c.schedule.reduce((s, a) => s + (a.length || 0), 0)}h)
              </div>
              {c.schedule.map((a, j) => (
                <div key={j} className="activity-row">
                  <input
                    type="text"
                    value={a.name}
                    onChange={(e) =>
                      patchCrewActivity(groupName, i, j, { name: e.target.value })
                    }
                    className="field"
                    style={{ width: 90 }}
                  />
                  <input
                    type="number"
                    value={a.intensity}
                    onChange={(e) =>
                      patchCrewActivity(groupName, i, j, {
                        intensity: Number(e.target.value),
                      })
                    }
                    className="field"
                    style={{ width: 48 }}
                    title="intensity"
                  />
                  <input
                    type="number"
                    value={a.length}
                    onChange={(e) =>
                      patchCrewActivity(groupName, i, j, {
                        length: Number(e.target.value),
                      })
                    }
                    className="field"
                    style={{ width: 48 }}
                    title="length (hours)"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Sensors list (rendered on the document inspector) -------------------

function SensorListInspector({ sensors }: { sensors: SensorSpec[] }) {
  const patchSensor = useCanvasStore((s) => s.patchSensor);
  return (
    <div className="section">
      <h3>Sensors</h3>
      {sensors.map((s) => (
        <div key={s.moduleName} className="endpoint">
          <div className="endpoint-head">
            <span className="endpoint-tag">{s.kind}</span>
            <span className="endpoint-resource">{s.moduleName}</span>
          </div>
          <TextRow
            label="input"
            value={s.input}
            onChange={(v) => patchSensor(s.moduleName, { input: v })}
          />
          {s.gasType !== undefined && (
            <TextRow
              label="gasType"
              value={s.gasType}
              onChange={(v) => patchSensor(s.moduleName, { gasType: v })}
            />
          )}
          {s.alarms.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              alarms:{" "}
              {s.alarms
                .map((b) => `${b.kind}[${b.min}-${b.max}]`)
                .join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
