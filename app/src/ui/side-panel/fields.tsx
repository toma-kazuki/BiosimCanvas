// Reusable side-panel form controls.
//
// All controls are *controlled* — they reflect canonical state on every
// render. Commit semantics differ:
//   - <TextRow>, <NumberRow>: commit on every keystroke.
//   - <RenameRow>: commits on blur or Enter (and on Esc reverts), since
//     intermediate values can collide with other module names.
//   - <NumberArrayRow>: keeps a local textual buffer so the user can edit
//     a list like "10 20" without each keystroke re-parsing.

import { useEffect, useState } from "react";

export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="row">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function TextRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Row label={label}>
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
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
}) {
  return (
    <Row label={label}>
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
}: {
  label: string;
  value: number[] | undefined;
  onChange: (v: number[] | undefined) => void;
}) {
  const initial = (value ?? []).join(" ");
  const [buf, setBuf] = useState(initial);

  // Keep buf in sync if `value` changes from elsewhere (e.g. undo).
  useEffect(() => {
    setBuf((value ?? []).join(" "));
  }, [value]);

  return (
    <Row label={label}>
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
 * Edit a list of references (other module names). v0.x: simple space-
 * separated text input. Autocomplete + drag-link comes in Phase 6.
 */
export function RefsRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (refs: string[]) => void;
}) {
  const initial = value.join(" ");
  const [buf, setBuf] = useState(initial);

  useEffect(() => setBuf(value.join(" ")), [value]);

  return (
    <Row label={label}>
      <input
        type="text"
        value={buf}
        onChange={(e) => {
          setBuf(e.target.value);
          const refs = e.target.value
            .split(/\s+/)
            .map((t) => t.trim())
            .filter(Boolean);
          onChange(refs);
        }}
        className="field"
        placeholder="space-separated module names"
      />
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
