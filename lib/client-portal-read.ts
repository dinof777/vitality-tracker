import { getSql } from './db';
import { DEFAULT_BRANDING, type Branding } from './tenant';
import { fetchMetricHistory } from './client-portal-db';
import { computeBmi, type MetricPoint } from './client-metrics';

// The no-auth, public read for /portal/[token] — mirrors lib/share.ts's
// fetchShareByToken pattern exactly (getSql, no session, no Clerk). This
// module builds the render shape ONLY; the React page itself is Kevin/Ivy's
// (see 04_Agents_Workspace/Software_Dev/vitality-tracker-trainee-portal/
// SCOPE_and_datasource.md §7 for the contract this implements).
//
// CRITICAL PRIVACY RULE: client_profiles.notes is trainer-private and MUST
// NEVER be selected or returned here. The primary lookup query below
// deliberately lists every other client_profiles column by name and omits
// `notes` — there is no `select *` anywhere in this file, specifically so a
// future column addition to client_profiles can't silently leak into the
// public portal response the way it could with `select *`.
//
// A missing / unknown / revoked token returns null — same as
// fetchShareByToken, never an error, so the caller can 404 without leaking
// whether a token ever existed. Revocation needs no special handling: POST
// /portal-link's revoke nulls client_profiles.portal_token, so a revoked
// token simply matches zero rows on `where portal_token = $1`.

export interface PortalWeight {
  starting: MetricPoint | null;
  current: MetricPoint | null;
  goal: number | null;
  unit: 'kg';
  history: MetricPoint[];
}

export interface PortalHrv {
  current: MetricPoint | null;
  history: MetricPoint[];
}

export interface PortalGymBranding {
  name: string; // resolved display name: branding.brandName ?? tenant.name ?? 'Your gym'
  logoUrl: string | null;
  accent: string;
  accentPress: string;
  onAccent: string;
  background: string;
  surface: string;
}

export interface PortalActivity {
  lastWorkoutAt: string | null;
  sessionsThisWeek: number;
  totalCompletions: number;
}

export interface PortalData {
  clientName: string;
  gymBranding: PortalGymBranding;
  weight: PortalWeight;
  hrv: PortalHrv;
  bmi: { current: number | null } | null;
  activity: PortalActivity;
}

interface ProfileLookupRow {
  client_id: string;
  tenant_id: string;
  height_cm: number | string | null;
  goal_weight_kg: number | string | null;
  client_name: string;
  tenant_name: string;
  tenant_branding: Branding | null;
}

function toGymBranding(tenantName: string, branding: Branding | null): PortalGymBranding {
  const b = { ...DEFAULT_BRANDING, ...(branding ?? {}) };
  return {
    name: branding?.brandName ?? tenantName ?? 'Your gym',
    logoUrl: branding?.logoUrl ?? null,
    accent: b.accent,
    accentPress: b.accentPress,
    onAccent: b.onAccent,
    background: b.background,
    surface: b.surface,
  };
}

interface ActivityRow {
  last_workout_at: string | null;
  sessions_this_week: number | string;
  total_completions: number | string;
}

async function fetchActivity(clientId: string): Promise<PortalActivity> {
  const sql = getSql();
  if (!sql) return { lastWorkoutAt: null, sessionsThisWeek: 0, totalCompletions: 0 };
  // Same share_links/syncrofit_events join every clients route uses
  // (sl.token = se.circuit_id), scoped to this client's shares. "When it
  // happened" uses coalesce(event_ts, received_at) — the same ordering
  // convention lib/syncrofit-events.ts and the routine detail page already
  // use, rather than received_at alone.
  const rows = (await sql`
    select
      max(coalesce(se.event_ts, se.received_at)) as last_workout_at,
      count(*) filter (where coalesce(se.event_ts, se.received_at) >= now() - interval '7 days')::int as sessions_this_week,
      count(*)::int as total_completions
    from syncrofit_events se
    join share_links sl on sl.token = se.circuit_id
    where sl.client_id = ${clientId} and se.event = 'circuit.completed'
  `) as ActivityRow[];
  const r = rows[0];
  if (!r) return { lastWorkoutAt: null, sessionsThisWeek: 0, totalCompletions: 0 };
  return {
    lastWorkoutAt: r.last_workout_at ?? null,
    sessionsThisWeek: Number(r.sessions_this_week ?? 0),
    totalCompletions: Number(r.total_completions ?? 0),
  };
}

export async function fetchPortalData(token: string): Promise<PortalData | null> {
  if (!token) return null;
  const sql = getSql();
  if (!sql) return null;

  // Deliberately NOT `select *` — see the module-level privacy note. Every
  // client_profiles column returned to the public portal is named here;
  // `notes` is not one of them.
  const rows = (await sql`
    select
      cp.client_id, cp.tenant_id, cp.height_cm, cp.goal_weight_kg,
      c.name as client_name,
      t.name as tenant_name, t.branding as tenant_branding
    from client_profiles cp
    join clients c on c.id = cp.client_id
    join tenants t on t.id = cp.tenant_id
    where cp.portal_token = ${token}
    limit 1
  `) as ProfileLookupRow[];
  const profile = rows[0];
  if (!profile) return null;

  const [weightHistory, hrvHistory, activity] = await Promise.all([
    fetchMetricHistory(profile.client_id, 'weight_kg'),
    fetchMetricHistory(profile.client_id, 'hrv_ms'),
    fetchActivity(profile.client_id),
  ]);

  const weightStarting = weightHistory[0] ?? null;
  const weightCurrent = weightHistory[weightHistory.length - 1] ?? null;
  const hrvCurrent = hrvHistory[hrvHistory.length - 1] ?? null;

  const heightCm = profile.height_cm === null ? null : Number(profile.height_cm);
  const goalWeightKg = profile.goal_weight_kg === null ? null : Number(profile.goal_weight_kg);
  const bmiValue = computeBmi(heightCm, weightCurrent?.value ?? null);

  return {
    clientName: profile.client_name,
    gymBranding: toGymBranding(profile.tenant_name, profile.tenant_branding),
    weight: {
      starting: weightStarting,
      current: weightCurrent,
      goal: goalWeightKg,
      unit: 'kg',
      history: weightHistory,
    },
    hrv: {
      current: hrvCurrent,
      history: hrvHistory,
    },
    bmi: heightCm === null ? null : { current: bmiValue },
    activity,
  };
}
