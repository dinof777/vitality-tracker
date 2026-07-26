'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import Sparkline from '@/components/charts/Sparkline';
import ChipInput from '@/components/dashboard/ChipInput';
import {
  GOALS_MAX_ITEMS,
  EQUIPMENT_MAX_ITEMS,
  ITEM_MAX_LEN,
} from '@/lib/client-profile';

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

// Mirrors the API_CONTRACT_client_profiles.md shape (Priya) — declared
// locally rather than imported from the route's shared.ts, same pattern
// StartSheet.tsx already uses for /api/tenant/me's TenantMe contract.
interface ProfileData {
  clientId: string;
  goals: string[];
  equipment: string[];
  notes: string | null; // trainer-private — never read anywhere but the Profile form below
  heightCm: number | null;
  goalWeightKg: number | null;
  portalToken: string | null;
  portalTokenCreatedAt: string | null;
  portalConsentAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface MetricPoint {
  value: number;
  recordedAt: string;
}
interface MetricsSummary {
  weight: { current: MetricPoint | null; starting: MetricPoint | null };
  hrv: { current: MetricPoint | null; starting: MetricPoint | null };
}
type MetricType = 'weight_kg' | 'hrv_ms';

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

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusOf(s: Share): { label: string; cls: string } {
  if (Number(s.completions) > 0) return { label: '✓ Completed', cls: 'text-accent' };
  if (Number(s.imports) > 0) return { label: '↓ Imported', cls: 'text-energy' };
  if (Number(s.opens) > 0) return { label: 'Opened', cls: 'text-text-muted' };
  return { label: 'Sent', cls: 'text-text-faint' };
}

// One Weight/HRV card — DESIGN.md §6 sparkline-container recipe, brief §2.1.
function BiometricCard({
  label,
  unit,
  current,
  starting,
  goal,
  bmi,
  history,
  sparklineLabel,
}: {
  label: string;
  unit: string;
  current: MetricPoint | null;
  starting: MetricPoint | null;
  goal?: number | null;
  bmi?: number | null;
  history: number[];
  sparklineLabel: string;
}) {
  if (!current) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <h3 className="text-h3 text-text-muted">{label}</h3>
        <p className="mt-1 text-body text-text-muted">No readings yet</p>
        <p className="text-caption text-text-faint">Log one below to start tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-h3 text-text-primary">{label}</h3>
      <p className="nums text-h1 text-text-primary">
        {current.value} <span className="text-caption font-normal text-text-muted">{unit}</span>
      </p>
      {starting && (
        <p className="nums text-caption text-text-muted">
          Start {starting.value}
          {goal != null ? ` → Goal ${goal}` : ''}
        </p>
      )}
      <div className="h-12 w-full rounded-md bg-surface-raised/50 px-2 py-1">
        <Sparkline data={history} label={sparklineLabel} />
      </div>
      {bmi != null && <p className="text-caption text-text-faint">BMI {bmi.toFixed(1)}</p>}
    </div>
  );
}

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [weightHistory, setWeightHistory] = useState<number[]>([]);
  const [hrvHistory, setHrvHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  // Log-a-reading form (§2.1a) — one shared form for both Weight and HRV.
  const [metricType, setMetricType] = useState<MetricType>('weight_kg');
  const [metricValue, setMetricValue] = useState('');
  const [metricNote, setMetricNote] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);
  const [metricDate, setMetricDate] = useState('');
  const [loggingMetric, setLoggingMetric] = useState(false);
  const [metricError, setMetricError] = useState('');

  // Profile form (§2.2)
  const [goals, setGoals] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [goalWeightKg, setGoalWeightKg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Portal Link (§2.3, §2.5)
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [portalCopied, setPortalCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [portalQrSvg, setPortalQrSvg] = useState('');
  // window.location.origin is undefined during SSR — this client component
  // still renders server-side for the initial HTML, so the origin used for
  // display is only ever safe to read after mount.
  const [origin, setOrigin] = useState('');

  const hydrateProfileForm = (p: ProfileData | null) => {
    setGoals(p?.goals ?? []);
    setEquipment(p?.equipment ?? []);
    setNotes(p?.notes ?? '');
    setHeightCm(p?.heightCm != null ? String(p.heightCm) : '');
    setGoalWeightKg(p?.goalWeightKg != null ? String(p.goalWeightKg) : '');
  };

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    Promise.all([
      fetch(`/api/tenant/clients/${clientId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/tenant/clients/${clientId}/metrics?type=weight_kg`).then((r) => (r.ok ? r.json() : { history: [] })),
      fetch(`/api/tenant/clients/${clientId}/metrics?type=hrv_ms`).then((r) => (r.ok ? r.json() : { history: [] })),
    ])
      .then(([main, weightH, hrvH]) => {
        if (!active) return;
        if (main) {
          setClient(main.client);
          setShares(main.shares ?? []);
          setProfile(main.profile);
          setMetrics(main.metrics);
          hydrateProfileForm(main.profile);
        }
        setWeightHistory((weightH.history ?? []).map((h: MetricPoint) => h.value));
        setHrvHistory((hrvH.history ?? []).map((h: MetricPoint) => h.value));
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clientId]);

  // Reuses the /s/[token] copy pattern already in this file.
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const metricValid = Number.isFinite(Number(metricValue)) && Number(metricValue) > 0;

  const logMetric = async () => {
    if (!metricValid) return;
    setLoggingMetric(true);
    setMetricError('');
    try {
      const body: { metricType: MetricType; value: number; recordedAt?: string; note?: string } = {
        metricType,
        value: Number(metricValue),
      };
      if (showDateInput && metricDate) body.recordedAt = new Date(`${metricDate}T12:00:00`).toISOString();
      if (metricNote.trim()) body.note = metricNote.trim();

      const r = await fetch(`/api/tenant/clients/${clientId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setMetricError(j.error ?? 'Could not log that reading.');
        return;
      }
      const point: MetricPoint = { value: j.metric.value, recordedAt: j.metric.recordedAt };
      // Optimistic append — the value just posted is definitionally the new
      // "current" (brief §2.1a); becomes "starting" too if this is the first ever reading.
      if (metricType === 'weight_kg') {
        setWeightHistory((prev) => [...prev, point.value]);
        setMetrics((prev) => ({
          weight: { current: point, starting: prev?.weight.starting ?? point },
          hrv: prev?.hrv ?? { current: null, starting: null },
        }));
      } else {
        setHrvHistory((prev) => [...prev, point.value]);
        setMetrics((prev) => ({
          hrv: { current: point, starting: prev?.hrv.starting ?? point },
          weight: prev?.weight ?? { current: null, starting: null },
        }));
      }
      setMetricValue('');
      setMetricNote('');
      setShowDateInput(false);
      setMetricDate('');
    } catch {
      setMetricError('Network error.');
    } finally {
      setLoggingMetric(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    setProfileSaved(false);
    try {
      const body = {
        goals,
        equipment,
        notes: notes.trim() ? notes.trim() : null,
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        goalWeightKg: goalWeightKg.trim() ? Number(goalWeightKg) : null,
      };
      const r = await fetch(`/api/tenant/clients/${clientId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setProfileError(j.error ?? 'Could not save.');
        return;
      }
      setProfile(j.profile);
      hydrateProfileForm(j.profile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      setProfileError('Network error.');
    } finally {
      setSavingProfile(false);
    }
  };

  const openConsent = () => {
    setConsentChecked(false);
    setPortalError('');
    setConsentOpen(true);
  };

  const submitConsent = async () => {
    if (!consentChecked) return;
    setPortalSaving(true);
    setPortalError('');
    try {
      const r = await fetch(`/api/tenant/clients/${clientId}/portal-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true }),
      });
      const j = await r.json();
      if (!r.ok) {
        setPortalError(j.error ?? 'Could not create the link.');
        return;
      }
      // Patch the existing profile, OR — a brand-new client with nothing
      // saved yet (profile === null) can still be the very first thing a
      // trainer creates a portal link for — construct a minimal profile
      // object rather than silently dropping the update.
      setProfile((prev) =>
        prev
          ? { ...prev, portalToken: j.token, portalTokenCreatedAt: j.consentAt, portalConsentAt: j.consentAt }
          : {
              clientId: String(clientId),
              goals: [],
              equipment: [],
              notes: null,
              heightCm: null,
              goalWeightKg: null,
              portalToken: j.token,
              portalTokenCreatedAt: j.consentAt,
              portalConsentAt: j.consentAt,
              createdAt: j.consentAt,
              updatedAt: j.consentAt,
            },
      );
      setConsentOpen(false);
      setConsentChecked(false);
      setQrOpen(false);
      setPortalQrSvg('');
    } catch {
      setPortalError('Network error.');
    } finally {
      setPortalSaving(false);
    }
  };

  const revokePortal = async () => {
    if (
      !window.confirm(
        `Revoke this link? ${client?.name ?? 'This client'} won't be able to open it anymore — you can generate a new one any time.`,
      )
    )
      return;
    setPortalError('');
    try {
      const r = await fetch(`/api/tenant/clients/${clientId}/portal-link`, { method: 'DELETE' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setPortalError(j.error ?? 'Could not revoke.');
        return;
      }
      setProfile((prev) => (prev ? { ...prev, portalToken: null, portalTokenCreatedAt: null } : prev));
      setQrOpen(false);
      setPortalQrSvg('');
    } catch {
      setPortalError('Network error.');
    }
  };

  const copyPortalLink = async () => {
    if (!profile?.portalToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/portal/${profile.portalToken}`);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Client-side QR generation (the `qrcode` package is isomorphic) — mirrors
  // how components/workout/StartSheet.tsx already generates its PDF QR.
  useEffect(() => {
    if (!qrOpen || !profile?.portalToken) return;
    let active = true;
    QRCode.toString(`${window.location.origin}/portal/${profile.portalToken}`, {
      type: 'svg',
      margin: 1,
      color: { dark: '#0b0b0c', light: '#ffffff' },
    }).then((svg) => {
      if (active) setPortalQrSvg(svg);
    });
    return () => {
      active = false;
    };
  }, [qrOpen, profile?.portalToken]);

  const bmi =
    metrics?.weight.current != null && profile?.heightCm != null
      ? metrics.weight.current.value / (profile.heightCm / 100) ** 2
      : null;

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <Link href="/dashboard/clients" className="text-caption text-text-muted">
          ← Clients
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">{client?.name ?? 'Client'}</h1>
        <p className="mb-6 text-body text-text-muted">{client?.contact ?? '—'}</p>

        {loading ? (
          <div className="h-16 animate-pulse rounded-lg bg-surface" />
        ) : (
          <>
            {/* ── Biometrics (§2.1) — leads: highest-frequency read+write ── */}
            <h2 className="mb-2 text-label text-accent">BIOMETRICS</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <BiometricCard
                label="Weight"
                unit="kg"
                current={metrics?.weight.current ?? null}
                starting={metrics?.weight.starting ?? null}
                goal={profile?.goalWeightKg ?? null}
                bmi={bmi}
                history={weightHistory}
                sparklineLabel="Weight history sparkline"
              />
              <BiometricCard
                label="HRV"
                unit="ms"
                current={metrics?.hrv.current ?? null}
                starting={metrics?.hrv.starting ?? null}
                history={hrvHistory}
                sparklineLabel="HRV history sparkline"
              />
            </div>

            <div className="mx-auto mt-4 max-w-xl">
              <h3 className="mb-2 text-h3 text-text-primary">Log a reading</h3>
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full bg-surface-raised p-1">
                    {(['weight_kg', 'hrv_ms'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMetricType(t)}
                        aria-pressed={metricType === t}
                        className={`h-11 rounded-full px-4 text-caption font-semibold ${
                          metricType === t ? 'bg-accent text-on-accent' : 'text-text-muted'
                        }`}
                      >
                        {t === 'weight_kg' ? 'Weight' : 'HRV'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={metricType === 'weight_kg' ? 'Weight value' : 'HRV value'}
                      className="h-12 w-24 rounded-md bg-surface-raised text-center text-h3 text-text-primary tabular-nums placeholder:text-text-faint"
                    />
                    <span className="text-caption text-text-muted">{metricType === 'weight_kg' ? 'kg' : 'ms'}</span>
                  </div>

                  {showDateInput ? (
                    <input
                      type="date"
                      value={metricDate}
                      onChange={(e) => setMetricDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="h-11 rounded-md border border-border bg-background px-3 text-body text-text-primary"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDateInput(true)}
                      className="text-caption text-text-muted underline decoration-dotted underline-offset-2"
                    >
                      Today ▾
                    </button>
                  )}
                </div>

                <input
                  value={metricNote}
                  onChange={(e) => setMetricNote(e.target.value)}
                  placeholder="Note (optional)"
                  maxLength={240}
                  className="mt-3 h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
                />

                {metricError && <p className="mt-2 text-caption text-destructive">{metricError}</p>}

                <button
                  type="button"
                  onClick={logMetric}
                  disabled={!metricValid || loggingMetric}
                  className="mt-3 flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press disabled:opacity-40 disabled:active:scale-100"
                >
                  {loggingMetric ? 'LOGGING…' : 'LOG READING'}
                </button>
              </div>
            </div>

            {/* ── Profile (§2.2) — set-once-and-referenced, sits below the frequent-action block ── */}
            <h2 className="mb-2 mt-8 text-label text-accent">PROFILE</h2>
            <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-surface p-4">
              {profile === null && (
                <p className="text-caption text-text-muted">
                  Nothing saved for {client?.name ?? 'this client'} yet — add their goals, equipment, and details
                  below.
                </p>
              )}

              <div>
                <p className="mb-1.5 text-caption font-semibold text-text-muted">Goals</p>
                <ChipInput
                  items={goals}
                  onChange={setGoals}
                  maxItems={GOALS_MAX_ITEMS}
                  maxCharsPerItem={ITEM_MAX_LEN}
                  ariaLabel="Goals"
                />
              </div>

              <div>
                <p className="mb-1.5 text-caption font-semibold text-text-muted">Home equipment</p>
                <ChipInput
                  items={equipment}
                  onChange={setEquipment}
                  maxItems={EQUIPMENT_MAX_ITEMS}
                  maxCharsPerItem={ITEM_MAX_LEN}
                  ariaLabel="Home equipment"
                />
              </div>

              <div className="flex gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-caption font-semibold text-text-muted">Height (cm)</span>
                  <input
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    inputMode="numeric"
                    className="h-11 w-28 rounded-md border border-border bg-background px-3 text-body text-text-primary tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-caption font-semibold text-text-muted">Goal weight (kg)</span>
                  <input
                    value={goalWeightKg}
                    onChange={(e) => setGoalWeightKg(e.target.value)}
                    inputMode="decimal"
                    className="h-11 w-28 rounded-md border border-border bg-background px-3 text-body text-text-primary tabular-nums"
                  />
                </label>
              </div>

              {/* Notes — hard private treatment (§0, §2.4): dashed border, badge,
                  sits last in the form, never read anywhere but here. */}
              <div>
                <span className="mb-1.5 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-caption font-semibold text-text-muted">
                  🔒 PRIVATE — only you see this
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="min-h-24 w-full rounded-md border border-dashed border-border bg-background/50 p-3 text-body text-text-primary"
                />
              </div>

              {profileError && <p className="text-caption text-destructive">{profileError}</p>}

              <div className="flex items-center justify-end gap-3">
                {profileSaved && <span className="text-caption text-accent">Saved ✓</span>}
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="h-11 rounded-md bg-accent px-5 text-label text-on-accent disabled:opacity-50"
                >
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>

            {/* ── Portal Link (§2.3) — the switch that exposes Biometrics ── */}
            <h2 className="mb-2 mt-8 text-label text-accent">PORTAL LINK</h2>
            <div className="mx-auto max-w-xl">
              {!profile?.portalToken ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-body text-text-muted">No portal link yet.</p>
                  <p className="mt-1 text-caption text-text-faint">
                    Generate one so {client?.name ?? 'this client'} can check their own progress from their phone.
                  </p>
                  {!consentOpen && (
                    <button
                      type="button"
                      onClick={openConsent}
                      className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
                    >
                      Create portal link
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
                  <p className="truncate text-body text-text-primary nums">
                    {origin}/portal/{profile.portalToken}
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={copyPortalLink} className="text-caption text-accent">
                      <span aria-live="polite">{portalCopied ? 'Copied' : 'Copy link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrOpen((o) => !o)}
                      className="text-caption text-text-muted underline decoration-dotted underline-offset-2"
                    >
                      {qrOpen ? 'Hide QR ▴' : 'Show QR ▾'}
                    </button>
                  </div>
                  {qrOpen && (
                    <div className="flex justify-center py-2">
                      {portalQrSvg ? (
                        <div
                          className="h-36 w-36 rounded-lg bg-white p-2"
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{ __html: portalQrSvg }}
                        />
                      ) : (
                        <div className="h-36 w-36 animate-pulse rounded-lg bg-surface-raised" />
                      )}
                    </div>
                  )}
                  <p className="text-caption text-text-faint">
                    Created {fmtDate(profile.portalTokenCreatedAt)} · Consent confirmed{' '}
                    {fmtDate(profile.portalConsentAt)}
                  </p>
                  {!consentOpen && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={openConsent}
                        className="h-11 flex-1 rounded-md border border-border text-label text-text-primary active:bg-surface-raised"
                      >
                        Regenerate link
                      </button>
                      <button
                        type="button"
                        onClick={revokePortal}
                        className="h-11 shrink-0 rounded-md px-4 text-caption font-semibold text-destructive active:bg-surface-raised"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Consent-affirmation panel (§2.5) — shared by Create + Regenerate,
                  never pre-checked, re-shown on every regenerate since the server
                  re-validates consent on every POST. */}
              {consentOpen && (
                <div className="mt-3 space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      aria-required="true"
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                        consentChecked ? 'border-accent bg-accent' : 'border-border'
                      }`}
                    >
                      {consentChecked && <span className="text-caption font-bold text-on-accent">✓</span>}
                    </span>
                    <span className="text-body text-text-primary">
                      I have {client?.name ?? 'this client'}&apos;s consent to store and share this info.
                    </span>
                  </label>
                  <p className="text-caption text-text-muted">
                    This confirms sharing their weight, HRV, and activity through a private link — never the notes
                    above, which stay private to you.
                  </p>
                  {portalError && <p className="text-caption text-destructive">{portalError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConsentOpen(false);
                        setConsentChecked(false);
                      }}
                      className="h-11 flex-1 rounded-md border border-border text-label text-text-primary active:bg-surface-raised"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitConsent}
                      disabled={!consentChecked || portalSaving}
                      className="h-11 flex-1 rounded-md bg-accent text-label text-on-accent disabled:opacity-40"
                    >
                      {portalSaving ? 'Saving…' : profile?.portalToken ? 'Regenerate link' : 'Create link'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Shared Workouts (existing, unchanged) — moved to last ── */}
            <h2 className="mb-2 mt-8 text-label text-accent">SHARED WORKOUTS</h2>
            {shares.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-body text-text-muted">
                Nothing shared with {client?.name ?? 'this client'} yet. Build a workout and pick them in “Share
                with…”.
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
                          <span aria-live="polite">{copied === s.token ? 'Copied' : 'Copy link'}</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
