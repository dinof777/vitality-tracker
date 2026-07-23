'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify, isValidSlug } from '@/lib/slug';

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest the slug from the gym name until the trainer edits it.
  const onName = (v: string) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const create = async () => {
    setError(null);
    if (!name.trim()) return setError('Give your gym a name.');
    if (!isValidSlug(slug)) return setError('URL must be 2–32 letters, numbers, or hyphens (not a reserved word).');
    setBusy(true);
    try {
      const r = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? 'Something went wrong.');
        return;
      }
      router.push(j.next ?? `/g/${j.slug}/branding`);
    } catch {
      setError('Network error — try again.');
    } finally {
      setBusy(false);
    }
  };

  const slugOk = slug === '' || isValidSlug(slug);

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-12">
        <p className="text-label text-accent">LIVE ELEVATED PRO</p>
        <h1 className="mb-1 text-h1 text-text-primary">Create your gym</h1>
        <p className="mb-8 text-body text-text-muted">
          Name it and pick its web address. You’ll brand it next.
        </p>

        <label className="mb-1 block text-caption text-text-muted">GYM / TRAINER NAME</label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Iron Forge Gym"
          autoFocus
          className="mb-5 h-12 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
        />

        <label className="mb-1 block text-caption text-text-muted">YOUR APP URL</label>
        <div className="flex items-center rounded-md border border-border bg-surface px-3">
          <span className="text-body text-text-faint">liveelevatedpro.app/g/</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
            }}
            placeholder="iron-forge"
            className="h-12 flex-1 bg-transparent px-1 font-mono text-body text-text-primary placeholder:text-text-faint focus:outline-none"
          />
        </div>
        {!slugOk && <p className="mt-1 text-caption text-text-faint">2–32 letters, numbers, or hyphens — no reserved words.</p>}

        <button
          type="button"
          onClick={create}
          disabled={busy || !name.trim() || !isValidSlug(slug)}
          className="mt-8 h-13 w-full rounded-md bg-accent py-3 text-label text-on-accent disabled:opacity-50"
        >
          {busy ? 'CREATING…' : 'CREATE MY GYM'}
        </button>

        {error && <p className="mt-3 text-center text-caption text-destructive">{error}</p>}
      </main>
    </div>
  );
}
