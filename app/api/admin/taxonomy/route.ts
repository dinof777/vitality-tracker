import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { isAdmin } from '@/lib/is-admin';
import { termSlug, type TermKind } from '@/lib/taxonomy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Moderation of the shared vocabulary. The dedup engine stops most duplicates at
// add-time and popular terms auto-promote, so this is the backstop for what's
// left — and the queue is ranked by how many gyms independently proposed a term,
// so the ones that matter are on top.

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  const kind = (new URL(req.url).searchParams.get('kind') ?? 'muscle_group') as TermKind;

  const pending = await sql`
    select t.id, t.name, t.normalized, t.category, t.created_at,
      p.name as proposed_by,
      (select count(*) from tenant_terms tt where tt.term_id = t.id) as gyms_using,
      (select count(*) from exercises e where e.muscle_group = t.name) as exercises_using
    from taxonomy_terms t
    left join tenants p on p.id = t.created_by_tenant_id
    where t.kind = ${kind} and t.status = 'pending'
    order by (select count(*) from tenant_terms tt where tt.term_id = t.id) desc, t.created_at desc
  `;
  const canonical = await sql`
    select id, name, normalized from taxonomy_terms
    where kind = ${kind} and status in ('core', 'approved')
    order by name
  `;
  return NextResponse.json({ pending, canonical });
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
    await sql`update taxonomy_terms set status = 'approved' where id = ${id} and status = 'pending'`;
    return NextResponse.json({ ok: true, status: 'approved' });
  }

  if (action === 'reject') {
    await sql`update taxonomy_terms set status = 'rejected' where id = ${id} and status = 'pending'`;
    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  if (action === 'merge') {
    if (!mergeInto) return NextResponse.json({ error: 'mergeInto is required' }, { status: 400 });
    const rows = await sql`
      select id, kind, name, normalized from taxonomy_terms where id in (${id}, ${mergeInto})
    `;
    const source = rows.find((r) => r.id === id);
    const target = rows.find((r) => r.id === mergeInto);
    if (!source || !target) return NextResponse.json({ error: 'Unknown term.' }, { status: 404 });
    if (source.kind !== target.kind) {
      return NextResponse.json({ error: "Can't merge across kinds." }, { status: 400 });
    }

    // Heal the references before marking it merged, so nothing points at a term
    // that's no longer offered. Exercises store the DISPLAY value, so the rewrite
    // is on the value, not an id.
    if (source.kind === 'muscle_group') {
      await sql`update exercises set muscle_group = ${target.name} where muscle_group = ${source.name}`;
    } else if (source.kind === 'tag') {
      const from = termSlug(source.normalized as string);
      const to = termSlug(target.normalized as string);
      // array_replace would leave a duplicate where the exercise already had the
      // target tag; dedupe the array afterwards.
      await sql`
        update exercises
        set tags = (select array_agg(distinct x) from unnest(array_replace(tags, ${from}, ${to})) as x)
        where ${from} = any(tags)
      `;
    }

    // Re-point gyms to the target, dropping rows that would collide.
    await sql`
      delete from tenant_terms
      where term_id = ${id}
        and exists (select 1 from tenant_terms t2 where t2.tenant_id = tenant_terms.tenant_id and t2.term_id = ${mergeInto})
    `;
    await sql`update tenant_terms set term_id = ${mergeInto} where term_id = ${id}`;
    await sql`update taxonomy_terms set status = 'merged', merged_into = ${mergeInto} where id = ${id}`;
    return NextResponse.json({ ok: true, status: 'merged' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
