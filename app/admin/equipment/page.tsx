'use client';

import { useEffect, useState } from 'react';

interface Pending {
  id: string;
  name: string;
  normalized: string;
  proposed_by: string | null;
  gyms_using: number;
}
interface Canonical {
  id: string;
  name: string;
}

export default function EquipmentModeration() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [canonical, setCanonical] = useState<Canonical[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});

  const load = () =>
    fetch('/api/admin/equipment')
      .then((r) => {
        if (r.status === 403) {
          setDenied(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setPending(d.pending ?? []);
          setCanonical(d.canonical ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, action: 'approve' | 'reject' | 'merge') => {
    const mergeInto = action === 'merge' ? mergeTarget[id] : undefined;
    if (action === 'merge' && !mergeInto) return;
    setPending((prev) => prev.filter((p) => p.id !== id));
    await fetch('/api/admin/equipment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, mergeInto }),
    });
  };

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to equipment moderation.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Equipment review</h1>
        <p className="mb-6 text-body text-text-muted">
          Gyms’ proposed equipment, deduped at add-time. Approve into the shared set, reject, or merge into an existing piece.
        </p>

        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            Nothing waiting for review. 🎉
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-surface p-3">
                <p className="text-body font-semibold text-text-primary">{p.name}</p>
                <p className="mb-3 text-caption text-text-muted">
                  by {p.proposed_by ?? 'a gym'} · {p.gyms_using} gym{Number(p.gyms_using) === 1 ? '' : 's'} using
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => act(p.id, 'approve')}
                    className="h-9 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act(p.id, 'reject')}
                    className="h-9 rounded-md border border-border px-4 text-caption text-destructive"
                  >
                    Reject
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <select
                    value={mergeTarget[p.id] ?? ''}
                    onChange={(e) => setMergeTarget((m) => ({ ...m, [p.id]: e.target.value }))}
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
                    onClick={() => act(p.id, 'merge')}
                    disabled={!mergeTarget[p.id]}
                    className="h-9 rounded-md border border-border px-4 text-caption font-semibold text-text-primary disabled:opacity-40"
                  >
                    Merge
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
