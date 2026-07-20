import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';
import { TAG_BY_ID } from '@/lib/tags';
import { EQUIPMENT_ORDER } from '@/lib/exercises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_EQUIP = new Set<string>(EQUIPMENT_ORDER);

// A gym's own custom exercises (on top of the global library). All routes are
// scoped to the signed-in trainer's tenant. Equipment is either one of the 9
// core slugs, or "cat:<catalogId>" for the gym's own custom equipment.

export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const rows = await sql`
    select e.id, e.name, e.muscle_group, e.equipment, e.equipment_catalog_id,
           ec.name as custom_equip_name, e.default_cue, e.image_url, coalesce(e.tags, '{}') as tags
    from exercises e
    left join equipment_catalog ec on ec.id = e.equipment_catalog_id
    where e.tenant_id = ${tenant.id}
    order by e.created_at desc
  `;
  return NextResponse.json({ custom: rows });
}

export async function POST(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { name?: string; muscle_group?: string; equipment?: string; default_cue?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 80);
  const rawEquip = (body.equipment ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const muscle = (body.muscle_group ?? '').trim().slice(0, 40) || null;
  const cue = (body.default_cue ?? '').trim().slice(0, 200) || null;

  // Resolve equipment: a core slug, or this gym's custom equipment (cat:<id>).
  let equipment: string | null = null;
  let equipmentCatalogId: string | null = null;
  if (rawEquip.startsWith('cat:')) {
    const catId = rawEquip.slice(4);
    const ok = await sql`
      select 1 from equipment_catalog c
      where c.id = ${catId}
        and (c.status in ('core','approved')
             or c.created_by_tenant_id = ${tenant.id}
             or exists(select 1 from tenant_equipment te where te.catalog_id = c.id and te.tenant_id = ${tenant.id}))
      limit 1
    `;
    if (!ok[0]) return NextResponse.json({ error: 'Unknown equipment.' }, { status: 400 });
    equipmentCatalogId = catId;
  } else {
    if (!VALID_EQUIP.has(rawEquip)) return NextResponse.json({ error: 'Pick a valid equipment type.' }, { status: 400 });
    equipment = rawEquip;
  }

  // Only accept tags from the known registry — no free-text tag sprawl.
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => TAG_BY_ID[t]).slice(0, 12) : [];

  const rows = await sql`
    insert into exercises (name, muscle_group, equipment, equipment_catalog_id, default_cue, tenant_id, is_global, tags)
    values (${name}, ${muscle}, ${equipment}, ${equipmentCatalogId}, ${cue}, ${tenant.id}, false, ${tags})
    returning id, name, muscle_group, equipment, equipment_catalog_id, default_cue, image_url, tags
  `;
  return NextResponse.json({ exercise: rows[0] }, { status: 201 });
}

export async function DELETE(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await sql`delete from exercises where id = ${id} and tenant_id = ${tenant.id}`;
  return NextResponse.json({ ok: true });
}
