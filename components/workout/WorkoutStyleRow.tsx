'use client';

import { useState } from 'react';
import type { WorkoutMode } from '@/lib/database.types';
import { workoutStyleLabel } from '@/lib/profile';
import WorkoutStyleControl, { type WorkoutStylePatch } from './WorkoutStyleControl';

interface Props {
  mode: WorkoutMode;
  amrapMinutes: number;
  emomMinutes: number;
  onChange: (patch: WorkoutStylePatch) => void;
}

// A standalone "Change ›" row + its own bottom sheet around WorkoutStyleControl,
// for a host with no sheet plumbing of its own (CustomWorkoutBuilder). Same
// row shape as BuilderControls' FOCUS/INTENSITY/STYLE rows, just self-contained.
export default function WorkoutStyleRow({ mode, amrapMinutes, emomMinutes, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
      >
        <span>
          <span className="block text-caption text-text-muted">STYLE</span>
          <span className="block text-h3 text-text-primary">{workoutStyleLabel(mode)}</span>
        </span>
        <span className="text-text-faint">Change ›</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-h3 text-text-primary">Workout style</p>
            <WorkoutStyleControl mode={mode} amrapMinutes={amrapMinutes} emomMinutes={emomMinutes} onChange={onChange} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
            >
              DONE
            </button>
          </div>
        </div>
      )}
    </>
  );
}
