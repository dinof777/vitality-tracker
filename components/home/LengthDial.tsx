'use client';

import { LENGTH_MAX, LENGTH_MIN, LENGTH_STEP } from '@/lib/profile';

interface LengthDialProps {
  minutes: number;
  onChange: (minutes: number) => void;
}

// Circular workout-length selector — big number in a lime progress ring with
// − / + steppers (inspired by the reference app's minutes dial).
export default function LengthDial({ minutes, onChange }: LengthDialProps) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, minutes / LENGTH_MAX));
  const dash = circ * frac;

  const step = (dir: -1 | 1) => {
    const next = Math.min(LENGTH_MAX, Math.max(LENGTH_MIN, minutes + dir * LENGTH_STEP));
    if (next !== minutes) onChange(next);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-raised)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-200 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-display nums text-text-primary">{minutes}</span>
          <span className="text-caption text-text-muted">minutes</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={minutes <= LENGTH_MIN}
          aria-label="Shorter"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-h2 text-text-primary active:scale-95 disabled:opacity-30"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={minutes >= LENGTH_MAX}
          aria-label="Longer"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-h2 text-text-primary active:scale-95 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
