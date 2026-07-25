import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';
import { TAG_BY_ID } from '@/lib/tags';
import { EQUIPMENT_ORDER } from '@/lib/exercises';
import { resolveTermName, tenantTagIds } from '@/lib/taxonomy-db';
import { findSimilarExercise } from '@/lib/exercise-dedup';
import { exerciseUsage } from '@/lib/lifecycle-db';
import { deleteEffect, usageSummary } from '@/lib/lifecycle';
import type { Tenant } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_EQUIP = new Set<string>(EQUIPMENT_ORDER);

// A custom-exercise add/edit/archive/delete changes tenantLibrary()'s output
// for this gym — invalidate it + the public pages immediately (DECISION.md
// item 4) instead of waiting out the hour-long revalidate window.
function invalidateTenant(tenant: Tenant) {
  revalidateTag(`tenant:${tenant.id}`);
  revalidatePath(`/g/${tenant.slug}`);
  revalidatePath(`/g/${tenant.slug}/exercises`);
}

type Sql = NonNullable<ReturnType<typeof getSql>>;

interface FieldInput {
  muscle_group?: string;
  equipment?: string;
  default_cue?: string;
  tags?: string[];
}

interface ResolvedFields {
  muscle: string | null;
  equipment: string | null;
  equipmentCatalogId: string | null;
  cue: string | null;
  tags: string[];
}

/**
 * Validate every governed field once, so create and edit can't drift apart —
 * the classic way an "edit" path becomes a hole in the rules the "add" path
 * enforces.
 */
async function resolveFields(
  sql: Sql,
  tenantId: string,
  body: FieldInput,
): Promise<ResolvedFields | { error: string }> {
  // Muscle group must be a term this gym may use; store the term's canonical
  // name so casing and spelling are always the one way.
  let muscle: string | null = null;
  const rawMuscle = (body.muscle_group ?? '').trim();
  if (rawMuscle) {
    muscle = await resolveTermName(tenantId, 'muscle_group', rawMuscle);
    if (!muscle) return { error: 'Pick a muscle group from the list, or add it first.' };
  }

  // Equipment: a core slug, or this gym's custom equipment (cat:<id>).
  const rawEquip = (body.equipment ?? '').trim();
  let equipment: string | null = null;
  let equipmentCatalogId: string | null = null;
  if (rawEquip.startsWith('cat:')) {
    const catId = rawEquip.slice(4);
    const ok = await sql`
      select 1 from equipment_catalog c
      where c.id = ${catId}
        and (c.status in ('core','approved')
             or c.created_by_tenant_id = ${tenantId}
             or exists(select 1 from tenant_equipment te where te.catalog_id = c.id and te.tenant_id = ${tenantId}))
      limit 1
    `;
    if (!ok[0]) return { error: 'Unknown equipment.' };
    equipmentCatalogId = catId;
  } else {
    if (!VALID_EQUIP.has(rawEquip)) return { error: 'Pick a valid equipment type.' };
    equipment = rawEquip;
  }

  // Tags: the built-in registry plus any this gym has added. No free-text sprawl.
  const gymTags = await tenantTagIds(tenantId);
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => TAG_BY_ID[t] || gymTags.has(t)).slice(0, 12)
    : [];

  return {
    muscle,
    equipment,
    equipmentCatalogId,
    cue: (body.default_cue ?? '').trim().slice(0, 200) || null,
    tags,
  };
}

/**
 * Near-duplicate name → offer the per-gym rename instead of forking the library.
 * Returns the 409 body, or null when the name is clear. `excludeId` keeps a move
 * from matching itself while being edited.
 */
async function findNameClash(sql: Sql, tenantId: string, name: string, excludeId?: string) {
  const existing = await sql`
    select e.id, coalesce(a.name, e.name) as name
    from exercises e
    left join exercise_aliases a on a.exercise_id = e.id and a.tenant_id = ${tenantId}
    where (e.is_global or e.tenant_id = ${tenantId})
      and e.archived_at is null
      and (${excludeId ?? null}::uuid is null or e.id <> ${excludeId ?? null}::uuid)
  `;
  const similar = findSimilarExercise(name, existing as Array<{ id: string; name: string }>);
  if (!similar.match) return null;
  return {
    similar: similar.match,
    reason: similar.reason,
    message: `The library already has “${similar.match.name}”. Rename it for your gym instead of adding a second copy — that keeps everyone's logged history on one exercise.`,
  };
}

// A gym's own custom exercises (on top of the global library). All routes are
// scoped to the signed-in trainer's tenant. Equipment is either one of the 9
// core slugs, or "cat:<catalogId>" for the gym's own custom equipment.
//
// Every vocabulary field is governed (see lib/taxonomy): muscle group must
// resolve to a term this gym may use, and tags to the registry or the gym's own.
// The name is checked for near-duplicates but never blocked — see POST.

