import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { isAdmin } from '@/lib/is-admin';
import { termSlug, checkSetParent, type TermKind } from '@/lib/taxonomy';
import { renameTerm } from '@/lib/taxonomy-db';
import { termDependents, termUsage } from '@/lib/lifecycle-db';
import { checkScopeMove, deleteEffect, usageSummary } from '@/lib/lifecycle';

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

  // Every live term of this kind, at every scope, with what depends on it — the
  // admin manages the whole vocabulary here, not just the review queue.
  // parent_id + parent_name (self-joined) let the page group muscle groups into
  // region → children without a second round trip, and let a child say "Part of
  // <Parent>" even when a filter (review/archived) leaves its parent out of view.
  const terms = await sql`
    select t.id, t.name, t.normalized, t.category, t.status, t.created_at, t.archived_at,
      t.parent_id,
      pr.name as parent_name,
      p.name as proposed_by,
      p.id   as proposed_by_id,
      (t.status in ('core','approved')) as is_global,
      (select count(*) from tenant_terms tt where tt.term_id = t.id)::int as gyms_using,
      (case when t.kind = 'muscle_group'
            then (select count(*) from exercises e where e.muscle_group = t.name)
            else (select count(*) from exercises e where replace(t.normalized, ' ', '-') = any(e.tags))
       end)::int as exercises_using,
      (select count(*) from taxonomy_terms c where c.parent_id = t.id and c.archived_at is null)::int as children_using
    from taxonomy_terms t
    left join tenants p on p.id = t.created_by_tenant_id
    left join taxonomy_terms pr on pr.id = t.parent_id
    where t.kind = ${kind} and t.status not in ('merged', 'rejected')
    order by
      (t.status = 'pending') desc,
      (select count(*) from tenant_terms tt where tt.term_id = t.id) desc,
      t.name
  `;
  const canonical = await sql`
    select id, name, normalized from taxonomy_terms
    where kind = ${kind} and status in ('core', 'approved') and archived_at is null
    order by name
  `;
  const gyms = await sql`select id, name from tenants order by name`;
  return NextResponse.json({
    terms,
    // Kept for the review-queue view.
    pending: terms.filter((t) => t.status === 'pending' && !t.archived_at),
    canonical,
    gyms,
  });
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: {
    id?: string;
    action?:
      | 'approve'
      | 'reject'
      | 'merge'
      | 'rename'
      | 'archive'
      | 'restore'
      | 'delete'
      | 'promote'
      | 'demote'
      | 'set-parent';
    mergeInto?: string;
    name?: string;
    /** Which gym takes ownership on demote. */
    tenantId?: string;
    /** New parent for set-parent, or null/omitted to clear to top-level. */
    parentId?: string | null;
  };
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

  // ── Update ────────────────────────────────────────────────────────────────
  if (action === 'rename') {
    const result = await renameTerm(id, body.name ?? '');
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 409 });
    return NextResponse.json({ ok: true, term: result.term });
  }

  // ── Grouping (muscle_group only) ────────────────────────────────────────────
  // A region ("Upper Body") is an ordinary muscle_group row with children — no
  // new kind. Strictly 2 levels: enforced here in app code (checkSetParent),
  // the same way merge's same-kind check is, rather than a DB trigger.
  if (action === 'set-parent') {
    const term = (await sql`select id, kind, name from taxonomy_terms where id = ${id}`)[0];
    if (!term) return NextResponse.json({ error: 'Unknown term.' }, { status: 404 });

    const parentId = body.parentId ?? null;
    const parentRow = parentId
      ? ((await sql`select id, kind, parent_id from taxonomy_terms where id = ${parentId}`)[0] ?? null)
      : null;
    if (parentId && !parentRow) return NextResponse.json({ error: 'Unknown parent.' }, { status: 404 });

    const usage = await termUsage(id); // usage.children tells us if this term is itself already a parent
    const check = checkSetParent(
      { id: term.id, name: term.name, kind: term.kind as TermKind, hasChildren: usage.children > 0 },
      parentRow
        ? { id: parentRow.id, kind: parentRow.kind as TermKind, hasParent: !!parentRow.parent_id }
        : null,
    );
    if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 409 });

    await sql`update taxonomy_terms set parent_id = ${parentId} where id = ${id}`;
    return NextResponse.json({ ok: true, parentId });
  }

  // ── Scope ─────────────────────────────────────────────────────────────────
  // Promote: gym-level → shared. Always safe, strictly more people can see it.
  if (action === 'promote') {
    const rows = await sql`
      update taxonomy_terms set status = 'approved'
      where id = ${id} and status = 'pending'
      returning id, name
    `;
    if (!rows[0]) return NextResponse.json({ error: 'Already global.' }, { status: 409 });
    return NextResponse.json({ ok: true, status: 'approved', scope: 'global' });
  }

  // Demote: shared → one gym's own. Blocked while other gyms depend on it, so we
  // can't silently pull a term out from under someone's library.
  if (action === 'demote') {
    if (!body.tenantId) return NextResponse.json({ error: 'Pick which gym owns it.' }, { status: 400 });
    const term = (await sql`select id, name, status from taxonomy_terms where id = ${id}`)[0];
    if (!term) return NextResponse.json({ error: 'Unknown term.' }, { status: 404 });
    if (term.status === 'pending') {
      return NextResponse.json({ error: 'Already gym-level.' }, { status: 409 });
    }

    // A region with live children can't go gym-only — that would leave a
    // partially-visible region (children global, parent suddenly one gym's).
    const usage = await termUsage(id);
    if (usage.children > 0) {
      return NextResponse.json(
        {
          error: `“${term.name}” groups ${usage.children} child ${usage.children === 1 ? 'group' : 'groups'} — ungroup them first.`,
        },
        { status: 409 },
      );
    }

    const dependents = await termDependents(id, body.tenantId);
    const check = checkScopeMove({ from: 'global', to: 'tenant' }, dependents);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason, dependents }, { status: 409 });
    }

    await sql`
      update taxonomy_terms set status = 'pending', created_by_tenant_id = ${body.tenantId}
      where id = ${id}
    `;
    await sql`
      insert into tenant_terms (tenant_id, term_id) values (${body.tenantId}, ${id})
      on conflict do nothing
    `;
    return NextResponse.json({ ok: true, status: 'pending', scope: 'tenant' });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  // Unused → really gone. In use → archived, so exercises already tagged with it
  // keep resolving.
  if (action === 'delete') {
    const term = (await sql`select id, name from taxonomy_terms where id = ${id}`)[0];
    if (!term) return NextResponse.json({ error: 'Unknown term.' }, { status: 404 });
    const usage = await termUsage(id);
    if (deleteEffect(usage) === 'archived') {
      await sql`update taxonomy_terms set archived_at = now(), archived_by = 'admin' where id = ${id}`;
      return NextResponse.json({ ok: true, effect: 'archived', usage, summary: usageSummary(usage) });
    }
    await sql`delete from taxonomy_terms where id = ${id}`;
    return NextResponse.json({ ok: true, effect: 'deleted', usage });
  }

  if (action === 'archive') {
    await sql`update taxonomy_terms set archived_at = now(), archived_by = 'admin' where id = ${id}`;
    return NextResponse.json({ ok: true, archived: true });
  }

  if (action === 'restore') {
    await sql`update taxonomy_terms set archived_at = null, archived_by = null where id = ${id}`;
    return NextResponse.json({ ok: true, archived: false });
  }

  if (action === 'merge') {
    if (!mergeInto) return NextResponse.json({ error: 'mergeInto is required' }, { status: 400 });
    const rows = await sql`
      select id, kind, name, normalized, parent_id from taxonomy_terms where id in (${id}, ${mergeInto})
    `;
    const source = rows.find((r) => r.id === id);
    const target = rows.find((r) => r.id === mergeInto);
    if (!source || !target) return NextResponse.json({ error: 'Unknown term.' }, { status: 404 });
    if (source.kind !== target.kind) {
      return NextResponse.json({ error: "Can't merge across kinds." }, { status: 400 });
    }

    // A parent's children are about to be re-pointed at the target (below). If
    // the target itself already has a parent, that repoint would nest a region
    // three deep — the same 2-level invariant set-parent enforces.
    if (source.kind === 'muscle_group' && target.parent_id) {
      const childCount =
        (await sql`select count(*)::int n from taxonomy_terms where parent_id = ${id} and archived_at is null`)[0]
          ?.n ?? 0;
      if (childCount > 0) {
        return NextResponse.json(
          { error: 'The target already belongs to a region — merging would nest regions three deep.' },
          { status: 409 },
        );
      }
    }

    // Heal the references before marking it merged, so nothing points at a term
    // that's no longer offered. Exercises store the DISPLAY value, so the rewrite
    // is on the value, not an id.
    if (source.kind === 'muscle_group') {
      await sql`update exercises set muscle_group = ${target.name} where muscle_group = ${source.name}`;
      // Re-point the merged parent's children onto the target, so a merge never
      // orphans a child region pointing at a row that's no longer offered.
      await sql`update taxonomy_terms set parent_id = ${mergeInto} where parent_id = ${id}`;
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
