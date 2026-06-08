import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';
import { EQUIPMENT_ORDER } from '@/lib/exercises';
import type { Equipment } from '@/lib/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_EQUIP = new Set<string>(EQUIPMENT_ORDER);

// A gym's own custom exercises (on top of the global library). All routes are
// scoped to the signed-in trainer's tenant — they can only see/edit their own.

export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const rows = await sql`
    select id, name, muscle_group, equipment, default_cue, image_url
    from exercises
    where tenant_id = ${tenant.id}
    order by created_at desc
  `;
  return NextResponse.json({ custom: rows });
}

export async function POST(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { name?: string; muscle_group?: string; equipment?: string; default_cue?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 80);
  const equipment = (body.equipment ?? '').trim() as Equipment;
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (!VALID_EQUIP.has(equipment)) return NextResponse.json({ error: 'Pick a valid equipment type.' }, { status: 400 });

  const muscle = (body.muscle_group ?? '').trim().slice(0, 40) || null;
  const cue = (body.default_cue ?? '').trim().slice(0, 200) || null;

  const rows = await sql`
    insert into exercises (name, muscle_group, equipment, default_cue, tenant_id, is_global)
    values (${name}, ${muscle}, ${equipment}, ${cue}, ${tenant.id}, false)
    returning id, name, muscle_group, equipment, default_cue, image_url
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
  // Scoped: can only delete this tenant's own custom exercise, never the library.
  await sql`delete from exercises where id = ${id} and tenant_id = ${tenant.id}`;
  return NextResponse.json({ ok: true });
}
