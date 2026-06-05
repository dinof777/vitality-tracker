'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SAMPLE_EXERCISES } from '@/lib/exercises';
import {
  DAY_LABELS,
  getRoutine,
  updateRoutine,
  type LocalRoutine,
} from '@/lib/routine-store';

const exName = (id: string) => SAMPLE_EXERCISES.find((e) => e.id === id)?.name ?? id;

export default function RoutineDetailPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<LocalRoutine | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setRoutine(getRoutine(routineId) ?? null);
  }, [routineId]);

  const save = (next: LocalRoutine) => {
    updateRoutine(next);
    setRoutine({ ...next });
  };

  const addExercise = (exerciseId: string) => {
    if (!routine) return;
    save({
      ...routine,
      exercises: [...routine.exercises, { exerciseId, sets: 3, reps: '8-12', tempo: '3-1-1' }],
    });
    setPicking(false);
    setQuery('');
  };

  const move = (index: number, dir: -1 | 1) => {
    if (!routine) return;
    const next = [...routine.exercises];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    save({ ...routine, exercises: next });
  };

  const remove = (index: number) => {
    if (!routine) return;
    save({ ...routine, exercises: routine.exercises.filter((_, i) => i !== index) });
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const already = new Set(routine?.exercises.map((e) => e.exerciseId));
    return SAMPLE_EXERCISES.filter(
      (e) => !already.has(e.id) && e.name.toLowerCase().includes(q),
    );
  }, [query, routine]);

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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
      <Link href="/routines" className="text-caption text-text-muted">
        ← Routines
      </Link>
      <header className="mb-5 mt-2">
        <h1 className="text-h1 text-text-primary">{routine.name}</h1>
        {routine.dayOfWeek && (
          <p className="text-caption text-text-muted">{DAY_LABELS[routine.dayOfWeek]}</p>
        )}
      </header>

      <ul className="space-y-2">
        {routine.exercises.map((re, i) => (
          <li
            key={`${re.exerciseId}-${i}`}
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
                disabled={i === routine.exercises.length - 1}
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-text-primary">
                {exName(re.exerciseId)}
              </p>
              <p className="text-caption text-text-muted nums">
                {re.sets} × {re.reps} · {re.tempo}
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
        {routine.exercises.length === 0 && (
          <li className="rounded-md border border-dashed border-border p-5 text-center text-caption text-text-muted">
            No exercises yet. Add your first movement.
          </li>
        )}
      </ul>

      {picking ? (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-surface p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="h-12 w-full rounded-md bg-surface-raised px-3 text-body text-text-primary outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => addExercise(e.id)}
                className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left active:bg-surface-raised"
              >
                <span className="text-body text-text-primary">{e.name}</span>
                <span className="text-caption text-text-muted">{e.muscle_group}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-caption text-text-faint">No matches.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPicking(false)}
            className="h-10 w-full rounded-md border border-border text-label text-text-muted"
          >
            Done
          </button>
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

      {/* Sticky Start Workout */}
      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md px-4 pt-2">
        <Link
          href="/workout/active"
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent shadow-lift transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          START WORKOUT
        </Link>
      </div>
    </main>
  );
}
