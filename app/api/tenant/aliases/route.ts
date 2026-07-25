import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';
import type { Tenant } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-tenant LOCAL exercise renames. An alias overrides an exercise's display
// name for this gym only — it never changes the global library for anyone else.

// An alias changes the `name` column tenantLibrary() returns for this gym —
// invalidate that gym's cached library + its public page immediately (see
// DECISION.md item 4) rather than waiting out the hour.
function invalidateTenant(tenant: Tenant) {
  revalidateTag(`tenant:${tenant.id}`);
  revalidatePath(`/g/${tenant.slug}`);
  revalidatePath(`/g/${tenant.slug}/exercises`);
}

export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const rows = await sql`select exercise_id, name from exercise_aliases where tenant_id = ${tenant.id}`;
  const map: Record<string, string> = {};
  for (const r of rows as Array<{ exercise_id: string; name: string }>) map[r.exercise_id] = r.name;
  return NextResponse.json({ aliases: map });
}

export async function PUT(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { exerciseId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const exerciseId = (body.exerciseId ?? '').trim();
  const name = (body.name ?? '').trim().slice(0, 80);
  if (!exerciseId) return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 });

  // Empty name → clear the alias (revert to the global name).
  if (!name) {
    await sql`delete from exercise_aliases where tenant_id = ${tenant.id} and exercise_id = ${exerciseId}`;
    invalidateTenant(tenant);
    return NextResponse.json({ ok: true, cleared: true });
  }

  await sql`
    insert into exercise_aliases (tenant_id, exercise_id, name)
    values (${tenant.id}, ${exerciseId}, ${name})
    on conflict (tenant_id, exercise_id) do update set name = excluded.name
  `;
  invalidateTenant(tenant);
  return NextResponse.json({ ok: true, exerciseId, name });
}

export async function DELETE(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const exerciseId = new URL(req.url).searchParams.get('exerciseId');
  if (!exerciseId) return NextResponse.json({ error: 'exerciseId is required' }, { status: 400 });
  await sql`delete from exercise_aliases where tenant_id = ${tenant.id} and exercise_id = ${exerciseId}`;
  invalidateTenant(tenant);
  return NextResponse.json({ ok: true });
}
