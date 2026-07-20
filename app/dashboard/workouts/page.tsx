'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Workout {
  id: string;
  name: string;
  created_at: string;
  moves: number;
  shares: number;
  opens: number;
  completions: number;
}

export default function SavedWorkouts() {
  const [list, setList] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/tenant/workouts')
      .then((r) => (r.ok ? r.json() : { workouts: [] }))
      .then((d) => setList(d.workouts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const remove = async (w: Workout) => {
    if (!window.confirm(`Delete “${w.name}”? Links already shared keep working.`)) return;
    setList((prev) => prev.filter((x) => x.id !== w.id));
    await fetch(`/api/tenant/workouts?id=${w.id}`, { method: 'DELETE' });
  };

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Your circuits</h1>
        <p className="mb-6 text-body text-text-muted">
          Saved workouts you can re-share, print, or push to SyncroFit any time.
        </p>

        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-surface" />
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="mb-3 text-body text-text-muted">No saved circuits yet.</p>
            <Link href="/dashboard" className="text-caption text-accent">
              Build one from your gym page ›
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
                <Link href={`/dashboard/workouts/${w.id}`} className="min-w-0 flex-1 active:opacity-70">
                  <p className="truncate text-body font-semibold text-text-primary">{w.name}</p>
                  <p className="truncate text-caption text-text-muted nums">
                    {w.moves} move{Number(w.moves) === 1 ? '' : 's'}
                    {Number(w.shares) > 0 &&
                      ` · ${w.shares} share${Number(w.shares) === 1 ? '' : 's'} · ${w.opens} open${Number(w.opens) === 1 ? '' : 's'}`}
                    {Number(w.completions) > 0 && ` · ✓ ${w.completions} done`}
                  </p>
                </Link>
                <button type="button" onClick={() => remove(w)} className="shrink-0 text-caption text-destructive">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
