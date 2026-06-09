import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The gym's clients (no login of their own). Engagement is rolled up from their
// shares: opens (from share_links.opens) and SyncroFit completions (events whose
// circuit_id matches a share token assigned to that client).

export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const rows = await sql`
    select c.id, c.name, c.contact,
      (select count(*) from share_links sl where sl.client_id = c.id) as shares,
      (select coalesce(sum(sl.opens), 0) from share_links sl where sl.client_id = c.id) as opens,
      (select count(*) from syncrofit_events se
         join share_links sl on sl.token = se.circuit_id
        where sl.client_id = c.id and se.event = 'circuit.completed') as completions
    from clients c
    where c.tenant_id = ${tenant.id}
    order by c.created_at desc
  `;
  return NextResponse.json({ clients: rows });
}

export async function POST(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { name?: string; contact?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = (body.name ?? '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const contact = (body.contact ?? '').trim().slice(0, 120) || null;

  const rows = await sql`
    insert into clients (tenant_id, name, contact) values (${tenant.id}, ${name}, ${contact})
    returning id, name, contact
  `;
  return NextResponse.json({ client: rows[0] }, { status: 201 });
}

export async function DELETE(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await sql`delete from clients where id = ${id} and tenant_id = ${tenant.id}`;
  return NextResponse.json({ ok: true });
}
