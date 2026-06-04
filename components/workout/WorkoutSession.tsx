'use client';

import { useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import type { LoggedSet } from '@/lib/workout-types';
import { SAMPLE_EXERCISES } from '@/lib/exercises';
import ExerciseCard from './ExerciseCard';

interface WorkoutSessionProps {
  // Route param. A real UUID resumes that workout; 'active'/anything else
  // starts a fresh local session (the server assigns an id on first sync).
  initialWorkoutId?: string;
  exercises?: Exercise[];
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

type SyncState = 'idle' | 'syncing' | 'synced' | 'local';

export default function WorkoutSession({
  initialWorkoutId,
  exercises = SAMPLE_EXERCISES,
}: WorkoutSessionProps) {
  const [workoutId, setWorkoutId] = useState<string | null>(
    initialWorkoutId && isUuid(initialWorkoutId) ? initialWorkoutId : null,
  );
  const [setCount, setSetCount] = useState(0);
  const [sync, setSync] = useState<SyncState>('idle');
  const [finished, setFinished] = useState(false);

  const handleLogSet = async (entry: LoggedSet) => {
    setSetCount((n) => n + 1);
    setSync('syncing');
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, workoutId }),
      });
      if (res.status === 503) {
        setSync('local'); // Supabase not configured yet — kept on-device
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.workoutId && !workoutId) setWorkoutId(data.workoutId);
      setSync('synced');
    } catch {
      setSync('local');
    }
  };

  const finishWorkout = async () => {
    setFinished(true);
    if (!workoutId) return;
    try {
      await fetch('/api/workouts/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId }),
      });
    } catch {
      /* best effort */
    }
  };

  const syncLabel: Record<SyncState, string> = {
    idle: 'Ready',
    syncing: 'Syncing…',
    synced: 'Synced',
    local: 'On-device',
  };
  const syncColor: Record<SyncState, string> = {
    idle: 'text-text-faint',
    syncing: 'text-text-muted',
    synced: 'text-success',
    local: 'text-energy',
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-24 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-label text-accent">TODAY&apos;S WORKOUT</p>
          <p className="text-caption text-text-muted nums">
            {setCount} {setCount === 1 ? 'set' : 'sets'} logged
          </p>
        </div>
        <span className={`text-caption font-semibold ${syncColor[sync]}`}>
          ● {syncLabel[sync]}
        </span>
      </header>

      <div className="space-y-4">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} onLogSet={handleLogSet} />
        ))}
      </div>

      {/* Sticky Finish Workout */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={finishWorkout}
          disabled={finished || setCount === 0}
          className="flex h-14 w-full items-center justify-center rounded-md border border-border bg-surface-raised text-label text-text-primary shadow-lift transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          {finished ? 'WORKOUT FINISHED ✓' : 'FINISH WORKOUT'}
        </button>
      </div>
    </div>
  );
}
