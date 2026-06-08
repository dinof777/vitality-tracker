'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DAY_LABELS,
  createRoutine,
  fetchRoutines,
  type RoutineWithExercises,
} from '@/lib/routines';

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [day, setDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => fetchRoutines().then((r) => {
    setRoutines(r);
    setLoading(false);
  });

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await createRoutine(name.trim(), day);
    setName('');
    setDay(null);
    setAdding(false);
    setSaving(false);
    load();
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">TRAIN</p>
          <h1 className="text-h1 text-text-primary">Workouts</h1>
        </div>
        <Link href="/exercises" className="mt-1 text-caption text-text-muted underline">
          Exercises ›
        </Link>
      </header>

      {/* Plan a balanced week (saved as the day-tagged routines below) */}
      <Link
        href="/plan"
        className="mb-2 flex h-16 w-full items-center justify-center gap-2 rounded-lg bg-accent text-label text-on-accent transition-all active:scale-[0.98] active:bg-accent-press"
      >
        📅 PLAN MY WEEK
      </Link>
      <Link
        href="/"
        className="mb-6 flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-label text-text-primary transition-all active:scale-[0.98] active:bg-surface-raised"
      >
        ⚡ QUICK WORKOUT
      </Link>

      <p className="mb-2 text-caption text-text-muted">YOUR ROUTINES</p>
      <div className="space-y-3">
        {routines.map((r) => (
          <Link
            key={r.id}
            href={`/routines/${r.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-transform active:scale-[0.99]"
          >
            <div>
              <p className="text-h3 text-text-primary">{r.name}</p>
              <p className="text-caption text-text-muted nums">
                {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                {r.day_of_week ? ` · ${DAY_LABELS[r.day_of_week]}` : ''}
              </p>
            </div>
            <span className="text-text-faint">›</span>
          </Link>
        ))}

        {!loading && routines.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No routines yet. Build your first blueprint.
          </p>
        )}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        )}
      </div>

      {adding ? (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Routine name (e.g. Lower + Core)"
            className="h-12 w-full rounded-md bg-surface-raised px-3 text-body text-text-primary outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.slice(1).map((label, i) => {
              const value = i + 1;
              const active = day === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDay(active ? null : value)}
                  className={`h-10 w-12 rounded-md text-caption font-semibold transition-colors ${
                    active ? 'bg-accent text-on-accent' : 'bg-surface-raised text-text-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={saving}
              className="h-12 flex-1 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] disabled:opacity-50"
            >
              {saving ? 'CREATING…' : 'CREATE'}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-12 rounded-md border border-border px-4 text-label text-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          + NEW ROUTINE
        </button>
      )}
    </main>
  );
}
