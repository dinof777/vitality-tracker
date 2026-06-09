import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTrainer } from '@/lib/current-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A gym's clients. Scoped per-trainer: a trainer sees only the clients they
// created; the gym owner (org admin) sees every trainer's. Engagement rolls up
// from each client's shares (opens + SyncroFit completions).

export async function GET() {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
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
    where c.tenant_id = ${t.tenant.id} and (${t.isOwner} or c.owner_user_id = ${t.userId})
    order by c.created_at desc
  `;
  return NextResponse.json({ clients: rows });
}

export async function POST(req: Request) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
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
    insert into clients (tenant_id, name, contact, owner_user_id)
    values (${t.tenant.id}, ${name}, ${contact}, ${t.userId})
    returning id, name, contact
  `;
  return NextResponse.json({ client: rows[0] }, { status: 201 });
}

export async function DELETE(req: Request) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await sql`
    delete from clients
    where id = ${id} and tenant_id = ${t.tenant.id} and (${t.isOwner} or owner_user_id = ${t.userId})
  `;
  return NextResponse.json({ ok: true });
}
