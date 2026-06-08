'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DAY_LABELS,
  createRoutine,
  deleteRoutine,
  fetchRoutines,
  setRoutineFavorite,
  type RoutineWithExercises,
} from '@/lib/routines';

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [day, setDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [engagement, setEngagement] = useState<Record<string, { imports: number; completions: number }>>({});

  const load = () =>
    fetchRoutines().then((r) => {
      setRoutines(r);
      setLoading(false);
    });

  useEffect(() => {
    load();
    fetch('/api/syncrofit/engagement')
      .then((r) => (r.ok ? r.json() : {}))
      .then((m) => setEngagement(m ?? {}))
      .catch(() => {});
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

  const toggleFav = (r: RoutineWithExercises) => {
    const next = !r.favorite;
    setRoutines((prev) => prev.map((x) => (x.id === r.id ? { ...x, favorite: next } : x)));
    void setRoutineFavorite(r.id, next);
  };

  const remove = (r: RoutineWithExercises) => {
    if (!window.confirm(`Delete “${r.name}”? This can’t be undone.`)) return;
    setRoutines((prev) => prev.filter((x) => x.id !== r.id));
    void deleteRoutine(r.id);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">BLUEPRINTS</p>
          <h1 className="text-h1 text-text-primary">Routines</h1>
          <p className="text-body text-text-muted">★ a routine to pin it to your Profile.</p>
        </div>
        <Link href="/exercises" className="mt-1 shrink-0 text-caption text-text-muted underline">
          Build from exercises ›
        </Link>
      </header>

      <div className="space-y-3">
        {routines.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 pr-3"
          >
            <Link href={`/routines/${r.id}`} className="flex min-w-0 flex-1 items-center justify-between p-2 active:opacity-70">
              <div className="min-w-0">
                <p className="truncate text-h3 text-text-primary">{r.name}</p>
                <p className="text-caption text-text-muted nums">
                  {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                  {r.day_of_week ? ` · ${DAY_LABELS[r.day_of_week]}` : ''}
                </p>
                {engagement[r.id] && (engagement[r.id].imports > 0 || engagement[r.id].completions > 0) && (
                  <p className="mt-0.5 text-caption text-accent nums">
                    ↓ {engagement[r.id].imports} import{engagement[r.id].imports === 1 ? '' : 's'} · ✓ {engagement[r.id].completions} done
                  </p>
                )}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => toggleFav(r)}
              aria-label={r.favorite ? 'Unfavorite' : 'Favorite'}
              aria-pressed={r.favorite}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl ${
                r.favorite ? 'text-accent' : 'text-text-faint'
              }`}
            >
              {r.favorite ? '★' : '☆'}
            </button>
            <button
              type="button"
              onClick={() => remove(r)}
              aria-label={`Delete ${r.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-text-faint active:text-red-500"
            >
              🗑
            </button>
          </div>
        ))}

        {!loading && routines.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No routines yet. Build one from the Exercises tab, or start fresh below.
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
