'use client';

// "Which region does this belong to?" — structurally a sibling of ScopeSelect:
// one select, one property, one value. Only offered for muscle_group terms —
// tags/equipment have no parent grouping.

export interface ParentOption {
  id: string;
  name: string;
}

interface Props {
  /** 'top' (no parent), or the parent term's id. */
  value: string;
  /** Eligible parents — other top-level muscle groups this term could join. */
  options: ParentOption[];
  onChange: (next: string) => void;
  disabled?: boolean;
}

export const TOP_LEVEL = 'top';

export default function ParentSelect({ value, options, onChange, disabled = false }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-label uppercase text-text-faint">Region</span>
      <select
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary disabled:opacity-50"
      >
        <option value={TOP_LEVEL}>No parent — top-level</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <span className="mt-1 block text-caption text-text-faint">
          No eligible top-level groups to nest under yet.
        </span>
      )}
    </label>
  );
}
