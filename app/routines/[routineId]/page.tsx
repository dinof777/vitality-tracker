'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import {
  DAY_LABELS,
  fetchRoutine,
  saveRoutineExercises,
  type RoutineExerciseRow,
  type RoutineWithExercises,
} from '@/lib/routines';
import ExercisePicker from '@/components/workout/ExercisePicker';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import { syncrofitRunUrl } from '@/lib/syncrofit';

export default function RoutineDetailPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [rows, setRows] = useState<RoutineExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    fetchRoutine(routineId).then((r) => {
      setRoutine(r);
      setRows(r?.exercises ?? []);
      setLoading(false);
    });
  }, [routineId]);

  // Persist the current order/contents to the DB.
  const persist = (next: RoutineExerciseRow[]) => {
    setRows(next);
    void saveRoutineExercises(
      routineId,
      next.map((r) => ({
        exerciseId: r.exercise_id,
        sets: r.default_sets,
        reps: r.default_reps,
        tempo: r.default_tempo,
      })),
    );
  };

  const addExercise = (ex: Exercise) => {
    persist([
      ...rows,
      {
        id: `tmp-${ex.id}`,
        exercise_id: ex.id,
        sort_order: rows.length,
        default_sets: 3,
        default_reps: '8-12',
        default_tempo: '3-1-1',
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        image_url: ex.image_url,
        default_cue: ex.default_cue,
      },
    ]);
    setPicking(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const remove = (index: number) => persist(rows.filter((_, i) => i !== index));

  // Hand this routine to the SyncroFit interval-timer app as a timed circuit.
  const sendToSyncrofit = () => {
    if (!routine || rows.length === 0) return;
    window.location.href = syncrofitRunUrl({ ...routine, exercises: rows });
  };

  if (loading) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4 pt-8">
        <div className="h-8 w-40 animate-pulse rounded bg-surface" />
      </main>
    );
  }

  if (!routine) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4 pt-8">
        <p className="text-body text-text-muted">Routine not found.</p>
        <Link href="/routines" className="text-accent">
          ← Back to routines
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-32 pt-8">
      <Link href="/routines" className="text-caption text-text-muted">
        ← Routines
      </Link>
      <header className="mb-5 mt-2">
        <h1 className="text-h1 text-text-primary">{routine.name}</h1>
        {routine.day_of_week && (
          <p className="text-caption text-text-muted">{DAY_LABELS[routine.day_of_week]}</p>
        )}
      </header>

      <ul className="space-y-2">
        {rows.map((re, i) => (
          <li
            key={re.id}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="text-text-faint active:text-accent disabled:opacity-30"
                disabled={i === 0}
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="text-text-faint active:text-accent disabled:opacity-30"
                disabled={i === rows.length - 1}
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <ExerciseThumb equipment={re.equipment} imageUrl={re.image_url} name={re.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-text-primary">{re.name}</p>
              <p className="text-caption text-text-muted nums">
                {re.default_sets} × {re.default_reps} · {re.default_tempo}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-caption text-destructive"
              aria-label="Remove exercise"
            >
              Remove
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-md border border-dashed border-border p-5 text-center text-caption text-text-muted">
            No exercises yet. Add your first movement.
          </li>
        )}
      </ul>

      {picking ? (
        <div className="mt-4">
          <ExercisePicker
            excludeIds={rows.map((r) => r.exercise_id)}
            onPick={addExercise}
            onClose={() => setPicking(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:scale-[0.97] active:bg-surface"
        >
          + ADD EXERCISE
        </button>
      )}

      {/* Send to SyncroFit as a timed interval circuit */}
      {rows.length > 0 && (
        <button
          type="button"
          onClick={sendToSyncrofit}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-label text-text-primary active:scale-[0.97] active:bg-surface-raised"
        >
          ⏱ SEND TO SYNCROFIT
        </button>
      )}
      <p className="mt-2 px-1 text-caption text-text-faint">
        Opens this routine as a timed circuit in the SyncroFit interval-timer app (iPhone).
      </p>

      {/* Sticky Start Workout */}
      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md px-4 pt-2">
        <Link
          href={`/workout/active?routine=${routine.id}`}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent shadow-lift transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          START WORKOUT
        </Link>
      </div>
    </main>
  );
}
