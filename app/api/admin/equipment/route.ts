import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSql } from '@/lib/db';
import { isAdmin } from '@/lib/is-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Moderation of the global equipment catalog. The dedup engine prevents most
// duplicates at add-time; this is the human backstop — approve a proposal into
// the shared (SyncroFit) set, reject it, or merge it into an existing piece.

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  // Every live piece of equipment (core + approved + still-pending proposals) —
  // the admin browses and manages the whole catalog here, not just the review
  // queue. Pending sorts first so what needs attention is on top even in "All".
  const items = await sql`
    select c.id, c.name, c.normalized, c.status, c.created_at,
      t.name as proposed_by,
      (select count(*) from tenant_equipment te where te.catalog_id = c.id)::int as gyms_using
    from equipment_catalog c
    left join tenants t on t.id = c.created_by_tenant_id
    where c.status not in ('rejected', 'merged')
    order by
      (c.status = 'pending') desc,
      (select count(*) from tenant_equipment te where te.catalog_id = c.id) desc,
      c.name
  `;
  // Possible merge targets (the canonical set).
  const canonical = await sql`
    select id, name from equipment_catalog where status in ('core', 'approved') order by name
  `;
  return NextResponse.json({ items, canonical });
}

// A catalog moderation action (approve/reject/merge) is global — it can shift
// what any tenant's equipment picks resolve to, not just one gym's. Blow away
// every cached tenantEquipmentSlugs()/tenantLibrary() entry and every tenant's
// public-page ISR cache rather than trying to enumerate affected tenants
// (DECISION.md item 4 — this is the admin/global counterpart to the per-tenant
// hooks in app/api/tenant/equipment/route.ts).
function invalidateAllTenants() {
  revalidateTag('tenant-equipment');
  revalidateTag('tenant-library');
  revalidatePath('/g/[slug]', 'page');
  revalidatePath('/g/[slug]/exercises', 'page');
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { id?: string; action?: 'approve' | 'reject' | 'merge'; mergeInto?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, action, mergeInto } = body;
  if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 });

  if (action === 'approve') {
    await sql`update equipment_catalog set status = 'approved' where id = ${id} and status = 'pending'`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, status: 'approved' });
  }
  if (action === 'reject') {
    await sql`update equipment_catalog set status = 'rejected' where id = ${id} and status = 'pending'`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, status: 'rejected' });
  }
  if (action === 'merge') {
    if (!mergeInto) return NextResponse.json({ error: 'mergeInto is required' }, { status: 400 });
    // Re-point gyms to the target, dropping rows that would collide, then mark merged.
    await sql`
      delete from tenant_equipment
      where catalog_id = ${id}
        and exists (select 1 from tenant_equipment t2 where t2.tenant_id = tenant_equipment.tenant_id and t2.catalog_id = ${mergeInto})
    `;
    await sql`update tenant_equipment set catalog_id = ${mergeInto} where catalog_id = ${id}`;
    await sql`update equipment_catalog set status = 'merged', merged_into = ${mergeInto} where id = ${id}`;
    invalidateAllTenants();
    return NextResponse.json({ ok: true, status: 'merged' });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
