'use client';

interface ChecklistItemProps {
  label: string;
  subtitle?: string;
  checked: boolean;
  onToggle: () => void;
}

// One Daily 5 row. Whole row is a 48px+ tap target; checkbox fills accent with
// an animated check on completion.
export default function ChecklistItem({
  label,
  subtitle,
  checked,
  onToggle,
}: ChecklistItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="flex w-full items-center gap-3 rounded-md border border-border bg-surface p-3 text-left transition-all duration-150 active:scale-[0.99]"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
          checked ? 'border-accent bg-accent' : 'border-border bg-transparent'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-all duration-150 ${
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
          fill="none"
          stroke="var(--on-accent)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-body font-semibold ${
            checked ? 'text-text-faint line-through' : 'text-text-primary'
          }`}
        >
          {label}
        </span>
        {subtitle && <span className="block text-caption text-text-muted">{subtitle}</span>}
      </span>
    </button>
  );
}
