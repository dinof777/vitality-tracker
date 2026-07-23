'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LifecycleRow from '@/components/admin/LifecycleRow';
import { plural } from '@/lib/vocabulary';

// Admin lifecycle for the equipment catalog. Same layout contract as
// /admin/exercises and /admin/taxonomy: a scannable list, controls behind one
// disclosure per row.
//
// Scope note: unlike exercises/taxonomy, equipment has no promote/demote or
// rename/archive path today (see equipment_catalog — no archived_at column,
// no rename endpoint). The panel below only wires up what the API actually
// supports: approve, reject, and merge. Closing that lifecycle-parity gap is
// a separate call for Dino to make.

interface EquipmentItem {
  id: string;
  name: string;
  status: 'core' | 'approved' | 'pending';
  proposed_by: string | null;
  gyms_using: number;
}
interface Canonical {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<string, string> = { core: 'Core', approved: 'Approved' };

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'review', label: 'Needs review' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

export default function EquipmentAdmin() {
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [canonical, setCanonical] = useState<Canonical[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mergeInto, setMergeInto] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetch('/api/admin/equipment')
      .then((r) => {
        if (r.status === 403) {
          setDenied(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setItems(d.items ?? []);
          setCanonical(d.canonical ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(
    () => (filter === 'review' ? items.filter((i) => i.status === 'pending') : items),
    [items, filter],
  );

  const reviewCount = items.filter((i) => i.status === 'pending').length;

  const usageLabel = (e: EquipmentItem) => (e.gyms_using ? `${plural(e.gyms_using, 'gym')} using` : 'No gyms using it yet');

  const meta = (e: EquipmentItem) =>
    e.status === 'pending'
      ? [`Proposed by ${e.proposed_by ?? 'a gym'}`, usageLabel(e)].filter(Boolean).join(' · ')
      : [STATUS_LABEL[e.status], usageLabel(e)].filter(Boolean).join(' · ');

  const act = async (id: string, action: 'approve' | 'reject' | 'merge', extra: Record<string, unknown> = {}) => {
    setError(null);
    const r = await fetch('/api/admin/equipment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j.error ?? 'That did not work.');
      return false;
    }
    await load();
    return true;
  };

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    setMergeInto('');
    setMergeOpen(false);
  };

  const renderMerge = (e: EquipmentItem, divider: boolean) => (
    <div className={divider ? 'space-y-3 border-t border-border pt-3' : 'space-y-3'}>
      {mergeOpen ? (
        <label className="block">
          <span className="mb-1 block text-label uppercase text-text-faint">Merge into</span>
          <div className="flex gap-2">
            <select
              value={mergeInto}
              onChange={(ev) => setMergeInto(ev.target.value)}
              className="h-12 flex-1 rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
            >
              <option value="">Keep separate</option>
              {canonical
                .filter((c) => c.id !== e.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!mergeInto}
              onClick={() => act(e.id, 'merge', { mergeInto })}
              className="h-12 rounded-md border border-border px-4 text-caption font-semibold text-text-primary disabled:opacity-40"
            >
              Merge
            </button>
          </div>
          <span className="mt-1 block text-caption text-text-faint">
            Re-points every gym using “{e.name}” to the target — nothing is orphaned.
          </span>
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setMergeOpen(true)}
          className="flex h-11 items-center text-caption font-semibold text-text-muted"
        >
          Merge into another piece…
        </button>
      )}
    </div>
  );

  if (denied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <p className="text-body text-text-muted">You don’t have access to equipment admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <p className="text-label text-accent">ADMIN</p>
        <h1 className="mb-1 text-h1 text-text-primary">Equipment</h1>
        <p className="mb-4 text-body text-text-muted">
          Every piece in the shared catalog, plus what gyms have proposed. Tap one to approve, reject, or merge it
          into another piece.
        </p>
        <nav className="mb-5 flex flex-wrap items-center gap-x-4 text-caption text-text-muted">
          <Link href="/admin/exercises" className="inline-flex h-8 items-center font-semibold text-accent">
            Exercises →
          </Link>
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
          <div className="mx-auto w-full max-w-2xl">
            <p className="mb-2 text-caption text-text-faint">
              {plural(shown.length, 'piece')}
              {filter === 'all' && reviewCount > 0 && ` · ${reviewCount} awaiting review`}
            </p>
            <ul className="space-y-2">
              {shown.map((e) => (
                <LifecycleRow
                  key={e.id}
                  title={e.name}
                  badge={e.status === 'pending' ? { label: 'Pending review', tone: 'local' } : null}
                  meta={meta(e)}
                  flagged={e.status === 'pending'}
                  open={openId === e.id}
                  onToggle={() => toggle(e.id)}
                >
                  {e.status === 'pending' ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => act(e.id, 'approve')}
                          className="h-12 flex-1 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => act(e.id, 'reject')}
                          className="h-12 rounded-md border border-border px-5 text-caption text-destructive"
                        >
                          Reject
                        </button>
                      </div>
                      {renderMerge(e, true)}
                    </div>
                  ) : (
                    renderMerge(e, false)
                  )}
                </LifecycleRow>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
