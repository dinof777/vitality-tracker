'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import type { LoggedSet } from '@/lib/workout-types';
import { fetchRoutine } from '@/lib/routines';
import { SAMPLE_EXERCISES } from '@/lib/exercises';
import ExerciseCard from './ExerciseCard';
import ExercisePicker from './ExercisePicker';
import InfoLegend from './InfoLegend';

interface WorkoutSessionProps {
  // Route param. A real UUID resumes that workout; 'active'/anything else
  // starts a fresh local session (the server assigns an id on first sync).
  initialWorkoutId?: string;
  // Pre-loaded exercises (e.g. when started from a routine). Defaults to empty —
  // you add exercises via the picker.
  initialExercises?: Exercise[];
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

type SyncState = 'idle' | 'syncing' | 'synced' | 'local';

export default function WorkoutSession({
  initialWorkoutId,
  initialExercises = [],
}: WorkoutSessionProps) {
  const searchParams = useSearchParams();
  const routineParam = searchParams.get('routine');
  const exParam = searchParams.get('ex');

  // Generated workout: ?ex=<comma-separated exercise ids>.
  const exFromParam = exParam
    ? exParam
        .split(',')
        .map((id) => SAMPLE_EXERCISES.find((e) => e.id === id))
        .filter((e): e is Exercise => Boolean(e))
    : [];

  const [workoutId, setWorkoutId] = useState<string | null>(
    initialWorkoutId && isUuid(initialWorkoutId) ? initialWorkoutId : null,
  );
  const routineId = routineParam && isUuid(routineParam) ? routineParam : null;
  const [exercises, setExercises] = useState<Exercise[]>(
    exFromParam.length ? exFromParam : initialExercises,
  );
  const [picking, setPicking] = useState(
    exFromParam.length === 0 && initialExercises.length === 0 && !routineParam,
  );
  const [loadingRoutine, setLoadingRoutine] = useState(Boolean(routineParam));
  const [setCount, setSetCount] = useState(0);

  // When started from a routine, pre-load its exercises into the logger.
  useEffect(() => {
    if (!routineParam) return;
    let active = true;
    fetchRoutine(routineParam)
      .then((r) => {
        if (!active) return;
        if (r && r.exercises.length > 0) {
          setExercises(
            r.exercises.map((re) => ({
              id: re.exercise_id,
              name: re.name,
              muscle_group: re.muscle_group,
              equipment: re.equipment,
              image_url: re.image_url,
              default_cue: re.default_cue,
              created_at: '',
            })),
          );
        } else {
          setPicking(true);
        }
        setLoadingRoutine(false);
      })
      .catch(() => {
        if (!active) return;
        setPicking(true);
        setLoadingRoutine(false);
      });
    return () => {
      active = false;
    };
  }, [routineParam]);
  const [sync, setSync] = useState<SyncState>('idle');
  const [finished, setFinished] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const handleLogSet = async (entry: LoggedSet) => {
    setSetCount((n) => n + 1);
    setSync('syncing');
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, workoutId, routineId }),
      });
      if (res.status === 503) {
        setSync('local'); // DB not configured yet — kept on-device
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            aria-label="What do these numbers mean?"
            className={`flex h-7 w-7 items-center justify-center rounded-full border border-border text-caption font-bold transition-colors ${
              showLegend ? 'bg-accent text-on-accent' : 'text-text-muted'
            }`}
          >
            ?
          </button>
          <span className={`text-caption font-semibold ${syncColor[sync]}`}>
            ● {syncLabel[sync]}
          </span>
        </div>
      </header>

      {showLegend && (
        <div className="mb-4">
          <InfoLegend />
        </div>
      )}

      {loadingRoutine && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-surface" />
          ))}
        </div>
      )}

      <div className="space-y-4">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} onLogSet={handleLogSet} />
        ))}
      </div>

      {picking ? (
        <div className="mt-4">
          <ExercisePicker
            excludeIds={exercises.map((e) => e.id)}
            onPick={(ex) => {
              setExercises((prev) => [...prev, ex]);
              setPicking(false);
            }}
            onClose={exercises.length > 0 ? () => setPicking(false) : undefined}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary transition-all duration-150 active:scale-[0.97] active:bg-surface"
        >
          + ADD MOVE
        </button>
      )}

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
