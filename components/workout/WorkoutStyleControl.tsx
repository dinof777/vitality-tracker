'use client';

import type { SetOrder, WorkoutMode } from '@/lib/database.types';
import { WORKOUT_STYLE_CHOICES, workoutStyleLabel } from '@/lib/profile';

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const MINUTE_CHIPS = [10, 12, 15, 20];

export interface WorkoutStylePatch {
  mode?: WorkoutMode;
  amrapMinutes?: number;
  emomMinutes?: number;
  setOrder?: SetOrder;
}

interface Props {
  mode: WorkoutMode;
  amrapMinutes: number;
  emomMinutes: number;
  onChange: (patch: WorkoutStylePatch) => void;
  /**
   * Present only for hosts that persist a per-workout set order (the routine
   * builder — DB `set_order`). Ad-hoc hosts (BuilderControls' STYLE sheet,
   * CustomWorkoutBuilder) omit it: setOrder is straightSets-fixed there (owner
   * decision), so the ordering sub-tier never renders for them.
   */
  setOrder?: SetOrder;
}

// Two-tier "how does this run once it's handed to SyncroFit" picker — see
// DESIGN.md §6 "Workout style control" for the full recipe this implements.
export default function WorkoutStyleControl({ mode, amrapMinutes, emomMinutes, onChange, setOrder }: Props) {
  const minutes = mode === 'emom' ? emomMinutes : amrapMinutes;
  const minutesKey = mode === 'emom' ? 'emomMinutes' : 'amrapMinutes';

  return (
    <div>
      <div className="space-y-2">
        {WORKOUT_STYLE_CHOICES.map((c) => {
          const on = mode === c.value;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ mode: c.value })}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
              }`}
            >
              <span>
                <span className="block text-body font-semibold text-text-primary">{c.label}</span>
                <span className="block text-caption text-text-muted">{c.hint}</span>
              </span>
              {on && <span className="text-accent">●</span>}
            </button>
          );
        })}
      </div>

      {mode === 'intervals' && setOrder !== undefined && (
        <div className="mt-2 rounded-lg border border-border bg-surface-raised/50 p-2.5">
          <p className="mb-2 text-caption font-semibold tracking-wide text-text-faint">SET ORDER</p>
          <div role="group" aria-label="Set order" className="inline-flex w-full rounded-full bg-surface-raised p-1">
            {([
              { value: 'straightSets' as const, label: 'Straight Sets' },
              { value: 'circuit' as const, label: 'Circuit' },
            ]).map((o) => {
              const on = setOrder === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ setOrder: o.value })}
                  className={`h-11 flex-1 rounded-full text-caption font-semibold transition-colors ${
                    on ? 'bg-accent text-on-accent' : 'text-text-muted'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(mode === 'amrap' || mode === 'emom') && (
        <div className="mt-2 rounded-lg border border-border bg-surface-raised/50 p-2.5">
          <p className="mb-2 text-caption font-semibold tracking-wide text-text-faint">
            {mode === 'amrap' ? 'AMRAP' : 'EMOM'} MINUTES
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {MINUTE_CHIPS.map((m) => {
              const active = minutes === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ [minutesKey]: m })}
                  className={`inline-flex h-11 items-center rounded-full px-3 text-caption font-semibold nums transition-colors ${
                    active ? 'bg-accent text-on-accent' : 'bg-accent/15 text-accent'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
            <span className="text-body text-text-primary">Minutes</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease minutes"
                onClick={() => onChange({ [minutesKey]: clamp(minutes - 1, 1, 60) })}
                className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95"
              >
                −
              </button>
              <span aria-live="polite" className="w-12 text-center text-body font-semibold text-text-primary nums">
                {minutes}
              </span>
              <button
                type="button"
                aria-label="Increase minutes"
                onClick={() => onChange({ [minutesKey]: clamp(minutes + 1, 1, 60) })}
                className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-2 text-caption text-text-faint">
        {mode === 'intervals'
          ? 'SyncroFit runs the timer when you send this workout.'
          : `SyncroFit runs the ${workoutStyleLabel(mode)} clock — Vitality doesn't have a built-in timer for this style yet.`}
      </p>
    </div>
  );
}
