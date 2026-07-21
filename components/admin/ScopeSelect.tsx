'use client';

// "Where does this live?" — one control.
//
// Scope is a single property with one value, but it was built as two unrelated
// affordances: a "↑ Make shared" button and a separate "↓ Give to one gym…"
// dropdown + Move button. That made the reader reconstruct one idea from three
// widgets. It's a select: shared, or the gym that owns it.

export interface Gym {
  id: string;
  name: string;
}

interface Props {
  /** 'global', or the owning gym's id. */
  value: string;
  gyms: Gym[];
  onChange: (next: string) => void;
  disabled?: boolean;
  label?: string;
}

export const GLOBAL = 'global';

export default function ScopeSelect({ value, gyms, onChange, disabled = false, label = 'Lives in' }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.65rem] font-semibold tracking-wide text-text-faint">
        {label.toUpperCase()}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-border bg-background px-2 text-body text-text-primary disabled:opacity-50"
      >
        <option value={GLOBAL}>Shared library — every gym</option>
        {gyms.map((g) => (
          <option key={g.id} value={g.id}>
            Only {g.name}
          </option>
        ))}
      </select>
    </label>
  );
}
