import { getSql } from './db';
import { newShareToken } from './share';
import { summarizeMetricRows, toHistory, type MetricRow, type MetricType } from './client-metrics';
import type { ProfilePatch } from './client-profile';

// Thin, mockable I/O adapter over client_profiles / client_metrics (0013) and
// the clients ownership guard every tenant/clients route uses. Pure
// validation/aggregation lives in lib/client-metrics.ts and
// lib/client-profile.ts — this file does no computation of its own, only
// reads and writes, so it can be regression-tested against a fake `sql`
// (same pattern as lib/lifecycle-db.test.ts / lib/scoped-db.test.ts) without
// a live database.

export interface ClientRow {
  id: string;
  name: string;
  contact: string | null;
}

/** The same guard every /api/tenant/clients/* route uses: the client belongs
 * to this tenant AND (the caller owns the gym OR is the client's own
 * trainer). Returns null if not found / not authorized — callers deliberately
 * can't tell the two apart (a 403-vs-404 split would leak cross-tenant
 * existence), matching the existing GET clientId route. */
export async function authorizeClient(
  clientId: string,
  tenantId: string,
  userId: string,
  isOwner: boolean,
): Promise<ClientRow | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    select id, name, contact from clients
    where id = ${clientId} and tenant_id = ${tenantId} and (${isOwner} or owner_user_id = ${userId})
  `;
  return (rows[0] as ClientRow) ?? null;
}

export interface ClientProfile {
  client_id: string;
  tenant_id: string;
  goals: string[];
  equipment: string[];
  notes: string | null;
  height_cm: number | string | null;
  goal_weight_kg: number | string | null;
  portal_token: string | null;
  portal_token_created_at: string | null;
  portal_consent_at: string | null;
  syncrofit_user_scoped_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchProfile(clientId: string): Promise<ClientProfile | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`select * from client_profiles where client_id = ${clientId}`;
  return (rows[0] as ClientProfile) ?? null;
}

/** Upsert — client_profiles is 1:1 with clients but the row doesn't exist
 * until the trainer first saves something. Read-then-write so only the
 * fields present in `patch` change; everything else keeps its current value.
 * (A tiny race window between two concurrent PUTs on the same client is
 * accepted for this trainer-only, effectively single-writer-per-client MVP —
 * same tradeoff every other read-modify-write route in this codebase makes.) */
export async function upsertProfile(clientId: string, tenantId: string, patch: ProfilePatch): Promise<ClientProfile> {
  const sql = getSql();
  if (!sql) throw new Error('No database');
  const existing = await fetchProfile(clientId);

  const goals = patch.goals !== undefined ? patch.goals : (existing?.goals ?? []);
  const equipment = patch.equipment !== undefined ? patch.equipment : (existing?.equipment ?? []);
  const notes = patch.notes !== undefined ? patch.notes : (existing?.notes ?? null);
  const heightCm = patch.heightCm !== undefined ? patch.heightCm : (existing?.height_cm ?? null);
  const goalWeightKg = patch.goalWeightKg !== undefined ? patch.goalWeightKg : (existing?.goal_weight_kg ?? null);

  const rows = await sql`
    insert into client_profiles (client_id, tenant_id, goals, equipment, notes, height_cm, goal_weight_kg, updated_at)
    values (${clientId}, ${tenantId}, ${goals}, ${equipment}, ${notes}, ${heightCm}, ${goalWeightKg}, now())
    on conflict (client_id) do update set
      goals          = excluded.goals,
      equipment      = excluded.equipment,
      notes          = excluded.notes,
      height_cm      = excluded.height_cm,
      goal_weight_kg = excluded.goal_weight_kg,
      updated_at     = now()
    returning *
  `;
  return rows[0] as ClientProfile;
}

export interface ClientMetric {
  id: string;
  client_id: string;
  tenant_id: string;
  metric_type: MetricType;
  value: number | string;
  recorded_at: string;
  recorded_by: 'trainer' | 'trainee';
  note: string | null;
  created_at: string;
}

/** recorded_by is hard-coded 'trainer' here — never accepted from the
 * request body. MVP is trainer-entry-only (Elena §5); the trainee write path
 * doesn't exist yet. */
export async function insertMetric(
  clientId: string,
  tenantId: string,
  metricType: MetricType,
  value: number,
  recordedAtIso: string,
  note: string | null,
): Promise<ClientMetric> {
  const sql = getSql();
  if (!sql) throw new Error('No database');
  const rows = await sql`
    insert into client_metrics (client_id, tenant_id, metric_type, value, recorded_at, recorded_by, note)
    values (${clientId}, ${tenantId}, ${metricType}, ${value}, ${recordedAtIso}, 'trainer', ${note})
    returning *
  `;
  return rows[0] as ClientMetric;
}

/** Oldest-first history for one metric type — feeds the Sparkline. */
export async function fetchMetricHistory(clientId: string, metricType: MetricType) {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    select value, recorded_at from client_metrics
    where client_id = ${clientId} and metric_type = ${metricType}
    order by recorded_at asc
  `) as MetricRow[];
  return toHistory(rows);
}

export interface MetricsSummary {
  weight: ReturnType<typeof summarizeMetricRows>;
  hrv: ReturnType<typeof summarizeMetricRows>;
}

/** current/starting for both metric types in one round trip — feeds the
 * extended GET /api/tenant/clients/[clientId] response. */
export async function fetchMetricsSummary(clientId: string): Promise<MetricsSummary> {
  const sql = getSql();
  if (!sql) return { weight: { current: null, starting: null }, hrv: { current: null, starting: null } };
  const rows = (await sql`
    select metric_type, value, recorded_at from client_metrics
    where client_id = ${clientId} and metric_type in ('weight_kg', 'hrv_ms')
    order by recorded_at asc
  `) as Array<MetricRow & { metric_type: MetricType }>;
  const weightRows = rows.filter((r) => r.metric_type === 'weight_kg');
  const hrvRows = rows.filter((r) => r.metric_type === 'hrv_ms');
  return { weight: summarizeMetricRows(weightRows), hrv: summarizeMetricRows(hrvRows) };
}

export interface PortalLink {
  portal_token: string | null;
  portal_token_created_at: string | null;
  portal_consent_at: string | null;
}

/** Generates (or regenerates) the portal token and stamps consent. The
 * caller (the route) is responsible for having already validated
 * consent === true in the request body — this function just persists what
 * was validated, so the consent check and the persisted timestamp stay next
 * to each other in the route, easy to audit. */
export async function issuePortalLink(clientId: string, tenantId: string): Promise<PortalLink> {
  const sql = getSql();
  if (!sql) throw new Error('No database');
  const token = newShareToken();
  const rows = await sql`
    insert into client_profiles (client_id, tenant_id, portal_token, portal_token_created_at, portal_consent_at)
    values (${clientId}, ${tenantId}, ${token}, now(), now())
    on conflict (client_id) do update set
      portal_token = ${token},
      portal_token_created_at = now(),
      portal_consent_at = now()
    returning portal_token, portal_token_created_at, portal_consent_at
  `;
  return rows[0] as PortalLink;
}

/** Revokes (nulls the token) without erasing the consent timestamp — that
 * stays as the audit record that consent was once given, even though the
 * link no longer works. A fresh POST re-stamps it on the next issue. */
export async function revokePortalLink(clientId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    update client_profiles
    set portal_token = null, portal_token_created_at = null
    where client_id = ${clientId}
  `;
}
