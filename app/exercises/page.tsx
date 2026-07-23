'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import type { Exercise } from '@/lib/database.types';
import { SAMPLE_EXERCISES } from '@/lib/exercises';
import { usedTags } from '@/lib/tags';
import ExerciseBrowseList from '@/components/workout/ExerciseBrowseList';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';
import AddToRoutineSheet from '@/components/workout/AddToRoutineSheet';

// Exercise library — browse / search all exercises, tap for detail (with the recent
// progressive-overload trend), or + to add to a routine / saved workout.
export default function ExercisesPage() {
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [addTarget, setAddTarget] = useState<Exercise | null>(null);
  // Saved workouts become filters — "show me just what's in Knee Rehab Week 1".
  const [circuits, setCircuits] = useState<Array<{ id: string; name: string; names: string[] }>>([]);
  const [circuitId, setCircuitId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tenant/workouts')
      .then((r) => (r.ok ? r.json() : { workouts: [] }))
      .then((d) =>
        setCircuits(
          (d.workouts ?? []).map((w: { id: string; name: string; payload?: { exercises?: { name: string }[] } }) => ({
            id: w.id,
            name: w.name,
            names: (w.payload?.exercises ?? []).map((e) => e.name),
          })),
        ),
      )
      .catch(() => {});
  }, []);

  // Circuit membership is page-specific (not part of "browse" itself), so it's
  // applied here as a pre-filter; ExerciseBrowseList only owns search + the
  // equipment grouping on top of whatever pool it's handed.
  const pool = useMemo(() => {
    const circuit = circuits.find((c) => c.id === circuitId);
    if (!circuit) return SAMPLE_EXERCISES;
    return SAMPLE_EXERCISES.filter((e) => circuit.names.includes(e.name));
  }, [circuits, circuitId]);

  return (
    <main className="shell min-h-dvh px-4 pb-28 pt-8">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">LIBRARY</p>
          <h1 className="text-h1 text-text-primary">Exercises</h1>
          <p className="text-body text-text-muted">Tap for detail, or + to add to a routine.</p>
        </div>
        <Link href="/routines" className="mt-1 shrink-0 text-caption text-text-muted underline">
          Routines ›
        </Link>
      </header>

      {/* Tagged collections — a whole program pulled from the library by goal */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {usedTags(SAMPLE_EXERCISES, 'goal').map((t) => (
          <Link
            key={t.id}
            href={`/collections/${t.id}`}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-text-primary active:bg-surface-raised"
          >
            {t.label} ›
          </Link>
        ))}
      </div>

      {circuits.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-caption font-semibold tracking-wide text-text-faint">MY WORKOUTS</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {circuits.map((c) => {
              const on = circuitId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCircuitId(on ? null : c.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-caption transition ${
                    on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ExerciseBrowseList
        items={pool}
        query={query}
        onQueryChange={setQuery}
        onSelect={(ex) => setDetail(ex)}
        renderTrailing={(ex) => (
          <button
            type="button"
            onClick={() => setAddTarget(ex)}
            aria-label={`Add ${ex.name} to a routine`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-h2 text-accent active:bg-surface-raised"
          >
            +
          </button>
        )}
      />

      {detail && (
        <ExerciseDetailSheet
          exercise={detail}
          onClose={() => setDetail(null)}
          actionLabel="Add to routine"
          onAction={() => {
            setAddTarget(detail);
            setDetail(null);
          }}
        />
      )}
      {addTarget && (
        <AddToRoutineSheet
          exerciseId={addTarget.id}
          exerciseName={addTarget.name}
          onClose={() => setAddTarget(null)}
        />
      )}
    </main>
  );
}
