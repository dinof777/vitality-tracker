'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Equipment, Exercise } from '@/lib/database.types';
import ExerciseBrowseList from '@/components/workout/ExerciseBrowseList';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';
import { GLOBAL, type Gym } from '@/components/admin/ScopeSelect';
import { EXERCISE, SCOPE, plural } from '@/lib/vocabulary';

// Admin lifecycle for the exercise library at both scopes.
//
// This reuses the same illustrated browse view trainees get on `/exercises`
// (`ExerciseBrowseList` — search + equipment-grouped rows) rather than a
// separate plain management list: one way to render an exercise, two action
// sets. Tapping a row opens the same `ExerciseDetailSheet` everyone else
// gets, extended with an admin-only `manage` block (edit fields, `ScopeSelect`,
// archive/delete/restore) — see `ExerciseDetailSheet`'s `manage` prop.
//
// What stays page-local (Elena's line): the scope/archived filter chips, the
// `/api/admin/exercises` fetch + search debounce, and the edit/scope/delete
// handlers. Only the RENDERING is shared.

interface AdminExercise {
  id: string;
  name: string;
  muscle_group: string | null;
  default_cue: string | null;
  equipment: Equipment | null;
  image_url: string | null;
  tags: string[];
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

interface Draft {
  name: string;
  muscle_group: string;
  default_cue: string;
}

export default function ExerciseAdmin() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [list, setList] = useState<AdminExercise[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

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

  // The row currently open in the sheet — looked up live from `list` (not
  // `shown`) so a scope change keeps it open with the fresh value, the way
  // the old inline disclosure did.
  const openExercise = openId ? (list.find((e) => e.id === openId) ?? null) : null;

  const usageLabel = (ex: AdminExercise) => {
    const parts = [
      ex.log_entries ? plural(ex.log_entries, 'logged set') : '',
      ex.routines ? plural(ex.routines, 'routine') : '',
      ex.aliases ? plural(ex.aliases, 'rename') : '',
    ].filter(Boolean);
    return parts.join(' · ');
  };

  const openRow = (ex: AdminExercise) => {
    setOpenId(ex.id);
    setDraft({ name: ex.name, muscle_group: ex.muscle_group ?? '', default_cue: ex.default_cue ?? '' });
  };

  const closeSheet = () => {
    setOpenId(null);
    setDraft(null);
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
      ? `“${ex.name}” is used by ${used}.\n\nIt will be archived, not deleted — it leaves the ${EXERCISE.many} you can build from, but everything using it keeps working.`
      : `Delete “${ex.name}”? Nothing uses it, so it will be removed completely.`;
    if (!window.confirm(msg)) return false;
    return act(ex.id, 'delete');
  };

  const badgeFor = (ex: AdminExercise): string | null => {
    if (ex.archived_at) return 'Archived';
    if (ex.is_global) return null;
    return ex.gym_name ?? SCOPE.tenant.badge;
  };

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to the {EXERCISE.one} library admin.</p>
      </div>
    );
  }

  // Draft-aware preview so the sheet's illustration/title reflect live edits,
  // not just the last-saved row.
  const previewExercise: Exercise | null =
    openExercise && draft
      ? {
          id: openExercise.id,
          name: draft.name,
          muscle_group: draft.muscle_group || null,
          default_cue: draft.default_cue || null,
          equipment: openExercise.equipment,
          image_url: openExercise.image_url,
          created_at: '',
          tags: openExercise.tags,
          tenant_id: openExercise.tenant_id,
          is_global: openExercise.is_global,
        }
      : null;

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Exercises</h1>
        <p className="mb-4 text-body text-text-muted">
          Every {EXERCISE.one} in the library. Tap one to edit it, change where it lives, or retire it.
        </p>
        <nav className="mb-5 flex items-center text-caption text-text-muted">
          <Link href="/admin/taxonomy" className="inline-flex h-8 items-center font-semibold text-accent">
            Muscle groups &amp; tags →
          </Link>
        </nav>

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
        ) : (
          <>
            {shown.length > 0 && (
              <p className="mb-2 text-caption text-text-faint">{plural(shown.length, EXERCISE.one, EXERCISE.many)}</p>
            )}
            <ExerciseBrowseList
              items={shown}
              query={q}
              onQueryChange={setQ}
              onSelect={openRow}
              renderDetail={(ex) => [ex.muscle_group, usageLabel(ex) || null].filter(Boolean).join(' · ') || null}
              renderTrailing={(ex) => {
                const badge = badgeFor(ex);
                // Every badge here is the exception-to-the-default kind
                // (gym-owned or archived) — see DESIGN.md §6 on reserving
                // the badge for that, rather than the shared/global case.
                if (!badge) return null;
                return (
                  <span className="shrink-0 rounded-full bg-surface-raised px-2 py-1 text-caption text-text-muted">
                    {badge}
                  </span>
                );
              }}
              emptyLabel={() => `No ${EXERCISE.many} match.`}
            />
          </>
        )}
      </main>

      {openExercise && draft && previewExercise && (
        <ExerciseDetailSheet
          exercise={previewExercise}
          onClose={closeSheet}
          manage={{
            name: draft.name,
            muscleGroup: draft.muscle_group,
            defaultCue: draft.default_cue,
            onFieldChange: (field, value) => setDraft((d) => (d ? { ...d, [field]: value } : d)),
            scope: openExercise.is_global ? GLOBAL : (openExercise.tenant_id ?? GLOBAL),
            gyms,
            onScopeChange: (next) => {
              void changeScope(openExercise, next);
            },
            usageLabel: usageLabel(openExercise),
            onSave: async () => {
              const ok = await act(openExercise.id, 'edit', {
                name: draft.name,
                muscle_group: draft.muscle_group,
                default_cue: draft.default_cue,
              });
              if (ok) closeSheet();
            },
            archived: !!openExercise.archived_at,
            onArchiveOrDelete: () => {
              void remove(openExercise).then((ok) => ok && closeSheet());
            },
            onRestore: () => {
              void act(openExercise.id, 'restore').then((ok) => ok && closeSheet());
            },
          }}
        />
      )}
    </div>
  );
}
