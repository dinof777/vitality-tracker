'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LifecycleRow from '@/components/admin/LifecycleRow';
import ScopeSelect, { GLOBAL, type Gym } from '@/components/admin/ScopeSelect';
import { PROMOTION_THRESHOLD } from '@/lib/taxonomy';
import { FIELD_LABEL_PLURAL, MOVE, SCOPE, plural, tagCategoryLabel } from '@/lib/vocabulary';

// Admin lifecycle for the vocabulary — muscle groups and tags — at both scopes.
// Same layout contract as /admin/exercises: a scannable list, controls behind
// one disclosure per row.

interface Term {
  id: string;
  name: string;
  normalized: string;
  category: string | null;
  status: string;
  is_global: boolean;
  archived_at: string | null;
  proposed_by: string | null;
  proposed_by_id: string | null;
  gyms_using: number;
  exercises_using: number;
}
interface Canonical {
  id: string;
  name: string;
}

const KINDS = [
  { value: 'muscle_group', label: FIELD_LABEL_PLURAL.muscle_group },
  { value: 'tag', label: FIELD_LABEL_PLURAL.tag },
] as const;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'Needs review' },
  { value: 'archived', label: 'Archived' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export default function VocabularyAdmin() {
  const [kind, setKind] = useState<'muscle_group' | 'tag'>('muscle_group');
  const [filter, setFilter] = useState<Filter>('all');
  const [terms, setTerms] = useState<Term[]>([]);
  const [canonical, setCanonical] = useState<Canonical[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [mergeInto, setMergeInto] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetch(`/api/admin/taxonomy?kind=${kind}`)
      .then((r) => {
        if (r.status === 403) {
          setDenied(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setTerms(d.terms ?? []);
          setCanonical(d.canonical ?? []);
          setGyms(d.gyms ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    if (filter === 'archived') return terms.filter((t) => t.archived_at);
    const live = terms.filter((t) => !t.archived_at);
    return filter === 'review' ? live.filter((t) => t.status === 'pending') : live;
  }, [terms, filter]);

  const reviewCount = terms.filter((t) => !t.archived_at && t.status === 'pending').length;

  const usageLabel = (t: Term) =>
    [
      t.exercises_using ? plural(t.exercises_using, MOVE.one, MOVE.many) : '',
      t.gyms_using ? plural(t.gyms_using, 'gym') : '',
    ]
      .filter(Boolean)
      .join(' · ');

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setError(null);
    const r = await fetch('/api/admin/taxonomy', {
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

  const changeScope = async (t: Term, next: string) => {
    if (next === GLOBAL) return act(t.id, 'promote');
    return act(t.id, 'demote', { tenantId: next });
  };

  const remove = async (t: Term) => {
    const used = usageLabel(t);
    const msg = used
      ? `“${t.name}” is used by ${used}.\n\nIt will be archived, not deleted — it leaves the pickers but every ${MOVE.one} using it keeps its tag.`
      : `Delete “${t.name}”? Nothing uses it, so it will be removed completely.`;
    if (!window.confirm(msg)) return;
    await act(t.id, 'delete');
  };

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to vocabulary admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Muscle groups &amp; tags</h1>
        <p className="mb-4 text-body text-text-muted">
          The words gyms can file a {MOVE.one} under. Tap one to rename it, change where it lives, merge or retire it.
        </p>
        <nav className="mb-5 flex flex-wrap items-center gap-x-4 text-caption text-text-muted">
          <Link href="/admin/exercises" className="inline-flex h-8 items-center font-semibold text-accent">
            Moves →
          </Link>
          <Link href="/admin/equipment" className="inline-flex h-8 items-center font-semibold text-accent">
            Equipment →
          </Link>
        </nav>

        <div className="mb-3 flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => {
                setKind(k.value);
                setOpenId(null);
              }}
              className={`h-9 rounded-full border px-4 text-caption transition ${
                kind === k.value ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`h-9 rounded-full border px-4 text-caption transition ${
                filter === f.value
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-border bg-surface text-text-muted'
              }`}
            >
              {f.label}
              {f.value === 'review' && reviewCount > 0 && (
                <span className="ml-2 text-text-faint">{reviewCount}</span>
              )}
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
            {filter === 'review' ? 'Nothing waiting for review. 🎉' : 'Nothing here.'}
          </p>
        ) : (
          <>
            <p className="mb-2 text-caption text-text-faint">
              {plural(shown.length, 'term')}
              {filter === 'all' && reviewCount > 0 && ` · ${reviewCount} awaiting review`}
            </p>
            <ul className="space-y-2">
              {shown.map((t) => (
                <LifecycleRow
                  key={t.id}
                  title={t.name}
                  badge={
                    t.archived_at
                      ? { label: 'Archived', tone: 'local' }
                      : t.is_global
                        ? null
                        : { label: t.proposed_by ?? SCOPE.tenant.badge, tone: 'local' }
                  }
                  meta={
                    [
                      t.status === 'pending' ? 'Awaiting review' : null,
                      tagCategoryLabel(t.category),
                      usageLabel(t) || null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  }
                  archived={!!t.archived_at}
                  flagged={t.status === 'pending' && !t.archived_at}
                  open={openId === t.id}
                  onToggle={() => {
                    const next = openId === t.id ? null : t.id;
                    setOpenId(next);
                    setDraftName(next ? t.name : '');
                    setMergeInto('');
                    setMergeOpen(false);
                  }}
                >
                  {t.archived_at ? (
                    <button
                      type="button"
                      onClick={() => act(t.id, 'restore')}
                      className="h-12 w-full rounded-md border border-accent text-caption font-semibold text-accent"
                    >
                      Restore
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-label uppercase text-text-faint">Name</span>
                        <div className="flex gap-2">
                          <input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="h-12 flex-1 rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
                          />
                          <button
                            type="button"
                            disabled={!draftName.trim() || draftName === t.name}
                            onClick={() => act(t.id, 'rename', { name: draftName })}
                            className="h-12 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent disabled:opacity-40"
                          >
                            Rename
                          </button>
                        </div>
                      </label>

                      <ScopeSelect
                        value={t.is_global ? GLOBAL : (t.proposed_by_id ?? GLOBAL)}
                        gyms={gyms}
                        onChange={(next) => changeScope(t, next)}
                      />

                      <div className="space-y-3 border-t border-border pt-3">
                        {mergeOpen ? (
                          <label className="block">
                            <span className="mb-1 block text-label uppercase text-text-faint">Merge into</span>
                            <div className="flex gap-2">
                              <select
                                value={mergeInto}
                                onChange={(e) => setMergeInto(e.target.value)}
                                className="h-12 flex-1 rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
                              >
                                <option value="">Keep separate</option>
                                {canonical
                                  .filter((c) => c.id !== t.id)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                disabled={!mergeInto}
                                onClick={() => act(t.id, 'merge', { mergeInto })}
                                className="h-12 rounded-md border border-border px-4 text-caption font-semibold text-text-primary disabled:opacity-40"
                              >
                                Merge
                              </button>
                            </div>
                            <span className="mt-1 block text-caption text-text-faint">
                              Rewrites every {MOVE.one} using “{t.name}” onto the target — nothing is orphaned.
                            </span>
                          </label>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setMergeOpen(true)}
                            className="flex h-11 items-center text-caption font-semibold text-text-muted"
                          >
                            Merge into another term…
                          </button>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => remove(t)}
                            className="h-12 rounded-md border border-border px-5 text-caption text-destructive"
                          >
                            {usageLabel(t) ? 'Archive' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </LifecycleRow>
              ))}
            </ul>
            {filter !== 'archived' && (
              <p className="mt-4 text-caption text-text-faint">
                A term {PROMOTION_THRESHOLD} gyms add independently promotes itself to the shared library.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
