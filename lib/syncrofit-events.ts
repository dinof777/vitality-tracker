import { getSql } from './db';

// Inbound feedback from SyncroFit: a creator's circuit was imported and/or
// completed. SyncroFit POSTs these to our webhook (see app/api/syncrofit/events).
// circuit.id is the correlation key — it matches the id we put on the circuit we
// hand off (a routine id, etc.).

export type SyncrofitEventType = 'circuit.imported' | 'circuit.completed';

export interface SyncrofitEventInput {
  event: SyncrofitEventType;
  circuit?: { id?: string; name?: string };
  user?: { scopedId?: string; displayName?: string };
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  timestamp?: string;
}

export interface SyncrofitEventRow {
  id: string;
  event: SyncrofitEventType;
  circuit_id: string | null;
  circuit_name: string | null;
  user_scoped_id: string | null;
  user_display_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  event_ts: string | null;
  received_at: string;
}

// ISO string → safe value for a timestamptz column (null on garbage).
function ts(v: string | undefined): string | null {
  if (!v || typeof v !== 'string') return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
}

export async function recordSyncrofitEvent(e: SyncrofitEventInput): Promise<void> {
  const sql = getSql();
  if (!sql) throw new Error('No database');
  await sql`
    insert into syncrofit_events
      (event, circuit_id, circuit_name, user_scoped_id, user_display_name,
       started_at, completed_at, duration_seconds, event_ts, raw)
    values (
      ${e.event},
      ${e.circuit?.id ?? null},
      ${e.circuit?.name ?? null},
      ${e.user?.scopedId ?? null},
      ${e.user?.displayName ?? null},
      ${ts(e.startedAt)},
      ${ts(e.completedAt)},
      ${Number.isFinite(e.durationSeconds) ? Math.round(e.durationSeconds as number) : null},
      ${ts(e.timestamp)},
      ${JSON.stringify(e)}::jsonb
    )
  `;
}

// The most recent events for one circuit (newest first) — feeds the activity feed.
export async function recentCircuitEvents(circuitId: string, limit = 12): Promise<SyncrofitEventRow[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select id, event, circuit_id, circuit_name, user_scoped_id, user_display_name,
           started_at, completed_at, duration_seconds, event_ts, received_at
    from syncrofit_events
    where circuit_id = ${circuitId}
    order by coalesce(event_ts, received_at) desc
    limit ${Math.min(Math.max(1, limit), 50)}
  `;
  return rows as SyncrofitEventRow[];
}

// Engagement summary for one circuit (imports, completions, last activity).
export async function circuitEngagement(circuitId: string) {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    select
      count(*) filter (where event = 'circuit.imported')  as imports,
      count(*) filter (where event = 'circuit.completed') as completions,
      count(distinct user_scoped_id)                      as unique_users,
      max(received_at)                                     as last_activity
    from syncrofit_events
    where circuit_id = ${circuitId}
  `;
  return rows[0] ?? null;
}
