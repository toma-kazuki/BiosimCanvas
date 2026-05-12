// Timeline view — visualizes the *temporal* axis of a BioSim scenario:
// crew activity cycles per person, and per-module malfunctions placed
// at their `occursAtTick`. The schematic view answers "what's connected
// to what", and this view answers "what happens, and when".
//
// Conventions:
//  - The horizontal axis is in **ticks** (BioSim's native time unit). A
//    wall-clock line is also rendered when `globals.tickLength` is set.
//  - We do NOT use `runTillN` as the viewport extent: it is typically
//    the full simulation horizon (tens of thousands of ticks) and would
//    crush the crew schedules into invisibility. Instead we auto-fit
//    to whatever is interesting in the document — two longest crew
//    cycles plus a margin past the last malfunction.
//  - Crew cycles repeat; we tile each crew person's schedule across
//    the viewport so reviewers can see the rhythm visually.

import { useMemo } from "react";
import { useCanvasStore } from "../../state/store";
import { ticksToWallClock } from "../../domain/units";
import type { CrewPerson, MalfunctionSpec } from "../../domain/types";

interface CrewLane {
  groupName: string;
  person: CrewPerson;
  /** Total ticks of one full schedule cycle. */
  cycleTicks: number;
}

interface MalfMarker {
  moduleName: string;
  spec: MalfunctionSpec;
}

const INTENSITY_COLOR: Record<number, string> = {
  0: "#3a82d8", // rest / sleep — calm blue
  1: "#5dd2c9", // light — teal
  2: "#7fd1a3", // moderate — green
  3: "#f0c34a", // higher — amber
  4: "#e8965d", // hard — orange
  5: "#e3635a", // peak — red
};

const MALF_COLOR: Record<MalfunctionSpec["intensity"], string> = {
  LOW_MALF: "#f0c34a",
  MEDIUM_MALF: "#e8965d",
  SEVERE_MALF: "#e3635a",
};

