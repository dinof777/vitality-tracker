'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Equip {
  id: string;
  name: string;
  status: string;
  is_core: boolean;
  added: boolean;
}
interface Suggestion {
  id: string;
  name: string;
}

export default function GymEquipment() {
  const [list, setList] = useState<Equip[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () =>
    fetch('/api/tenant/equipment')
      .then((r) => (r.ok ? r.json() : { equipment: [] }))
      .then((d) => setList(d.equipment ?? []))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setMsg(null);
    setSuggestion(null);
    try {
      const r = await fetch('/api/tenant/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const j = await r.json();
      if (r.status === 409 && j.duplicate) {
        setSuggestion(j.duplicate);
      } else if (r.ok) {
        setName('');
        setMsg('Added — your new piece is also queued for global review.');
        await load();
      } else {
        setMsg(j.error ?? 'Could not add.');
      }
    } finally {
      setBusy(false);
    }
  };

  const linkExisting = async (catalogId: string) => {
    setBusy(true);
    try {
      await fetch('/api/tenant/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogId }),
      });
      setName('');
      setSuggestion(null);
      setMsg(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (catalogId: string) => {
    setList((prev) => prev.filter((e) => e.id !== catalogId));
    await fetch(`/api/tenant/equipment?catalogId=${catalogId}`, { method: 'DELETE' });
  };

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Your equipment</h1>
        <p className="mb-6 text-body text-text-muted">
          The 9 core categories plus anything your gym adds. We check for duplicates so the list stays clean.
        </p>

        {/* Add */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSuggestion(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="e.g. Battle Ropes"
              className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
            />
            <button
              type="button"
              onClick={add}
              disabled={busy || !name.trim()}
              className="h-11 shrink-0 rounded-md bg-accent px-4 text-label text-on-accent disabled:opacity-50"
            >
              ADD
            </button>
          </div>
          {suggestion && (
            <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 p-3">
              <p className="text-caption text-text-primary">
                You likely already have <span className="font-semibold">{suggestion.name}</span> — use that instead of creating a duplicate?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => linkExisting(suggestion.id)}
                  className="h-9 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent"
                >
                  Use {suggestion.name}
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="h-9 rounded-md border border-border px-4 text-caption text-text-muted"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {msg && <p className="mt-2 text-caption text-text-muted">{msg}</p>}
        </div>

        {/* List */}
        <ul className="space-y-2">
          {list.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
              <span className="min-w-0">
                <span className="text-body font-semibold text-text-primary">{e.name}</span>
                {e.is_core ? (
                  <span className="ml-2 text-caption text-text-faint">core</span>
                ) : e.status === 'pending' ? (
                  <span className="ml-2 rounded-full bg-energy/15 px-2 py-0.5 text-caption font-semibold text-energy">in review</span>
                ) : e.status === 'approved' ? (
                  <span className="ml-2 text-caption text-accent">approved</span>
                ) : null}
              </span>
              {!e.is_core && (
                <button
                  type="button"
                  onClick={() => remove(e.id)}
                  className="shrink-0 text-caption text-destructive"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
