'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import type { WorkoutParams } from '@/lib/profile';
import { syncrofitRunUrl, syncrofitUrlFromWorkout } from '@/lib/syncrofit';
import { formatMinutes, totalSeconds } from '@/lib/workout-timing';
import ExerciseThumb from './ExerciseThumb';

const V2_KEY = 'vitality_sf_v2';

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
  // Images-on is the default — every other SyncroFit hand-off surface (gym
  // build, share, routines, dashboard) already sends the image format
  // unconditionally, so this sheet matches them. Only a trainer who has
  // explicitly turned it OFF keeps the classic no-image format.
  const [useV2, setUseV2] = useState(true);
  const est = totalSeconds(exercises, params);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(V2_KEY);
      if (stored !== null) setUseV2(stored === '1'); // honor an explicit prior choice; default on otherwise
    } catch {
      /* localStorage unavailable — keep the on-by-default */
    }
  }, []);

  const toggleV2 = () => {
    setUseV2((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(V2_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sendToTimer = () => {
    const url = useV2
      ? syncrofitRunUrl(name, exercises, params, window.location.origin)
      : syncrofitUrlFromWorkout(name, exercises, params);
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
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border" />
        <p className="text-h3 text-text-primary">Build my workout</p>
        <p className="mb-3 text-caption text-text-muted nums">
          {exercises.length} exercises · ~{formatMinutes(est)} · {params.sets} × {params.reps}
        </p>

        {/* The exercises this session will run */}
        <ul className="-mx-1 mb-4 max-h-[40dvh] space-y-1.5 overflow-y-auto px-1">
          {exercises.map((ex, i) => (
            <li key={ex.id} className="flex items-center gap-3 rounded-md bg-surface-raised p-2">
              <span className="w-5 shrink-0 text-center text-caption text-text-faint nums">{i + 1}</span>
              <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-text-primary">{ex.name}</span>
                <span className="block text-caption text-text-muted">{ex.muscle_group}</span>
              </span>
            </li>
          ))}
        </ul>

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

        <button
          type="button"
          onClick={toggleV2}
          className="mt-3 flex w-full items-center justify-between rounded-md border border-border bg-surface p-3 text-left"
        >
          <span className="pr-3">
            <span className="block text-caption font-semibold text-text-primary">Send exercise images</span>
            <span className="block text-caption text-text-muted">
              On by default. Turn off only for an older SyncroFit build.
            </span>
          </span>
          <span
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              useV2 ? 'bg-accent' : 'bg-surface-raised'
            }`}
          >
            <span className={`h-5 w-5 rounded-full bg-white transition-transform ${useV2 ? 'translate-x-5' : ''}`} />
          </span>
        </button>

        {sent ? (
          <p className="mt-3 text-caption text-text-muted">
            Opening SyncroFit… if nothing happens, the link is copied — open SyncroFit ▸ Import to paste it.
          </p>
        ) : (
          <p className="mt-3 text-caption text-text-muted">
            {useV2
              ? 'New format: sends sets, reps, rest + exercise images (where available).'
              : 'Classic format: sends sets, reps, hold & rest (no images on the old build).'}
          </p>
        )}
      </div>
    </div>
  );
}
