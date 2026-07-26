import { notFound } from 'next/navigation';
import { brandingToCssVars } from '@/lib/tenant';
import { fetchPortalData } from '@/lib/client-portal-read';
import Sparkline from '@/components/charts/Sparkline';
import { fmt1 } from '@/lib/format-metric';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, no-login trainee portal — a private link a trainer sends so a
// client can check their own progress. Mirrors app/s/[token]/page.tsx's
// shape (token → loader → branded render, notFound() on a miss) but reads
// through fetchPortalData, which deliberately never selects
// client_profiles.notes (see lib/client-portal-read.ts's module comment —
// that invariant is enforced at the query layer, not here, so there's no
// `notes` value in this component's tree to ever forget to hide).
//
// Layout order follows Ivy's brief (.design/trainee-portal/DESIGN_BRIEF.md
// §3): Activity leads (effort-based, unconditionally positive), then
// Weight (the metric a goal is set against, with BMI folded in as a quiet
// caption rather than its own card), then HRV (a more expert metric that
// benefits from Weight's trend-reading context being established first).

function relativeDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default async function TraineePortal({ params }: { params: { token: string } }) {
  const data = await fetchPortalData(params.token);
  if (!data) notFound();

  const { gymBranding, weight, hrv, bmi, activity } = data;
  const gym = gymBranding.name;
  const firstName = data.clientName.split(' ')[0];

  // PortalGymBranding's fields are already resolved (non-optional) — pick
  // just the CSS-var inputs brandingToCssVars needs; it also carries
  // logoUrl: string | null, which Branding types as string | undefined.
  const cssVars = brandingToCssVars({
    accent: gymBranding.accent,
    accentPress: gymBranding.accentPress,
    onAccent: gymBranding.onAccent,
    background: gymBranding.background,
    surface: gymBranding.surface,
  });

  const weightHistory = weight.history.map((p) => p.value);
  const hrvHistory = hrv.history.map((p) => p.value);

  return (
    <div style={cssVars} className="min-h-dvh bg-background text-text-primary">
      <main className="shell-tight px-5 pb-16 pt-10">
        <p className="text-label text-accent">{gym.toUpperCase()}</p>
        <h1 className="mb-1 mt-1 text-h1 text-text-primary">Hey, {firstName}</h1>
        <p className="mb-8 text-caption text-text-muted">Only you and {gym} can see this page.</p>

        {/* ── Activity — leads: effort-based, unconditionally positive ── */}
        <h2 className="mb-2 text-label text-accent">THIS WEEK</h2>
        <div className="space-y-1 rounded-lg border border-border bg-surface p-4">
          {activity.totalCompletions === 0 ? (
            <p className="text-body text-text-muted">Your first workout will show up here once you complete one.</p>
          ) : (
            <>
              {activity.sessionsThisWeek > 0 ? (
                <p className="text-balance nums text-h1 text-text-primary">
                  {activity.sessionsThisWeek} workout{activity.sessionsThisWeek === 1 ? '' : 's'} this week 🔥
                </p>
              ) : (
                <p className="text-body text-text-muted">No workouts logged this week yet.</p>
              )}
              {activity.lastWorkoutAt && (
                <p className="text-caption text-text-muted">Last workout: {relativeDate(activity.lastWorkoutAt)}</p>
              )}
            </>
          )}
        </div>

        {/* ── Weight — the metric a goal is set against; BMI folded in below,
            not a card of its own (a single derived number, easily
            over-read as a verdict rather than an estimate) ── */}
        <h2 className="mb-2 mt-8 text-label text-accent">WEIGHT</h2>
        {weight.current === null ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-body text-text-muted">Your trainer hasn&apos;t logged a weight reading yet.</p>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
            <p className="nums text-h1 text-text-primary">
              {fmt1(weight.current.value)} <span className="text-caption font-normal text-text-muted">{weight.unit}</span>
            </p>
            <p className="nums text-body text-text-muted">
              Start {fmt1(weight.starting?.value ?? weight.current.value)} → Now {fmt1(weight.current.value)}
              {weight.goal != null ? ` → Goal ${fmt1(weight.goal)}` : ''}
            </p>
            <div className="h-12 w-full rounded-md bg-surface-raised/50 px-2 py-1">
              <Sparkline data={weightHistory} label="Weight history sparkline" />
            </div>
            {bmi?.current != null && (
              <p className="text-caption text-text-faint">
                BMI {bmi.current.toFixed(1)} — a general estimate, not a full picture of your health.
              </p>
            )}
          </div>
        )}

        {/* ── HRV — secondary/expert metric, benefits from Weight's
            trend-reading context above ── */}
        <h2 className="mb-2 mt-8 text-label text-accent">HRV</h2>
        {hrv.current === null ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-body text-text-muted">Your trainer hasn&apos;t logged an HRV reading yet.</p>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
            <p className="nums text-h1 text-text-primary">
              {fmt1(hrv.current.value)} <span className="text-caption font-normal text-text-muted">ms</span>
            </p>
            <p className="nums text-body text-text-muted">Start {fmt1(hrv.history[0]?.value ?? hrv.current.value)}</p>
            <div className="h-12 w-full rounded-md bg-surface-raised/50 px-2 py-1">
              <Sparkline data={hrvHistory} label="HRV history sparkline" />
            </div>
            <p className="text-caption text-text-faint">
              Heart rate variability — a signal of recovery your trainer uses to gauge how rested you are.
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-caption text-text-faint">Powered by Live Elevated</p>
      </main>
    </div>
  );
}
