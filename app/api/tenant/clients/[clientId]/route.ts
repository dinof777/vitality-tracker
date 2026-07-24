import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTrainer } from '@/lib/current-tenant';
import { fetchProfile, fetchMetricsSummary } from '@/lib/client-portal-db';
import { toProfileJson } from './shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// One client + the workouts shared with them, each with its status (from the
// SyncroFit events that reference the share token), plus their trainer-
// entered profile and weight/HRV metrics summary. Per-trainer: only the
// client's owner (or the gym owner) can view it.
//
// `profile` is trainer-facing only (this whole route is Clerk-gated) — its
// `notes` field is intentionally trainer-private per Elena's scoping doc §2b
// and must never be echoed into any future trainee-facing (/portal/[token])
// read shape.
export async function GET(_req: Request, { params }: { params: { clientId: string } }) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const c = await sql`
    select id, name, contact from clients
    where id = ${params.clientId} and tenant_id = ${t.tenant.id} and (${t.isOwner} or owner_user_id = ${t.userId})
  `;
  if (!c[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const shares = await sql`
    select sl.token, sl.name, sl.created_at, sl.opens,
      (select count(*) from syncrofit_events se where se.circuit_id = sl.token and se.event = 'circuit.imported')  as imports,
      (select count(*) from syncrofit_events se where se.circuit_id = sl.token and se.event = 'circuit.completed') as completions,
      (select max(se.received_at) from syncrofit_events se where se.circuit_id = sl.token) as last_activity
    from share_links sl
    where sl.client_id = ${params.clientId} and sl.tenant_id = ${t.tenant.id}
    order by sl.created_at desc
  `;

  const [profile, metrics] = await Promise.all([fetchProfile(params.clientId), fetchMetricsSummary(params.clientId)]);

  return NextResponse.json({
    client: c[0],
    shares,
    profile: toProfileJson(profile),
    metrics,
  });
}
