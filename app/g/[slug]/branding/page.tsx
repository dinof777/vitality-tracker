'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { darken, isValidHex, onAccentFor } from '@/lib/color';

export default function BrandingSettings({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accent, setAccent] = useState('#a3e635');
  const [site, setSite] = useState('');
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tenants/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => {
        if (!t) return;
        setName(t.branding?.brandName ?? t.name ?? '');
        setLogoUrl(t.branding?.logoUrl ?? '');
        setAccent(t.branding?.accent ?? '#a3e635');
      })
      .catch(() => {});
  }, [slug]);

  const importFromSite = async () => {
    if (!site.trim()) return;
    setScraping(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/brand-scrape?url=${encodeURIComponent(site.trim())}`);
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.error ?? "Couldn't read that site.");
        return;
      }
      const b = j.branding ?? {};
      if (b.brandName) setName(b.brandName);
      if (b.logoUrl) setLogoUrl(b.logoUrl);
      if (b.accent && isValidHex(b.accent)) setAccent(b.accent);
      setMsg(`Imported from your site${j.accentSource === 'logo' ? ' — color pulled from your logo' : ''}. Review & save.`);
    } catch {
      setMsg("Couldn't reach that site.");
    } finally {
      setScraping(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const branding = {
        brandName: name,
        logoUrl,
        accent,
        accentPress: darken(accent),
        onAccent: onAccentFor(accent),
      };
      const r = await fetch(`/api/tenants/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding, name }),
      });
      setMsg(r.ok ? 'Saved ✓ — open your /g/' + slug + ' page to see it.' : 'Save failed.');
    } catch {
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const validAccent = isValidHex(accent);
  const previewVars = validAccent
    ? ({ '--accent': accent, '--accent-press': darken(accent), '--on-accent': onAccentFor(accent) } as React.CSSProperties)
    : {};
  const initial = (name || slug).trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Branding</h1>
        <p className="mb-6 text-body text-text-muted">Make the app look like {name || 'your gym'}.</p>

        {/* Import from website */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-label text-accent">BRAND AUTOPILOT</p>
          <p className="mb-3 text-caption text-text-muted">
            Paste your website — we’ll grab your logo, name, and color.
          </p>
          <div className="flex gap-2">
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && importFromSite()}
              placeholder="yourgym.com"
              inputMode="url"
              className="h-11 flex-1 rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
            />
            <button
              type="button"
              onClick={importFromSite}
              disabled={scraping}
              className="h-11 shrink-0 rounded-md bg-accent px-4 text-label text-on-accent disabled:opacity-50"
            >
              {scraping ? '…' : 'IMPORT'}
            </button>
          </div>
        </div>

        {/* Fields */}
        <label className="mb-1 block text-caption text-text-muted">BRAND NAME</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary"
        />

        <label className="mb-1 block text-caption text-text-muted">LOGO URL</label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className="mb-4 h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
        />

        <label className="mb-1 block text-caption text-text-muted">ACCENT COLOR</label>
        <div className="mb-6 flex items-center gap-3">
          <input
            type="color"
            value={validAccent ? accent : '#a3e635'}
            onChange={(e) => setAccent(e.target.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-md border border-border bg-surface"
          />
          <input
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-11 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-body text-text-primary"
          />
        </div>

        {/* Live preview */}
        <p className="mb-2 text-caption text-text-muted">PREVIEW</p>
        <div style={previewVars} className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="mb-4 flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-body font-extrabold text-on-accent">
                {initial}
              </span>
            )}
            <span className="text-h3 font-bold">{name || 'Your Gym'}</span>
          </div>
          <button type="button" className="h-12 w-full rounded-md bg-accent text-label text-on-accent">
            START TODAY’S WORKOUT
          </button>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || !validAccent}
          className="h-13 w-full rounded-md bg-accent py-3 text-label text-on-accent disabled:opacity-50"
          style={previewVars}
        >
          {saving ? 'SAVING…' : 'SAVE BRANDING'}
        </button>

        {msg && <p className="mt-3 text-center text-caption text-text-muted">{msg}</p>}

        {/* Don't dead-end here — branding is step 1 of several. */}
        <div className="mt-8 rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-label text-accent">WHAT&rsquo;S NEXT</p>
          <p className="mb-3 text-caption text-text-muted">Your app is live. Here&rsquo;s what to do with it.</p>
          <div className="space-y-2">
            <Link href={`/g/${slug}`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
              <span>
                <span className="block text-body font-semibold text-text-primary">See your app</span>
                <span className="block text-caption text-text-muted">Open it exactly as your clients will</span>
              </span>
              <span className="text-text-faint">›</span>
            </Link>
            <Link href={`/g/${slug}/build`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
              <span>
                <span className="block text-body font-semibold text-text-primary">Build a workout</span>
                <span className="block text-caption text-text-muted">Generate one, then share it by link or QR</span>
              </span>
              <span className="text-text-faint">›</span>
            </Link>
            <Link href="/dashboard/embed" className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
              <span>
                <span className="block text-body font-semibold text-text-primary">Add it to your website</span>
                <span className="block text-caption text-text-muted">Copy-paste a button, embed, or QR code</span>
              </span>
              <span className="text-text-faint">›</span>
            </Link>
            <Link href="/dashboard" className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
              <span>
                <span className="block text-body font-semibold text-text-primary">Back to your dashboard</span>
                <span className="block text-caption text-text-muted">Exercises, equipment, clients — edit any time</span>
              </span>
              <span className="text-text-faint">›</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
