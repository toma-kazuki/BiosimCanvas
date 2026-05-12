// Reusable side-panel form controls.
//
// All controls are *controlled* — they reflect canonical state on every
// render. Commit semantics differ:
//   - <TextRow>, <NumberRow>: commit on every keystroke.
//   - <RenameRow>: commits on blur or Enter (and on Esc reverts), since
//     intermediate values can collide with other module names.
//   - <NumberArrayRow>: keeps a local textual buffer so the user can edit
//     a list like "10 20" without each keystroke re-parsing.

import { useEffect, useRef, useState } from "react";

export function Row({
  label,
  unit,
  children,
}: {
  label: string;
  /** Optional unit suffix rendered right after the label, dimmer. */
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="row">
      <label>
        {label}
        {unit ? <span className="unit"> ({unit})</span> : null}
      </label>
      {children}
    </div>
  );
}

export function TextRow({
  label,
  value,
  onChange,
  placeholder,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
}) {
  return (
    <Row label={label} unit={unit}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </Row>
  );
}

export function NumberRow({
  label,
  value,
  onChange,
  step,
  unit,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  unit?: string;
}) {
  return (
    <Row label={label} unit={unit}>
      <input
        type="number"
        step={step ?? "any"}
        value={value === undefined || Number.isNaN(value) ? "" : value}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (t === "") return onChange(undefined);
          const n = Number(t);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="field"
      />
    </Row>
  );
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <Row label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="field"
      >
        {options.map((o) => (
          <option value={o} key={o}>
            {o}
          </option>
        ))}
      </select>
    </Row>
  );
}

/**
 * Single text input editing a numeric array as space-separated tokens.
 * The local buffer accepts intermediate strings (e.g. "1.0 2.") so the
 * user can type freely; we commit a parsed `number[]` on every change.
 */
export function NumberArrayRow({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number[] | undefined;
  onChange: (v: number[] | undefined) => void;
  unit?: string;
}) {
  const initial = (value ?? []).join(" ");
  const [buf, setBuf] = useState(initial);

  useEffect(() => {
    setBuf((value ?? []).join(" "));
  }, [value]);

  return (
    <Row label={label} unit={unit}>
      <input
        type="text"
        value={buf}
        onChange={(e) => {
          const next = e.target.value;
          setBuf(next);
          const parsed = next
            .split(/\s+/)
            .filter(Boolean)
            .map((t) => Number(t));
          if (parsed.every((n) => Number.isFinite(n))) {
            onChange(parsed.length ? parsed : undefined);
          }
        }}
        className="field"
        placeholder="space-separated"
      />
    </Row>
  );
}

/**
 * Edit a list of references (other module names). Renders the current
 * refs as removable chips and exposes a picker dropdown listing every
 * module name in the document, so the user never has to type a name
 * from memory.
 *
 * `multi` controls whether more than one ref is allowed; for sensor
 * `input` we use the same control with multi=false so the picker just
 * replaces the single value.
 *
 * Type-compatibility filtering (e.g. only show environments for an
 * airConsumer) will come in a later pass once we have the schema-aware
 * port-type metadata; for v0.x we surface every module name except
 * `selfName` and let the user choose.
 */
export function RefsRow({
  label,
  value,
  available,
  onChange,
  selfName,
  multi = true,
}: {
  label: string;
  value: string[];
  /** All module names that may legally be referenced from this row. */
  available: string[];
  onChange: (refs: string[]) => void;
  /** A module's own name; never offered as a self-reference. */
  selfName?: string;
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const remove = (name: string) => onChange(value.filter((r) => r !== name));

  const add = (name: string) => {
    if (!multi) {
      onChange([name]);
      setOpen(false);
      setFilter("");
      return;
    }
    if (value.includes(name)) return;
    onChange([...value, name]);
    setFilter("");
  };

  const f = filter.trim().toLowerCase();
  const candidates = available
    .filter((n) => n !== selfName)
    .filter((n) => (multi ? !value.includes(n) : true))
    .filter((n) => (f === "" ? true : n.toLowerCase().includes(f)))
    .sort((a, b) => a.localeCompare(b));

  return (
    <Row label={label}>
      <div className="refs-picker" ref={wrapRef}>
        <div className="chips">
          {value.length === 0 && (
            <span className="chips-empty">
              {multi ? "no targets" : "—"}
            </span>
          )}
          {value.map((name) => (
            <span className="chip" key={name}>
              <span className="chip-name">{name}</span>
              <button
                type="button"
                className="chip-x"
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="chip-add"
            onClick={() => setOpen((o) => !o)}
            title={multi ? "Add reference" : "Choose module"}
          >
            {multi ? "+ Add" : "Choose…"}
          </button>
        </div>
        {open && (
          <div className="picker-dropdown">
            <input
              type="text"
              autoFocus
              className="picker-filter field"
              placeholder="Filter…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="picker-list">
              {candidates.length === 0 ? (
                <div className="picker-empty">No matches.</div>
              ) : (
                candidates.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className="picker-item"
                    onClick={() => add(n)}
                  >
                    {n}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Row>
  );
}

/**
 * Rename input — commits on blur/Enter; reverts on Esc; if the parent
 * cannot accept the new name (collision), the parent will surface a
 * toast and the value prop will not change, so this control snaps back.
 */
export function RenameRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [buf, setBuf] = useState(value);
  useEffect(() => setBuf(value), [value]);

  const commit = () => {
    const trimmed = buf.trim();
    if (trimmed === "" || trimmed === value) {
      setBuf(value); // snap back to committed value
      return;
    }
    onCommit(trimmed);
  };

  return (
    <Row label={label}>
      <input
        type="text"
        value={buf}
        onChange={(e) => setBuf(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setBuf(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="field"
      />
    </Row>
  );
}