export function Timeline() {
  const doc = useCanvasStore((s) => s.doc)!;
  const selectModule = useCanvasStore((s) => s.selectModule);

  const tickHours = doc.globals.tickLength;

  // Collect everything time-axis relevant.
  const { crewLanes, malfs, extentTicks, axisTicks } = useMemo(() => {
    const lanes: CrewLane[] = [];
    for (const mod of doc.modules) {
      if (!mod.crew || mod.crew.length === 0) continue;
      for (const person of mod.crew) {
        const cycle = person.schedule.reduce((s, a) => s + Math.max(0, a.length || 0), 0);
        if (cycle > 0) {
          lanes.push({ groupName: mod.moduleName, person, cycleTicks: cycle });
        }
      }
    }

    const malfList: MalfMarker[] = doc.modules
      .filter((m) => m.malfunction)
      .map((m) => ({ moduleName: m.moduleName, spec: m.malfunction as MalfunctionSpec }));

    const longestCycle = Math.max(0, ...lanes.map((l) => l.cycleTicks));
    const lastMalf = Math.max(0, ...malfList.map((m) => m.spec.occursAtTick));
    // Show 2 cycles so the rhythm is obvious, plus enough headroom
    // past the last malfunction; floor at 60 ticks so empty docs are
    // still readable.
    const extent = Math.max(60, longestCycle * 2, lastMalf + Math.max(10, longestCycle));

    // Axis ticks: target ~6 evenly spaced labels.
    const labels = niceAxisTicks(0, extent, 6);

    return { crewLanes: lanes, malfs: malfList, extentTicks: extent, axisTicks: labels };
  }, [doc]);

  const empty = crewLanes.length === 0 && malfs.length === 0;

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div className="timeline-title">Timeline</div>
        <div className="timeline-extent">
          extent: 0 – {extentTicks} ticks
          {tickHours ? ` ≈ ${ticksToWallClock(extentTicks, tickHours)}` : null}
          {tickHours ? ` · 1 tick = ${formatNum(tickHours)} h` : null}
        </div>
      </div>

      {empty ? (
        <div className="timeline-empty">
          No crew schedules or malfunctions in this document yet. Add a
          <code> &lt;crewPerson&gt;</code> with a <code>&lt;schedule&gt;</code>,
          or attach a malfunction to a module from the side panel.
        </div>
      ) : (
        <div className="timeline-body">
          <Axis ticks={axisTicks} extent={extentTicks} tickHours={tickHours} />

          {crewLanes.length > 0 && (
            <div className="timeline-section">
              <div className="timeline-section-head">Crew schedules (cycled)</div>
              {crewLanes.map((lane, i) => (
                <CrewLaneRow
                  key={`${lane.groupName}/${lane.person.name}/${i}`}
                  lane={lane}
                  extent={extentTicks}
                  onSelect={() => selectModule(lane.groupName)}
                />
              ))}
            </div>
          )}

          {malfs.length > 0 && (
            <div className="timeline-section">
              <div className="timeline-section-head">
                Malfunctions ({malfs.length})
              </div>
              {malfs
                .slice()
                .sort((a, b) => a.spec.occursAtTick - b.spec.occursAtTick)
                .map((m) => (
                  <MalfunctionRow
                    key={m.moduleName}
                    marker={m}
                    extent={extentTicks}
                    tickHours={tickHours}
                    onSelect={() => selectModule(m.moduleName)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Axis ----------------------------------------------------------------

function Axis({
  ticks,
  extent,
  tickHours,
}: {
  ticks: number[];
  extent: number;
  tickHours: number | undefined;
}) {
  return (
    <div className="tl-axis">
      <div className="tl-axis-track">
        {ticks.map((t) => (
          <div
            key={t}
            className="tl-axis-mark"
            style={{ left: `${pct(t, extent)}%` }}
          >
            <div className="tl-axis-label">{t}</div>
            {tickHours ? (
              <div className="tl-axis-sublabel">
                {ticksToWallClock(t, tickHours)}
              </div>
            ) : null}
            <div className="tl-axis-tick" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Crew lane -----------------------------------------------------------

function CrewLaneRow({
  lane,
  extent,
  onSelect,
}: {
  lane: CrewLane;
  extent: number;
  onSelect: () => void;
}) {
  // Tile the schedule across the extent. Each repetition gets its own
  // blocks so hover tooltips and color animations apply per-cycle.
  const blocks: {
    start: number;
    length: number;
    name: string;
    intensity: number;
    cycleIndex: number;
  }[] = [];

  const cycle = lane.cycleTicks;
  let cycleIndex = 0;
  while (cycleIndex * cycle < extent) {
    let cursor = cycleIndex * cycle;
    for (const a of lane.person.schedule) {
      const len = Math.max(0, a.length || 0);
      if (len === 0) continue;
      const start = cursor;
      cursor += len;
      blocks.push({
        start,
        length: Math.min(len, Math.max(0, extent - start)),
        name: a.name,
        intensity: a.intensity,
        cycleIndex,
      });
      if (cursor >= extent) break;
    }
    cycleIndex++;
    if (cycleIndex > 200) break; // safety: avoid runaway when cycle is tiny relative to extent
  }

  return (
    <div className="tl-row">
      <button
        type="button"
        className="tl-row-label"
        onClick={onSelect}
        title={`Open ${lane.groupName} in the side panel`}
      >
        <div className="tl-row-name">{lane.person.name}</div>
        <div className="tl-row-sub">{lane.groupName} · {lane.cycleTicks}t cycle</div>
      </button>
      <div className="tl-row-track">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="tl-crew-block"
            style={{
              left: `${pct(b.start, extent)}%`,
              width: `${pct(b.length, extent)}%`,
              background: INTENSITY_COLOR[clampIntensity(b.intensity)],
              opacity: b.cycleIndex === 0 ? 1 : 0.85,
            }}
            title={`${b.name} · intensity ${b.intensity} · ${b.length} ticks (cycle #${b.cycleIndex + 1})`}
          >
            <span className="tl-crew-label">{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Malfunction row (one per event) -------------------------------------
//
// Each malfunction gets its own lane so events that fire close in time
// never collide visually. The marker is anchored at `occursAtTick`; the
// length attribute (TEMPORARY_MALF vs PERMANENT_MALF) is surfaced in
// the row label rather than as a duration bar, matching the v0
// "one-shot event" framing.

function MalfunctionRow({
  marker,
  extent,
  tickHours,
  onSelect,
}: {
  marker: MalfMarker;
  extent: number;
  tickHours: number | undefined;
  onSelect: () => void;
}) {
  const { moduleName, spec } = marker;
  const wall = tickHours ? ticksToWallClock(spec.occursAtTick, tickHours) : null;
  const intensityShort = spec.intensity.replace("_MALF", "");
  const lengthShort = spec.length.replace("_MALF", "");
  const fullLabel = `${moduleName} · ${labelMalf(spec)}${wall ? ` · ≈ ${wall}` : ""}`;

  return (
    <div className="tl-row">
      <button
        type="button"
        className="tl-row-label"
        onClick={onSelect}
        title={`Open ${moduleName} in the side panel`}
      >
        <div className="tl-row-name">{moduleName}</div>
        <div className="tl-row-sub">
          <span
            className="tl-malf-tag"
            style={{ color: MALF_COLOR[spec.intensity] }}
          >
            {intensityShort}
          </span>
          <span className="tl-malf-tag-sep">·</span>
          <span className="tl-malf-tag">{lengthShort}</span>
        </div>
      </button>
      <div className="tl-row-track tl-malf-track">
        <button
          type="button"
          className="tl-malf"
          style={{
            left: `${pct(spec.occursAtTick, extent)}%`,
            color: MALF_COLOR[spec.intensity],
          }}
          onClick={onSelect}
          title={fullLabel}
        >
          <span className="tl-malf-marker">▼</span>
          <span className="tl-malf-tick">
            tick {spec.occursAtTick}
            {wall ? ` · ${wall}` : ""}
          </span>
        </button>
      </div>
    </div>
  );
}

// --- helpers -------------------------------------------------------------

function pct(t: number, extent: number): number {
  if (extent <= 0) return 0;
  return Math.max(0, Math.min(100, (t / extent) * 100));
}

function clampIntensity(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function labelMalf(s: MalfunctionSpec): string {
  return `${s.intensity.replace("_MALF", "")} / ${s.length.replace("_MALF", "")} @ tick ${s.occursAtTick}`;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "?";
  if (Math.abs(n) >= 1) return n.toFixed(2).replace(/\.?0+$/, "");
  return n.toFixed(3).replace(/\.?0+$/, "");
}

/**
 * Pick `target` axis label positions in [start, end] using a 1/2/5
 * step rounded to a power of ten — same trick as d3-axis but inlined.
 */
function niceAxisTicks(start: number, end: number, target: number): number[] {
  const span = end - start;
  if (span <= 0) return [start];
  const rough = span / Math.max(1, target);
  const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow10;
  let step: number;
  if (norm < 1.5) step = 1 * pow10;
  else if (norm < 3) step = 2 * pow10;
  else if (norm < 7) step = 5 * pow10;
  else step = 10 * pow10;

  const out: number[] = [];
  const first = Math.ceil(start / step) * step;
  for (let v = first; v <= end + 1e-9; v += step) {
    out.push(Math.round(v * 1000) / 1000);
  }
  if (out[0] !== 0) out.unshift(0);
  return out;
}
