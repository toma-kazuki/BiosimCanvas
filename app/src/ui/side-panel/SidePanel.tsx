import { useMemo, useState } from "react";
import { useCanvasStore } from "../../state/store";
import {
  MODULE_KINDS,
  RESOURCE_LABEL,
  SUBSYSTEM_LABEL,
} from "../../domain/registry";
import { createEmptyEndpoint } from "../../domain/factories";
import type {
  FlowEndpoint,
  MalfunctionSpec,
  ModuleNode,
  ResourceKind,
  SensorSpec,
} from "../../domain/types";
import {
  attrUnit,
  flowRateUnit,
  globalUnit,
  ticksToWallClock,
} from "../../domain/units";
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
          unit={globalUnit("tickLength")}
          value={g.tickLength}
          onChange={(v) => patchGlobals({ tickLength: v })}
        />
        <TextRow
          label="runTillN"
          unit={globalUnit("runTillN")}
          value={g.runTillN === undefined ? "" : String(g.runTillN)}
          onChange={(v) => patchGlobals({ runTillN: v === "" ? undefined : v })}
          placeholder="integer or template literal"
        />
        <NumberRow
          label="driverStutter"
          unit={globalUnit("driverStutterLength")}
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
  const deleteModule = useCanvasStore((s) => s.deleteModule);

  const handleDelete = () => {
    const ok = window.confirm(
      `Delete module "${module.moduleName}"?\nReferences from other modules and sensors will also be cleared.`,
    );
    if (ok) deleteModule(module.moduleName);
  };

  return (
    <>
      <div className="module-head">
        <div>
          <h2>{module.moduleName}</h2>
          <div className="kind">
            {meta?.label ?? module.kind} · {SUBSYSTEM_LABEL[module.subsystem]}
          </div>
        </div>
        <button
          type="button"
          className="danger"
          onClick={handleDelete}
          title="Delete this module"
        >
          Delete
        </button>
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
              unit={attrUnit(module.kind, k)}
              value={v}
              onChange={(next) =>
                patchModuleAttr(module.moduleName, k, next === "" ? undefined : next)
              }
            />
          ))}
        </div>
      )}

      <EndpointsSection moduleName={module.moduleName} endpoints={module.endpoints} />

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
  const doc = useCanvasStore((s) => s.doc)!;
  const patchEndpoint = useCanvasStore((s) => s.patchEndpoint);
  const removeEndpoint = useCanvasStore((s) => s.removeEndpoint);
  const addEndpoint = useCanvasStore((s) => s.addEndpoint);
  const [adding, setAdding] = useState(false);

  const availableNames = useMemo(
    () => doc.modules.map((m) => m.moduleName),
    [doc.modules],
  );

  return (
    <div className="section">
      <div className="section-head">
        <h3>Flows</h3>
        <button type="button" onClick={() => setAdding((s) => !s)}>
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <AddEndpointForm
          onSubmit={(kind, resource) => {
            addEndpoint(moduleName, createEmptyEndpoint(kind, resource));
            setAdding(false);
          }}
        />
      )}

      {endpoints.length === 0 && !adding && (
        <div className="empty" style={{ fontSize: 11 }}>
          No flows. Add one to wire this module into the habitat.
        </div>
      )}

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
              <button
                type="button"
                className="ep-remove"
                title="Remove this flow"
                onClick={() => removeEndpoint(moduleName, i)}
              >
                ×
              </button>
            </div>
            <RefsRow
              label={ep.kind === "producer" ? "outputs" : "inputs"}
              value={ep.refs}
              available={availableNames}
              selfName={moduleName}
              onChange={(refs) => patchEndpoint(moduleName, i, { refs })}
            />
            <NumberArrayRow
              label="desired"
              unit={flowRateUnit(ep.resource)}
              value={ep.desiredFlowRates}
              onChange={(v) =>
                patchEndpoint(moduleName, i, { desiredFlowRates: v })
              }
            />
            <NumberArrayRow
              label="max"
              unit={flowRateUnit(ep.resource)}
              value={ep.maxFlowRates}
              onChange={(v) => patchEndpoint(moduleName, i, { maxFlowRates: v })}
            />
          </div>
        );
      })}
    </div>
  );
}

const RESOURCE_OPTIONS = Object.keys(RESOURCE_LABEL) as ResourceKind[];

