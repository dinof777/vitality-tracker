'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LifecycleRow from '@/components/admin/LifecycleRow';
import ScopeSelect, { GLOBAL, type Gym } from '@/components/admin/ScopeSelect';
import { MOVE, SCOPE, plural } from '@/lib/vocabulary';

// Admin lifecycle for the exercise library at both scopes.
//
// Layout rule: this is a LIST first. One scannable line per move; the controls
// (rare, some destructive) open behind a single disclosure. The earlier version
// rendered every action on every row, turning the list into stacked forms.

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

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'global', label: SCOPE.global.badge },
  { value: 'tenant', label: SCOPE.tenant.badge },
  { value: 'archived', label: 'Archived' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export default function ExerciseAdmin() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [list, setList] = useState<AdminExercise[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminExercise | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const scope = filter === 'archived' ? 'all' : filter;
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
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0); // debounce the search
    return () => clearTimeout(t);
  }, [load, q]);

  const shown = useMemo(
    () => (filter === 'archived' ? list.filter((e) => e.archived_at) : list.filter((e) => !e.archived_at)),
    [list, filter],
  );

  const usageLabel = (ex: AdminExercise) => {
    const parts = [
      ex.log_entries ? plural(ex.log_entries, 'logged set') : '',
      ex.routines ? plural(ex.routines, 'routine') : '',
      ex.aliases ? plural(ex.aliases, 'rename') : '',
    ].filter(Boolean);
    return parts.join(' · ');
  };

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setError(null);
    const r = await fetch('/api/admin/exercises', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error ?? 'That did not work.'); // a blocked demotion names the gyms
      return false;
    }
    await load();
    return true;
  };

  const changeScope = async (ex: AdminExercise, next: string) => {
    if (next === GLOBAL) return act(ex.id, 'promote');
    return act(ex.id, 'demote', { tenantId: next });
  };

  const remove = async (ex: AdminExercise) => {
    const used = usageLabel(ex);
    const msg = used
      ? `“${ex.name}” is used by ${used}.\n\nIt will be archived, not deleted — it leaves the ${MOVE.many} you can build from, but everything using it keeps working.`
      : `Delete “${ex.name}”? Nothing uses it, so it will be removed completely.`;
    if (!window.confirm(msg)) return;
    await act(ex.id, 'delete');
  };

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to the {MOVE.one} library admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Moves</h1>
        <p className="mb-4 text-body text-text-muted">
          Every {MOVE.one} in the library. Tap one to edit it, change where it lives, or retire it.
        </p>
        <nav className="mb-5 flex items-center text-caption text-text-muted">
          <Link href="/admin/taxonomy" className="inline-flex h-8 items-center font-semibold text-accent">
            Muscle groups &amp; tags →
          </Link>
        </nav>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${MOVE.many}…`}
          aria-label={`Search ${MOVE.many}`}
          className="mb-3 h-12 w-full rounded-md bg-surface-raised px-4 text-body text-text-primary outline-none placeholder:text-text-faint focus:ring-2 focus:ring-accent"
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`h-9 rounded-full border px-4 text-caption transition ${
                filter === f.value ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-surface p-3 text-caption text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No {MOVE.many} match.
          </p>
        ) : (
          <>
            <p className="mb-2 text-caption text-text-faint">{plural(shown.length, MOVE.one, MOVE.many)}</p>
            <ul className="space-y-2">
              {shown.map((ex) => (
                <LifecycleRow
                  key={ex.id}
                  title={ex.name}
                  badge={
                    ex.archived_at
                      ? { label: 'Archived', tone: 'local' }
                      : ex.is_global
                        ? null
                        : { label: ex.gym_name ?? SCOPE.tenant.badge, tone: 'local' }
                  }
                  meta={[ex.muscle_group, usageLabel(ex) || null].filter(Boolean).join(' · ')}
                  archived={!!ex.archived_at}
                  open={openId === ex.id}
                  onToggle={() => {
                    const next = openId === ex.id ? null : ex.id;
                    setOpenId(next);
                    setDraft(next ? ex : null);
                  }}
                >
                  {ex.archived_at ? (
                    <button
                      type="button"
                      onClick={() => act(ex.id, 'restore')}
                      className="h-12 w-full rounded-md border border-accent text-caption font-semibold text-accent"
                    >
                      Restore to the library
                    </button>
                  ) : (
                    draft && (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-label uppercase text-text-faint">Name</span>
                          <input
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-label uppercase text-text-faint">Muscle group</span>
                          <input
                            value={draft.muscle_group ?? ''}
                            onChange={(e) => setDraft({ ...draft, muscle_group: e.target.value })}
                            placeholder="Must be a shared term"
                            className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary placeholder:text-text-faint"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-label uppercase text-text-faint">Form cue</span>
                          <input
                            value={draft.default_cue ?? ''}
                            onChange={(e) => setDraft({ ...draft, default_cue: e.target.value })}
                            className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
                          />
                        </label>

                        <div className="space-y-3 border-t border-border pt-3">
                          <ScopeSelect
                            value={ex.is_global ? GLOBAL : (ex.tenant_id ?? GLOBAL)}
                            gyms={gyms}
                            onChange={(next) => changeScope(ex, next)}
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  await act(ex.id, 'edit', {
                                    name: draft.name,
                                    muscle_group: draft.muscle_group,
                                    default_cue: draft.default_cue,
                                  })
                                ) {
                                  setOpenId(null);
                                }
                              }}
                              className="h-12 flex-1 rounded-md bg-accent text-caption font-semibold text-on-accent"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(ex)}
                              className="h-12 rounded-md border border-border px-4 text-caption text-destructive"
                            >
                              {usageLabel(ex) ? 'Archive' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </LifecycleRow>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
