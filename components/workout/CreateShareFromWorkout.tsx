'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ShareExercise, ShareParams } from '@/lib/share';

interface Client {
  id: string;
  name: string;
}

// Mint a new share link from a saved circuit — optionally assigned to a client so
// its opens/completions roll up to them.
export default function CreateShareFromWorkout({
  workoutId,
  name,
  exercises,
  params,
  clients,
}: {
  workoutId: string;
  name: string;
  exercises: ShareExercise[];
  params: ShareParams;
  clients: Client[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exercises, params, workoutId, clientId: clientId || undefined }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? 'Could not create the link.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="print:hidden">
      {clients.length > 0 && (
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mb-2 h-11 w-full rounded-md border border-border bg-surface px-2 text-body text-text-primary"
        >
          <option value="">Share with… (no client)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface disabled:opacity-50"
      >
        {busy ? 'Creating…' : '🔗 Create a share link'}
      </button>
      {error && <p className="mt-1 text-center text-caption text-text-faint">{error}</p>}
    </div>
  );
}
