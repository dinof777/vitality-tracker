'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PROMOTION_THRESHOLD } from '@/lib/taxonomy';

interface Pending {
  id: string;
  name: string;
  normalized: string;
  category: string | null;
  status: string;
  is_global: boolean;
  archived_at: string | null;
  proposed_by: string | null;
  gyms_using: number;
  exercises_using: number;
}
interface Canonical {
  id: string;
  name: string;
}
interface Gym {
  id: string;
  name: string;
}

const KINDS = [
  { value: 'muscle_group', label: 'Muscle groups' },
  { value: 'tag', label: 'Tags' },
] as const;

export default function TaxonomyModeration() {
  const [kind, setKind] = useState<'muscle_group' | 'tag'>('muscle_group');
  const [pending, setPending] = useState<Pending[]>([]);
  const [canonical, setCanonical] = useState<Canonical[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const [moveTarget, setMoveTarget] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          // Every live term at every scope — this page manages the whole
          // vocabulary, not only what's awaiting review.
          setPending(d.terms ?? d.pending ?? []);
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

  const act = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setError(null);
    const r = await fetch('/api/admin/taxonomy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      // A blocked demotion names the gyms it would have broken it for.
      setError(j.error ?? 'That did not work.');
      return false;
    }
    await load();
    return true;
  };

  const usageLabel = (p: Pending) =>
    [
      p.exercises_using ? `${p.exercises_using} exercise${Number(p.exercises_using) === 1 ? '' : 's'}` : '',
      p.gyms_using ? `${p.gyms_using} gym${Number(p.gyms_using) === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

  const remove = async (p: Pending) => {
    const used = usageLabel(p);
    const msg = used
      ? `“${p.name}” is used by ${used}.\n\nIt will be archived, not deleted — it leaves the pickers but every exercise using it keeps its tag.`
      : `Delete “${p.name}”? Nothing uses it, so it will be removed completely.`;
    if (!window.confirm(msg)) return;
    await act(p.id, 'delete');
  };

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to vocabulary moderation.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Vocabulary review</h1>
        <p className="mb-4 text-body text-text-muted">
          Terms gyms proposed, deduped at add-time and ranked by how many gyms landed on each. Anything{' '}
          {PROMOTION_THRESHOLD} gyms proposed independently has already promoted itself — what’s left is the tail.
        </p>
        <p className="mb-6 text-caption text-text-muted">
          <Link href="/admin/equipment" className="text-accent">
            Equipment review →
          </Link>
        </p>

        <div className="mb-5 flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`h-9 rounded-full border px-4 text-caption transition ${
                kind === k.value
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-border bg-surface text-text-muted'
              }`}
            >
              {k.label}
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
        ) : pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No terms yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li
                key={p.id}
                className={`rounded-lg border p-3 ${
                  p.archived_at ? 'border-dashed border-border bg-background' : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  {renaming?.id === p.id ? (
                    <input
                      value={renaming.name}
                      onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                      aria-label={`Rename ${p.name}`}
                      className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-body text-text-primary"
                    />
                  ) : (
                    <p
                      className={`text-body font-semibold ${
                        p.archived_at ? 'text-text-faint line-through' : 'text-text-primary'
                      }`}
                    >
                      {p.name}
                    </p>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-caption ${
                      p.is_global ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'
                    }`}
                  >
                    {p.is_global ? 'Shared' : (p.proposed_by ?? 'Gym')}
                  </span>
                </div>
                <p className="mb-3 text-caption text-text-muted">
                  {[p.archived_at ? 'Archived' : null, p.category, usageLabel(p) || 'unused']
                    .filter(Boolean)
                    .join(' · ')}
                </p>

                {renaming?.id === p.id ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (await act(p.id, 'rename', { name: renaming.name })) setRenaming(null);
                      }}
                      className="h-9 flex-1 rounded-md bg-accent text-caption font-semibold text-on-accent"
                    >
                      Save name
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenaming(null)}
                      className="h-9 flex-1 rounded-md border border-border text-caption text-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                <div className="flex flex-wrap gap-2">
                  {p.archived_at ? (
                    <button
                      type="button"
                      onClick={() => act(p.id, 'restore')}
                      className="h-9 rounded-md border border-accent px-4 text-caption font-semibold text-accent"
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setRenaming({ id: p.id, name: p.name })}
                        className="h-9 rounded-md border border-border px-4 text-caption text-text-primary"
                      >
                        Rename
                      </button>
                      {!p.is_global && (
                        <button
                          type="button"
                          onClick={() => act(p.id, 'promote')}
                          className="h-9 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent"
                        >
                          ↑ Make shared
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="h-9 rounded-md border border-border px-4 text-caption text-destructive"
                      >
                        {usageLabel(p) ? 'Archive' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>

                {/* Demote: hand a shared term to one gym. Blocked if others rely on it. */}
                {p.is_global && !p.archived_at && (
                  <div className="mt-2 flex gap-2">
                    <select
                      value={moveTarget[p.id] ?? ''}
                      onChange={(e) => setMoveTarget((m) => ({ ...m, [p.id]: e.target.value }))}
                      aria-label={`Give ${p.name} to a gym`}
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
                      disabled={!moveTarget[p.id]}
                      onClick={() => act(p.id, 'demote', { tenantId: moveTarget[p.id] })}
                      className="h-9 rounded-md border border-border px-4 text-caption font-semibold text-text-primary disabled:opacity-40"
                    >
                      Move
                    </button>
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <select
                    value={mergeTarget[p.id] ?? ''}
                    onChange={(e) => setMergeTarget((m) => ({ ...m, [p.id]: e.target.value }))}
                    aria-label={`Merge ${p.name} into`}
                    className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-caption text-text-primary"
                  >
                    <option value="">Merge into…</option>
                    {canonical.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => act(p.id, 'merge', { mergeInto: mergeTarget[p.id] })}
                    disabled={!mergeTarget[p.id]}
                    className="h-9 rounded-md border border-border px-4 text-caption font-semibold text-text-primary disabled:opacity-40"
                  >
                    Merge
                  </button>
                </div>
                <p className="mt-2 text-caption text-text-faint">
                  Merging rewrites every exercise using “{p.name}” onto the target — nothing is orphaned.
                </p>
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
