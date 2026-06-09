'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  contact: string | null;
  shares: number;
  opens: number;
  completions: number;
}

export default function Clients() {
  const [list, setList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch('/api/tenant/clients')
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => setList(d.clients ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/tenant/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim() }),
      });
      setName('');
      setContact('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Client) => {
    if (!window.confirm(`Remove ${c.name}? Their shares stay live but un-linked.`)) return;
    setList((prev) => prev.filter((x) => x.id !== c.id));
    await fetch(`/api/tenant/clients?id=${c.id}`, { method: 'DELETE' });
  };

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Your clients</h1>
        <p className="mb-6 text-body text-text-muted">
          Add clients, then assign a share to them when you build a workout — their imports &amp; completions roll up here.
        </p>

        {/* Add */}
        <div className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client name"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
          />
          <div className="flex gap-2">
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone (optional)"
              className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
            />
            <button
              type="button"
              onClick={add}
              disabled={saving || !name.trim()}
              className="h-11 shrink-0 rounded-md bg-accent px-4 text-label text-on-accent disabled:opacity-50"
            >
              ADD
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            No clients yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
                <Link href={`/dashboard/clients/${c.id}`} className="min-w-0 flex-1 active:opacity-70">
                  <p className="truncate text-body font-semibold text-text-primary">{c.name}</p>
                  <p className="truncate text-caption text-text-muted">{c.contact ?? '—'}</p>
                  {(Number(c.shares) > 0 || Number(c.completions) > 0) && (
                    <p className="mt-0.5 text-caption text-accent nums">
                      {c.shares} share{Number(c.shares) === 1 ? '' : 's'} · {c.opens} open{Number(c.opens) === 1 ? '' : 's'} · ✓ {c.completions} done
                    </p>
                  )}
                </Link>
                <button type="button" onClick={() => remove(c)} className="shrink-0 text-caption text-destructive">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
