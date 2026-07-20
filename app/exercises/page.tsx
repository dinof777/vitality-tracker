'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Exercise } from '@/lib/database.types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER, SAMPLE_EXERCISES } from '@/lib/exercises';
import { TIER_LABEL, exerciseTier } from '@/lib/exercise-intensity';
import { usedTags, tagLabel } from '@/lib/tags';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';
import AddToRoutineSheet from '@/components/workout/AddToRoutineSheet';

// Exercise library — browse / search all movements, tap for detail (with the
// recent progressive-overload trend), or + to add to a routine / circuit.
export default function ExercisesPage() {
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [addTarget, setAddTarget] = useState<Exercise | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (e: Exercise) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      (e.muscle_group ?? '').toLowerCase().includes(q) ||
      (e.tags ?? []).some((t) => tagLabel(t).toLowerCase().includes(q));
    return EQUIPMENT_ORDER.map((eq) => ({
      eq,
      items: SAMPLE_EXERCISES.filter((e) => e.equipment === eq && match(e)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
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
              <ul className="space-y-2">
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
