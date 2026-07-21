'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

// Admin lifecycle for the exercise library at both scopes. The one thing this
// page can do that the trainer dashboard can't: move a move between "shared with
// every gym" and "belongs to one gym".

interface AdminExercise {
  id: string;
  name: string;
  muscle_group: string | null;
  default_cue: string | null;
  is_global: boolean;
  tenant_id: string | null;
  gym_name: string | null;
  archived_at: string | null;
  routines: number;
  log_entries: number;
  aliases: number;
}
interface Gym {
  id: string;
  name: string;
}

const SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'global', label: 'Shared library' },
  { value: 'tenant', label: 'Gym-owned' },
] as const;

export default function ExerciseAdmin() {
  const [scope, setScope] = useState<'all' | 'global' | 'tenant'>('all');
  const [q, setQ] = useState('');
  const [list, setList] = useState<AdminExercise[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AdminExercise | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return fetch(`/api/admin/exercises?scope=${scope}&q=${encodeURIComponent(q)}`)
      .then((r) => {
        if (r.status === 403) {
          setDenied(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setList(d.exercises ?? []);
          setGyms(d.gyms ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scope, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0); // debounce the search
    return () => clearTimeout(t);
  }, [load, q]);

  const usage = (ex: AdminExercise) => ex.routines + ex.log_entries + ex.aliases;

  const usageLabel = (ex: AdminExercise) =>
    [
      ex.log_entries ? `${ex.log_entries} logged` : '',
      ex.routines ? `${ex.routines} routine${ex.routines === 1 ? '' : 's'}` : '',
      ex.aliases ? `${ex.aliases} rename${ex.aliases === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setError(null);
    const r = await fetch('/api/admin/exercises', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      // A blocked demotion explains who it would have broken it for.
      setError(j.error ?? 'That did not work.');
      return false;
    }
    await load();
    return true;
  };

  const remove = async (ex: AdminExercise) => {
    const msg = usage(ex)
      ? `“${ex.name}” is used by ${usageLabel(ex)}.\n\nIt will be archived, not deleted — it leaves the library but everything using it keeps working.`
      : `Delete “${ex.name}”? Nothing uses it, so it will be removed completely.`;
    if (!window.confirm(msg)) return;
    await act(ex.id, 'delete');
  };

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to the exercise library admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Exercise library</h1>
        <p className="mb-4 text-body text-text-muted">
          Edit any move, and decide where it lives — shared with every gym, or owned by one.
        </p>
        <p className="mb-5 text-caption text-text-muted">
          <Link href="/admin/taxonomy" className="text-accent">
            Vocabulary review →
          </Link>
        </p>

        <div className="mb-3 flex gap-2">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={`h-9 rounded-full border px-4 text-caption transition ${
                scope === s.value ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search moves…"
          aria-label="Search moves"
          className="mb-4 h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
        />

        {error && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-surface p-3 text-caption text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No moves match.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((ex) => (
              <li
                key={ex.id}
                className={`rounded-lg border p-3 ${
                  ex.archived_at ? 'border-dashed border-border bg-background' : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`truncate text-body font-semibold ${
                      ex.archived_at ? 'text-text-faint line-through' : 'text-text-primary'
                    }`}
                  >
                    {ex.name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-caption ${
                      ex.is_global ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'
                    }`}
                  >
                    {ex.is_global ? 'Shared' : (ex.gym_name ?? 'Gym')}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-caption text-text-muted">
                  {[ex.archived_at ? 'Archived' : null, ex.muscle_group, usageLabel(ex)].filter(Boolean).join(' · ') ||
                    'Unused'}
                </p>

                {editing?.id === ex.id ? (
                  <div className="mt-3 space-y-2">
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      aria-label="Name"
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary"
                    />
                    <input
                      value={editing.muscle_group ?? ''}
                      onChange={(e) => setEditing({ ...editing, muscle_group: e.target.value })}
                      placeholder="Muscle group (must be a shared term)"
                      aria-label="Muscle group"
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
                    />
                    <input
                      value={editing.default_cue ?? ''}
                      onChange={(e) => setEditing({ ...editing, default_cue: e.target.value })}
                      placeholder="Form cue"
                      aria-label="Form cue"
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await act(ex.id, 'edit', {
                            name: editing.name,
                            muscle_group: editing.muscle_group,
                            default_cue: editing.default_cue,
                          });
                          if (ok) setEditing(null);
                        }}
                        className="h-9 flex-1 rounded-md bg-accent text-caption font-semibold text-on-accent"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-9 flex-1 rounded-md border border-border text-caption text-text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ex.archived_at ? (
                        <button
                          type="button"
                          onClick={() => act(ex.id, 'restore')}
                          className="h-9 rounded-md border border-accent px-3 text-caption font-semibold text-accent"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(ex)}
                            className="h-9 rounded-md border border-border px-3 text-caption text-text-primary"
                          >
                            Edit
                          </button>
                          {!ex.is_global && (
                            <button
                              type="button"
                              onClick={() => act(ex.id, 'promote')}
                              className="h-9 rounded-md border border-accent px-3 text-caption font-semibold text-accent"
                            >
                              ↑ Make shared
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => remove(ex)}
                            className="h-9 rounded-md border border-border px-3 text-caption text-destructive"
                          >
                            {usage(ex) ? 'Archive' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Demote: hand a shared move to one gym. Blocked if others rely on it. */}
                    {ex.is_global && !ex.archived_at && (
                      <div className="mt-2 flex gap-2">
                        <select
                          value={moveTarget[ex.id] ?? ''}
                          onChange={(e) => setMoveTarget((m) => ({ ...m, [ex.id]: e.target.value }))}
                          aria-label={`Give ${ex.name} to a gym`}
                          className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-caption text-text-primary"
                        >
                          <option value="">↓ Give to one gym…</option>
                          {gyms.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!moveTarget[ex.id]}
                          onClick={() => act(ex.id, 'demote', { tenantId: moveTarget[ex.id] })}
                          className="h-9 rounded-md border border-border px-3 text-caption font-semibold text-text-primary disabled:opacity-40"
                        >
                          Move
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
