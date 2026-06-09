'use client';

import { useEffect, useState } from 'react';
import type { ShareExercise, ShareParams } from '@/lib/share';

interface Props {
  name: string;
  exercises: ShareExercise[];
  params: ShareParams;
}
interface Client {
  id: string;
  name: string;
}

// Trainer-only: turns the current generated workout into a stable /s/<token>
// share link (the API is tenant-gated, so a public visitor gets a sign-in hint).
// Optionally assigns the share to a client so its engagement rolls up to them.
export default function ShareWorkoutButton({ name, exercises, params }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');

  // Pull the gym's clients (silently no-ops for public visitors → 403).
  useEffect(() => {
    fetch('/api/tenant/clients')
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {});
  }, []);

  const create = async () => {
    setState('loading');
    try {
      const r = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, exercises, params, clientId: clientId || undefined }),
      });
      const j = await r.json();
      if (!r.ok) {
        setState('error');
        return;
      }
      setUrl(window.location.origin + j.url);
      setState('done');
    } catch {
      setState('error');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (state === 'done') {
    return (
      <div className="mt-3 rounded-md border border-border bg-surface p-3 print:hidden">
        <p className="mb-2 text-caption text-text-muted">Share link created — send it to your client:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 flex-1 rounded-md border border-border bg-background px-2 text-caption text-text-primary"
          />
          <button type="button" onClick={copy} className="h-10 shrink-0 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <a href={url} className="mt-2 block text-center text-caption text-accent">
          Open it →
        </a>
      </div>
    );
  }

  return (
    <div className="print:hidden">
      {clients.length > 0 && (
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-3 h-11 w-full rounded-md border border-border bg-surface px-2 text-body text-text-primary"
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
        disabled={state === 'loading'}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface disabled:opacity-50"
      >
        {state === 'loading' ? 'Creating…' : '🔗 Create a share link'}
      </button>
      {state === 'error' && (
        <p className="mt-1 text-center text-caption text-text-faint">Sign in to your gym to create share links.</p>
      )}
    </div>
  );
}
