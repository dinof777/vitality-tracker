import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSql } from '@/lib/db';
import { isAdmin } from '@/lib/is-admin';
import { exerciseDependents, exerciseUsage } from '@/lib/lifecycle-db';
import { checkScopeMove, deleteEffect, usageSummary } from '@/lib/lifecycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin lifecycle for exercises at BOTH scopes. A trainer can only ever touch
// their own gym's moves (/api/tenant/exercises); this is the layer that can also
// edit the shared library and move a move between the two.
//
//   global  → is_global = true,  tenant_id = null   (everyone)
//   tenant  → is_global = false, tenant_id = <gym>  (one gym)
//
// Promoting a gym's move to global is always safe. Demoting is blocked while
// other gyms depend on it — same rule as the taxonomy.

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'all'; // all | global | tenant
  const q = (url.searchParams.get('q') ?? '').trim();

  const rows = await sql`
    select e.id, e.name, e.muscle_group, e.equipment, e.equipment_catalog_id,
           e.default_cue, e.image_url, coalesce(e.tags, '{}') as tags,
           e.is_global, e.tenant_id, e.archived_at, t.name as gym_name,
           (select count(*) from routine_exercises re where re.exercise_id = e.id)::int as routines,
           (select count(*) from log_entries le      where le.exercise_id = e.id)::int as log_entries,
           (select count(*) from exercise_aliases a  where a.exercise_id = e.id)::int as aliases
    from exercises e
    left join tenants t on t.id = e.tenant_id
    where (${scope} = 'all'
           or (${scope} = 'global' and e.is_global)
           or (${scope} = 'tenant' and e.tenant_id is not null))
      and (${q} = '' or e.name ilike ${'%' + q + '%'})
    order by e.archived_at nulls first, e.is_global desc, e.name
    limit 300
  `;
  const gyms = await sql`select id, name from tenants order by name`;
  return NextResponse.json({ exercises: rows, gyms });
}

// An admin exercise edit/promote/demote/delete/archive/restore can change a
// GLOBAL move, which feeds every tenant's tenantLibrary() (not just one gym's)
// — so this invalidates broadly rather than per-tenant, mirroring
// app/api/admin/equipment/route.ts (DECISION.md item 4).
function invalidateAllTenants() {
  revalidateTag('tenant-library');
  revalidatePath('/g/[slug]', 'page');
  revalidatePath('/g/[slug]/exercises', 'page');
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: {
    id?: string;
    action?: 'edit' | 'promote' | 'demote' | 'delete' | 'archive' | 'restore';
    name?: string;
    muscle_group?: string;
    default_cue?: string;
    /** Which gym takes ownership on demote. */
    tenantId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, action } = body;
  if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 });

  const ex = (await sql`select id, name, is_global, tenant_id from exercises where id = ${id}`)[0];
  if (!ex) return NextResponse.json({ error: 'Unknown exercise.' }, { status: 404 });

  // ── Update ────────────────────────────────────────────────────────────────
  if (action === 'edit') {
    const name = (body.name ?? '').trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    // Admin edits the shared library, where the muscle group is whatever the
    // canon says — validated against global terms rather than one gym's.
    const muscle = (body.muscle_group ?? '').trim().slice(0, 40) || null;
    if (muscle) {
      const ok = (await sql`
        select 1 from taxonomy_terms
        where kind = 'muscle_group' and name = ${muscle}
          and status in ('core','approved') and archived_at is null
      `)[0];
      if (!ok) return NextResponse.json({ error: 'Muscle group must be a shared term.' }, { status: 400 });
    }
    const rows = await sql`
      update exercises
      set name = ${name}, muscle_group = ${muscle}, default_cue = ${(body.default_cue ?? '').trim().slice(0, 200) || null}
      where id = ${id}
      returning id, name, muscle_group, default_cue, is_global, tenant_id, archived_at
    `;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, exercise: rows[0] });
  }

  // ── Scope ─────────────────────────────────────────────────────────────────
  if (action === 'promote') {
    if (ex.is_global) return NextResponse.json({ error: 'Already in the shared library.' }, { status: 409 });
    const rows = await sql`
      update exercises set is_global = true, tenant_id = null where id = ${id}
      returning id, name, is_global, tenant_id
    `;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, scope: 'global', exercise: rows[0] });
  }

  if (action === 'demote') {
    if (!body.tenantId) return NextResponse.json({ error: 'Pick which gym owns it.' }, { status: 400 });
    if (!ex.is_global) return NextResponse.json({ error: 'Already gym-level.' }, { status: 409 });

    const dependents = await exerciseDependents(id, body.tenantId);
    const check = checkScopeMove({ from: 'global', to: 'tenant' }, dependents);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason, dependents }, { status: 409 });
    }

    const rows = await sql`
      update exercises set is_global = false, tenant_id = ${body.tenantId} where id = ${id}
      returning id, name, is_global, tenant_id
    `;
    // Aliases belonging to gyms that no longer see the move would be dead rows.
    await sql`delete from exercise_aliases where exercise_id = ${id} and tenant_id <> ${body.tenantId}`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, scope: 'tenant', exercise: rows[0] });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if (action === 'delete') {
    const usage = await exerciseUsage(id);
    if (deleteEffect(usage) === 'archived') {
      await sql`update exercises set archived_at = now(), archived_by = 'admin' where id = ${id}`;
      invalidateAllTenants();
      return NextResponse.json({ ok: true, effect: 'archived', usage, summary: usageSummary(usage) });
    }
    await sql`delete from exercises where id = ${id}`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, effect: 'deleted', usage });
  }

  if (action === 'archive') {
    await sql`update exercises set archived_at = now(), archived_by = 'admin' where id = ${id}`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, archived: true });
  }

  if (action === 'restore') {
    await sql`update exercises set archived_at = null, archived_by = null where id = ${id}`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, archived: false });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
