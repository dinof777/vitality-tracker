'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DAY_LABELS,
  createRoutine,
  loadRoutines,
  type LocalRoutine,
} from '@/lib/routine-store';

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<LocalRoutine[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => setRoutines(loadRoutines()), []);

  const add = () => {
    if (!name.trim()) return;
    createRoutine(name.trim(), day);
    setRoutines(loadRoutines());
    setName('');
    setDay(null);
    setAdding(false);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-label text-accent">BLUEPRINTS</p>
        <h1 className="text-h1 text-text-primary">Routines</h1>
        <p className="text-body text-text-muted">Pre-program your splits, then start in a tap.</p>
      </header>

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
                {r.dayOfWeek ? ` · ${DAY_LABELS[r.dayOfWeek]}` : ''}
              </p>
            </div>
            <span className="text-text-faint">›</span>
          </Link>
        ))}

        {routines.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No routines yet. Build your first blueprint.
          </p>
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
              className="h-12 flex-1 rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
            >
              CREATE
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