function AddEndpointForm({
  onSubmit,
}: {
  onSubmit: (kind: "producer" | "consumer", resource: ResourceKind) => void;
}) {
  const [kind, setKind] = useState<"producer" | "consumer">("producer");
  const [resource, setResource] = useState<ResourceKind>("air");
  return (
    <div className="endpoint endpoint-add">
      <Row label="direction">
        <select
          className="field"
          value={kind}
          onChange={(e) => setKind(e.target.value as "producer" | "consumer")}
        >
          <option value="producer">producer (→ outputs)</option>
          <option value="consumer">consumer (← inputs)</option>
        </select>
      </Row>
      <Row label="resource">
        <select
          className="field"
          value={resource}
          onChange={(e) => setResource(e.target.value as ResourceKind)}
        >
          {RESOURCE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {RESOURCE_LABEL[r]}
            </option>
          ))}
        </select>
      </Row>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onSubmit(kind, resource)}>
          Create
        </button>
      </div>
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
        unit="tick"
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
  const doc = useCanvasStore((s) => s.doc)!;
  const patchCrewPerson = useCanvasStore((s) => s.patchCrewPerson);
  const patchCrewActivity = useCanvasStore((s) => s.patchCrewActivity);

  const tickHours = doc.globals.tickLength;

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
            unit="yr"
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
            unit="kg"
            value={c.weight}
            onChange={(v) => patchCrewPerson(groupName, i, { weight: v ?? 0 })}
          />
          {c.schedule.length > 0 && (
            <ScheduleTable
              groupName={groupName}
              personIndex={i}
              schedule={c.schedule}
              tickHours={tickHours}
              onPatch={(j, patch) => patchCrewActivity(groupName, i, j, patch)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Daily-schedule editor. Each row is one activity; columns are
 * (name, intensity level, duration in ticks). A header summarises the
 * total in ticks and — given `globals.tickLength` — the equivalent
 * wall-clock duration so the user can sanity-check against a 24-hour
 * day.
 *
 * Why `length` is in *ticks* and not hours:
 *   BioSim's `Activity.getTimeLength()` is consumed by `BaseCrewPerson`
 *   advancing one step per simulation tick, so `length` literally means
 *   "ticks of this activity". The XSD allows non-negative integers and
 *   BioSim's own `Schedule.toString()` formats it as "Nh", but that
 *   assumes the conventional 1-tick-per-hour setup. With this template
 *   (`tickLength=0.1`) a length of 12 is 1.2 wall-clock hours, not 12.
 */
function ScheduleTable({
  groupName,
  personIndex,
  schedule,
  tickHours,
  onPatch,
}: {
  groupName: string;
  personIndex: number;
  schedule: NonNullable<ModuleNode["crew"]>[number]["schedule"];
  tickHours: number | undefined;
  onPatch: (
    activityIndex: number,
    patch: { name?: string; intensity?: number; length?: number },
  ) => void;
}) {
  void groupName;
  void personIndex;
  const totalTicks = schedule.reduce((s, a) => s + (a.length || 0), 0);
  const wall = ticksToWallClock(totalTicks, tickHours);

  return (
    <div className="schedule">
      <div className="schedule-head">
        <span>schedule</span>
        <span className="schedule-sum">
          Σ {totalTicks} ticks{wall !== "—" ? ` ≈ ${wall}` : ""}
        </span>
      </div>
      <div className="schedule-table">
        <div className="schedule-th">activity</div>
        <div className="schedule-th" title="Metabolic effort level (BioSim uses 0–5; affects O₂, food and water demand).">
          intensity
        </div>
        <div className="schedule-th" title="Duration in simulation ticks. 1 tick = current Globals.tickLength hours.">
          length (ticks)
        </div>
        {schedule.map((a, j) => (
          <FragmentRow
            key={j}
            name={a.name}
            intensity={a.intensity}
            length={a.length}
            onChange={(patch) => onPatch(j, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  name,
  intensity,
  length,
  onChange,
}: {
  name: string;
  intensity: number;
  length: number;
  onChange: (patch: { name?: string; intensity?: number; length?: number }) => void;
}) {
  return (
    <>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="field"
      />
      <input
        type="number"
        value={intensity}
        onChange={(e) => onChange({ intensity: Number(e.target.value) })}
        className="field"
        min={0}
        step={1}
      />
      <input
        type="number"
        value={length}
        onChange={(e) => onChange({ length: Number(e.target.value) })}
        className="field"
        min={0}
        step={1}
      />
    </>
  );
}

// --- Sensors list (rendered on the document inspector) -------------------

function SensorListInspector({ sensors }: { sensors: SensorSpec[] }) {
  const doc = useCanvasStore((s) => s.doc)!;
  const patchSensor = useCanvasStore((s) => s.patchSensor);
  const availableNames = useMemo(
    () => doc.modules.map((m) => m.moduleName),
    [doc.modules],
  );
  return (
    <div className="section">
      <h3>Sensors</h3>
      {sensors.map((s) => (
        <div key={s.moduleName} className="endpoint">
          <div className="endpoint-head">
            <span className="endpoint-tag">{s.kind}</span>
            <span className="endpoint-resource">{s.moduleName}</span>
          </div>
          <RefsRow
            label="input"
            value={s.input ? [s.input] : []}
            available={availableNames}
            multi={false}
            onChange={(refs) => patchSensor(s.moduleName, { input: refs[0] ?? "" })}
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
