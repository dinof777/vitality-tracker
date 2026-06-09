'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Share {
  token: string;
  name: string;
  created_at: string;
  opens: number;
  imports: number;
  completions: number;
  last_activity: string | null;
}
interface ClientInfo {
  id: string;
  name: string;
  contact: string | null;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return '';
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusOf(s: Share): { label: string; cls: string } {
  if (Number(s.completions) > 0) return { label: '✓ Completed', cls: 'text-accent' };
  if (Number(s.imports) > 0) return { label: '↓ Imported', cls: 'text-energy' };
  if (Number(s.opens) > 0) return { label: 'Opened', cls: 'text-text-muted' };
  return { label: 'Sent', cls: 'text-text-faint' };
}

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch(`/api/tenant/clients/${clientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setClient(d.client);
          setShares(d.shares ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <Link href="/dashboard/clients" className="text-caption text-text-muted">
          ← Clients
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">{client?.name ?? 'Client'}</h1>
        <p className="mb-6 text-body text-text-muted">{client?.contact ?? '—'}</p>

        <p className="mb-2 text-label text-accent">SHARED WORKOUTS</p>
        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : shares.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
            Nothing shared with {client?.name ?? 'this client'} yet. Build a workout and pick them in “Share with…”.
          </p>
        ) : (
          <ul className="space-y-2">
            {shares.map((s) => {
              const st = statusOf(s);
              return (
                <li key={s.token} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-body font-semibold text-text-primary">{s.name}</p>
                    <span className={`shrink-0 text-caption font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="mt-0.5 text-caption text-text-muted nums">
                    {s.opens} open{Number(s.opens) === 1 ? '' : 's'}
                    {Number(s.completions) > 0 ? ` · ${s.completions} done` : ''}
                    {s.last_activity ? ` · ${timeAgo(s.last_activity)}` : ` · sent ${timeAgo(s.created_at)}`}
                  </p>
                  <div className="mt-2 flex gap-3 text-caption">
                    <Link href={`/s/${s.token}`} className="text-accent">
                      Open ›
                    </Link>
                    <button type="button" onClick={() => copy(s.token)} className="text-text-muted">
                      {copied === s.token ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
