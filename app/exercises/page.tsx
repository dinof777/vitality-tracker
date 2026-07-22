'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import type { Exercise } from '@/lib/database.types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER, SAMPLE_EXERCISES } from '@/lib/exercises';
import { TIER_LABEL, exerciseTier } from '@/lib/exercise-intensity';
import { usedTags, tagLabel } from '@/lib/tags';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
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

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (e: Exercise) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      (e.muscle_group ?? '').toLowerCase().includes(q) ||
      (e.tags ?? []).some((t) => tagLabel(t).toLowerCase().includes(q));
    const circuit = circuits.find((c) => c.id === circuitId);
    const inCircuit = (e: Exercise) => !circuit || circuit.names.includes(e.name);
    return EQUIPMENT_ORDER.map((eq) => ({
      eq,
      items: SAMPLE_EXERCISES.filter((e) => e.equipment === eq && match(e) && inCircuit(e)),
    })).filter((g) => g.items.length > 0);
  }, [query, circuits, circuitId]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

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
          <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">MY WORKOUTS</p>
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

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises…"
        className="mb-4 h-12 w-full rounded-md bg-surface-raised px-4 text-body text-text-primary outline-none focus:ring-2 focus:ring-accent"
      />

      {total === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-body text-text-muted">
          No exercises match “{query}”.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.eq}>
              <p className="mb-2 text-caption text-text-muted">
                {EQUIPMENT_LABEL[g.eq].toUpperCase()} · {g.items.length}
              </p>
              <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
                {g.items.map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface p-2 pr-1"
                  >
                    <button
                      type="button"
                      onClick={() => setDetail(ex)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
                    >
                      <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={44} />
                      <span className="min-w-0">
                        <span className="block truncate text-body font-semibold text-text-primary">{ex.name}</span>
                        <span className="block text-caption text-text-muted">
                          {[ex.muscle_group, ex.equipment && EQUIPMENT_LABEL[ex.equipment], TIER_LABEL[exerciseTier(ex)]]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddTarget(ex)}
                      aria-label={`Add ${ex.name} to a routine`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-h2 text-accent active:bg-surface-raised"
                    >
                      +
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

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
