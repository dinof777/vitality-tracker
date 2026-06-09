import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// One client + the workouts shared with them, each with its status (from the
// SyncroFit events that reference the share token).
export async function GET(_req: Request, { params }: { params: { clientId: string } }) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const c = await sql`select id, name, contact from clients where id = ${params.clientId} and tenant_id = ${tenant.id}`;
  if (!c[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const shares = await sql`
    select sl.token, sl.name, sl.created_at, sl.opens,
      (select count(*) from syncrofit_events se where se.circuit_id = sl.token and se.event = 'circuit.imported')  as imports,
      (select count(*) from syncrofit_events se where se.circuit_id = sl.token and se.event = 'circuit.completed') as completions,
      (select max(se.received_at) from syncrofit_events se where se.circuit_id = sl.token) as last_activity
    from share_links sl
    where sl.client_id = ${params.clientId} and sl.tenant_id = ${tenant.id}
    order by sl.created_at desc
  `;

  return NextResponse.json({ client: c[0], shares });
}
