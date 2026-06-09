import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';
import { findEquipDuplicate, normalizeEquip, type EquipRef } from '@/lib/equipment-normalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A gym's equipment = the 9 core + anything the gym has added. Adding dedupes
// against (core + globally-approved + this gym's) so the catalog can't sprawl;
// a genuinely-new piece is created as a global 'pending' proposal (for SyncroFit
// moderation) AND added to this gym immediately.

export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const rows = await sql`
    select c.id, c.name, c.status,
      (c.status = 'core') as is_core,
      exists(select 1 from tenant_equipment te where te.catalog_id = c.id and te.tenant_id = ${tenant.id}) as added
    from equipment_catalog c
    where c.status = 'core'
       or exists(select 1 from tenant_equipment te where te.catalog_id = c.id and te.tenant_id = ${tenant.id})
    order by (c.status = 'core') desc, c.name
  `;
  return NextResponse.json({ equipment: rows });
}

export async function POST(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { name?: string; catalogId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Accept a suggested existing piece → just link it to this gym.
  if (body.catalogId) {
    const ok = await sql`select id from equipment_catalog where id = ${body.catalogId} and status <> 'rejected'`;
    if (!ok[0]) return NextResponse.json({ error: 'Unknown equipment.' }, { status: 400 });
    await sql`insert into tenant_equipment (tenant_id, catalog_id) values (${tenant.id}, ${body.catalogId}) on conflict do nothing`;
    return NextResponse.json({ linked: true, catalogId: body.catalogId });
  }

  const name = (body.name ?? '').trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const normalized = normalizeEquip(name);
  if (!normalized) return NextResponse.json({ error: 'Give it a real name.' }, { status: 400 });

  // Candidates to dedupe against: core + approved globally + anything this gym touches.
  const existing = (await sql`
    select id, name, normalized from equipment_catalog c
    where c.status in ('core','approved')
       or c.created_by_tenant_id = ${tenant.id}
       or exists(select 1 from tenant_equipment te where te.catalog_id = c.id and te.tenant_id = ${tenant.id})
  `) as EquipRef[];

  const dup = findEquipDuplicate(name, existing);
  if (dup.match) {
    return NextResponse.json({ duplicate: dup.match, reason: dup.reason }, { status: 409 });
  }

  // New piece → global 'pending' proposal + add to this gym now.
  const created = await sql`
    insert into equipment_catalog (name, normalized, status, created_by_tenant_id)
    values (${name}, ${normalized}, 'pending', ${tenant.id})
    on conflict (normalized) do update set name = equipment_catalog.name
    returning id, name, status
  `;
  await sql`insert into tenant_equipment (tenant_id, catalog_id) values (${tenant.id}, ${created[0].id}) on conflict do nothing`;
  return NextResponse.json({ created: created[0] }, { status: 201 });
}

export async function DELETE(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const catalogId = new URL(req.url).searchParams.get('catalogId');
  if (!catalogId) return NextResponse.json({ error: 'catalogId is required' }, { status: 400 });
  await sql`delete from tenant_equipment where tenant_id = ${tenant.id} and catalog_id = ${catalogId}`;
  return NextResponse.json({ ok: true });
}
