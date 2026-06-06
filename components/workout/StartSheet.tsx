'use client';

import { useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import type { WorkoutParams } from '@/lib/profile';
import { syncrofitUrlFromWorkout } from '@/lib/syncrofit';
import { formatMinutes, totalSeconds } from '@/lib/workout-timing';

interface StartSheetProps {
  exercises: Exercise[];
  params: WorkoutParams;
  name: string;
  onLogInApp: () => void;
  onClose: () => void;
}

// Bottom sheet shown on "Start Workout": log the generated workout in the app,
// or hand it to the SyncroFit interval timer as a timed circuit.
export default function StartSheet({ exercises, params, name, onLogInApp, onClose }: StartSheetProps) {
  const [sent, setSent] = useState(false);
  const est = totalSeconds(exercises, params);

  const sendToTimer = () => {
    const url = syncrofitUrlFromWorkout(name, exercises, params);
    try {
      void navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard may be unavailable; the deep link still opens */
    }
    setSent(true);
    window.location.href = url;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border" />
        <p className="text-h3 text-text-primary">Start your workout</p>
        <p className="mb-4 text-caption text-text-muted nums">
          {exercises.length} moves · ~{formatMinutes(est)} · {params.sets} × {params.reps}
        </p>

        <button
          type="button"
          onClick={onLogInApp}
          className="mb-2 flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press"
        >
          ▶ LOG IN THE APP
        </button>
        <button
          type="button"
          onClick={sendToTimer}
          className="flex h-14 w-full items-center justify-center rounded-md border border-border bg-surface text-label text-text-primary active:bg-surface-raised"
        >
          ⏱ SEND TO INTERVAL TIMER
        </button>

        {sent ? (
          <p className="mt-3 text-caption text-text-muted">
            Opening SyncroFit… if nothing happens, the link is copied — open SyncroFit ▸ Import to paste it.
          </p>
        ) : (
          <p className="mt-3 text-caption text-text-muted">
            Interval timer uses your sets, reps, hold &amp; rest for the circuit timing.
          </p>
        )}
      </div>
    </div>
  );
}