export async function GET() {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  // Usage travels with each row so the UI can say what a delete will actually do
  // before the trainer commits to it.
  const rows = await sql`
    select e.id, e.name, e.muscle_group, e.equipment, e.equipment_catalog_id,
           ec.name as custom_equip_name, e.default_cue, e.image_url,
           coalesce(e.tags, '{}') as tags, e.archived_at,
           (select count(*) from routine_exercises re where re.exercise_id = e.id)::int as routines,
           (select count(*) from log_entries le      where le.exercise_id = e.id)::int as log_entries,
           (select count(*) from exercise_aliases a  where a.exercise_id = e.id)::int as aliases
    from exercises e
    left join equipment_catalog ec on ec.id = e.equipment_catalog_id
    where e.tenant_id = ${tenant.id}
    order by e.archived_at nulls first, e.created_at desc
  `;
  return NextResponse.json({ custom: rows });
}

export async function POST(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: {
    name?: string;
    muscle_group?: string;
    equipment?: string;
    default_cue?: string;
    tags?: string[];
    /** Set once the trainer has confirmed this really is a different movement. */
    confirmDistinct?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const resolved = await resolveFields(sql, tenant.id, body);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });

  // Near-duplicate name → offer the alias instead of forking the library. This is
  // a suggestion, not a rule: the trainer can confirm it's a different movement.
  if (!body.confirmDistinct) {
    const clash = await findNameClash(sql, tenant.id, name);
    if (clash) return NextResponse.json(clash, { status: 409 });
  }

  const rows = await sql`
    insert into exercises (name, muscle_group, equipment, equipment_catalog_id, default_cue, tenant_id, is_global, tags)
    values (${name}, ${resolved.muscle}, ${resolved.equipment}, ${resolved.equipmentCatalogId}, ${resolved.cue}, ${tenant.id}, false, ${resolved.tags})
    returning id, name, muscle_group, equipment, equipment_catalog_id, default_cue, image_url, tags, archived_at
  `;
  invalidateTenant(tenant);
  return NextResponse.json({ exercise: rows[0] }, { status: 201 });
}

// Edit a custom move in place. Every vocabulary field runs the same governance
// as POST; the name check is skipped when the name hasn't changed, so editing a
// cue doesn't re-prompt about a duplicate the trainer already resolved.
export async function PATCH(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: {
    id?: string;
    name?: string;
    muscle_group?: string;
    equipment?: string;
    default_cue?: string;
    tags?: string[];
    confirmDistinct?: boolean;
    /** Restore an archived move back into the library. */
    restore?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const owned = (await sql`
    select id, name, archived_at from exercises where id = ${body.id} and tenant_id = ${tenant.id}
  `)[0];
  if (!owned) return NextResponse.json({ error: 'Not your exercise.' }, { status: 404 });

  if (body.restore) {
    const rows = await sql`
      update exercises set archived_at = null, archived_by = null
      where id = ${body.id} and tenant_id = ${tenant.id}
      returning id, name, muscle_group, equipment, equipment_catalog_id, default_cue, image_url, tags, archived_at
    `;
    invalidateTenant(tenant);
    return NextResponse.json({ exercise: rows[0], restored: true });
  }

  const name = (body.name ?? '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const resolved = await resolveFields(sql, tenant.id, body);
  if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });

  // Only re-check the name if it actually changed.
  if (name !== owned.name && !body.confirmDistinct) {
    const clash = await findNameClash(sql, tenant.id, name, body.id);
    if (clash) return NextResponse.json(clash, { status: 409 });
  }

  const rows = await sql`
    update exercises set
      name = ${name},
      muscle_group = ${resolved.muscle},
      equipment = ${resolved.equipment},
      equipment_catalog_id = ${resolved.equipmentCatalogId},
      default_cue = ${resolved.cue},
      tags = ${resolved.tags}
    where id = ${body.id} and tenant_id = ${tenant.id}
    returning id, name, muscle_group, equipment, equipment_catalog_id, default_cue, image_url, tags, archived_at
  `;
  invalidateTenant(tenant);
  return NextResponse.json({ exercise: rows[0] });
}

// Unused → really deleted. In use → archived, because routine_exercises and
// log_entries cascade off this row: a hard delete would destroy the training
// history the move is the evidence for. GET ?id=…&preview=1 to ask first.
export async function DELETE(req: Request) {
  const tenant = await currentTenant();
  if (!tenant) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const owned = (await sql`select id, name from exercises where id = ${id} and tenant_id = ${tenant.id}`)[0];
  if (!owned) return NextResponse.json({ error: 'Not your exercise.' }, { status: 404 });

  const usage = await exerciseUsage(id);
  if (deleteEffect(usage) === 'archived') {
    await sql`
      update exercises set archived_at = now(), archived_by = ${tenant.name}
      where id = ${id} and tenant_id = ${tenant.id}
    `;
    invalidateTenant(tenant);
    return NextResponse.json({ ok: true, effect: 'archived', usage, summary: usageSummary(usage) });
  }
  await sql`delete from exercises where id = ${id} and tenant_id = ${tenant.id}`;
  invalidateTenant(tenant);
  return NextResponse.json({ ok: true, effect: 'deleted', usage });
}
