import { getSql } from './db';
import {
  findTermDuplicate,
  normalizeTerm,
  termSlug,
  MAX_CUSTOM_TERMS_PER_TENANT,
  MAX_TERM_LENGTH,
  promotionThreshold,
  type TermKind,
  type TermRef,
  type TermStatus,
} from './taxonomy';

// Server-side taxonomy access. Every read is scoped to what one gym is allowed
// to use; every write goes through the dedup engine first. Server-only.

export interface TaxonomyTerm {
  id: string;
  name: string;
  normalized: string;
  category: string | null;
  status: TermStatus;
  /** Part of the curated/shared vocabulary (vs. this gym's own proposal). */
  is_canon: boolean;
  /** Proposed by this gym. */
  is_mine: boolean;
}

/**
 * Everything one gym may use for a kind: the curated canon, anything promoted
 * from another gym's proposal, plus this gym's own pending terms. Canon first,
 * then alphabetical — the order the picker shows.
 */
export async function tenantTerms(tenantId: string, kind: TermKind): Promise<TaxonomyTerm[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select t.id, t.name, t.normalized, t.category, t.status,
           (t.status in ('core', 'approved')) as is_canon,
           (t.created_by_tenant_id = ${tenantId}) as is_mine
    from taxonomy_terms t
    where t.kind = ${kind}
      and t.status <> 'rejected'
      and t.status <> 'merged'
      and t.archived_at is null
      and (t.status in ('core', 'approved')
           or t.created_by_tenant_id = ${tenantId}
           or exists (select 1 from tenant_terms tt
                      where tt.term_id = t.id and tt.tenant_id = ${tenantId}))
    order by (t.status in ('core', 'approved')) desc, t.name
  `;
  return rows as TaxonomyTerm[];
}

export type ResolveResult =
  | { ok: true; term: TaxonomyTerm; folded: boolean }
  | { ok: false; kind: 'duplicate'; match: TermRef; reason: 'exact' | 'synonym' | 'fuzzy' }
  | { ok: false; kind: 'invalid'; message: string }
  | { ok: false; kind: 'limit'; message: string };

/**
 * Add a term to a gym's vocabulary.
 *
 * An exact or synonym match FOLDS silently — the gym just gets the existing term
 * ("abs" selects "Core"), because there's nothing to decide. A fuzzy match is
 * only a guess, so it comes back as a duplicate for the trainer to confirm; pass
 * `force` to create it anyway when they say it's genuinely different.
 *
 * A genuinely-new term is created as a global `pending` proposal AND linked to
 * this gym immediately, so the trainer is never blocked waiting on review.
 */
export async function addTerm(
  tenantId: string,
  kind: TermKind,
  rawName: string,
  opts: { category?: string | null; force?: boolean } = {},
): Promise<ResolveResult> {
  const sql = getSql();
  if (!sql) return { ok: false, kind: 'invalid', message: 'No database' };

  const name = rawName.trim().slice(0, MAX_TERM_LENGTH);
  const normalized = normalizeTerm(name);
  if (!normalized) return { ok: false, kind: 'invalid', message: 'Give it a real name.' };

  // Tags drive faceted filtering, which groups by category — one without a
  // category would be silently dropped from every filter.
  const category = kind === 'tag' ? (opts.category ?? null) : null;
  if (kind === 'tag' && !['goal', 'stage', 'pattern'].includes(category ?? '')) {
    return { ok: false, kind: 'invalid', message: 'Pick what kind of tag this is.' };
  }

  const available = await tenantTerms(tenantId, kind);
  const dup = findTermDuplicate(kind, name, available);

  if (dup.match && (dup.reason !== 'fuzzy' || !opts.force)) {
    const existing = available.find((t) => t.id === dup.match!.id)!;
    // Certain match → fold silently and make sure this gym is linked to it.
    if (dup.reason === 'exact' || dup.reason === 'synonym') {
      await linkTerm(tenantId, existing.id);
      return { ok: true, term: existing, folded: normalizeTerm(name) !== existing.normalized };
    }
    // Fuzzy → a guess. Let the trainer confirm.
    return { ok: false, kind: 'duplicate', match: dup.match, reason: 'fuzzy' };
  }

  const mine = await sql`
    select count(*)::int as n from taxonomy_terms
    where kind = ${kind} and created_by_tenant_id = ${tenantId} and status <> 'rejected'
  `;
  if ((mine[0]?.n ?? 0) >= MAX_CUSTOM_TERMS_PER_TENANT) {
    return {
      ok: false,
      kind: 'limit',
      message: `You've added the maximum of ${MAX_CUSTOM_TERMS_PER_TENANT}. Merge or remove one first.`,
    };
  }

  // New term → global proposal, live for this gym now.
  const created = await sql`
    insert into taxonomy_terms (kind, name, normalized, category, status, created_by_tenant_id)
    values (${kind}, ${name}, ${normalized}, ${category}, 'pending', ${tenantId})
    on conflict (kind, normalized) do update set name = taxonomy_terms.name
    returning id, name, normalized, category, status,
              (status in ('core','approved')) as is_canon, true as is_mine
  `;
  const term = created[0] as TaxonomyTerm;
  await linkTerm(tenantId, term.id);
  await promoteIfPopular(term.id);
  return { ok: true, term, folded: false };
}

/** Record that a gym uses a term. Drives the promotion count. */
export async function linkTerm(tenantId: string, termId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    insert into tenant_terms (tenant_id, term_id) values (${tenantId}, ${termId})
    on conflict do nothing
  `;
}

/** Stop offering a term to this gym. Never deletes the global term. */
export async function unlinkTerm(tenantId: string, termId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`delete from tenant_terms where tenant_id = ${tenantId} and term_id = ${termId}`;
}

/**
 * A pending term that enough independent gyms landed on is a real gap in the
 * canon, not one gym's local naming — promote it without waiting on a human.
 * This is what keeps the review queue small enough to actually review.
 *
 * The bar scales with the platform (see promotionThreshold). The tenant count is
 * read live rather than cached: this runs only from addTerm — i.e. when a trainer
 * writes a new term, never on a picker/read path — so the extra count costs
 * nothing measurable, and a live count can't go stale the way a hand-maintained
 * number does. That staleness is the exact failure this change exists to remove.
 */
export async function promoteIfPopular(termId: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const tenantCount = (await sql`select count(*)::int as n from tenants`)[0]?.n ?? 0;
  const threshold = promotionThreshold(tenantCount);
  const rows = await sql`
    update taxonomy_terms set status = 'approved'
    where id = ${termId}
      and status = 'pending'
      and (select count(*) from tenant_terms where term_id = ${termId}) >= ${threshold}
    returning id
  `;
  return rows.length > 0;
}

/**
 * Validate a display value the client sent against what this gym may use.
 * Returns the term's canonical name (so casing/spelling is always stored the one
 * way), or null when it isn't an allowed term.
 */
export async function resolveTermName(
  tenantId: string,
  kind: TermKind,
  value: string,
): Promise<string | null> {
  const norm = normalizeTerm(value);
  if (!norm) return null;
  const available = await tenantTerms(tenantId, kind);
  return available.find((t) => t.normalized === norm)?.name ?? null;
}

/**
 * Rename a term. The new name must still be unique for its kind, and renaming a
 * muscle group has to carry the exercises with it — they store the display value,
 * so leaving them behind would orphan every exercise using the old spelling.
 */
export async function renameTerm(
  termId: string,
  rawName: string,
): Promise<{ ok: true; term: TaxonomyTerm } | { ok: false; message: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, message: 'No database' };

  const name = rawName.trim().slice(0, MAX_TERM_LENGTH);
  const normalized = normalizeTerm(name);
  if (!normalized) return { ok: false, message: 'Give it a real name.' };

  const term = (await sql`select id, kind, name, normalized from taxonomy_terms where id = ${termId}`)[0];
  if (!term) return { ok: false, message: 'Unknown term.' };

  const clash = (await sql`
    select id, name from taxonomy_terms
    where kind = ${term.kind} and normalized = ${normalized} and id <> ${termId}
  `)[0];
  if (clash) return { ok: false, message: `“${clash.name}” already uses that name — merge into it instead.` };

  // Muscle groups are stored on exercises by display value; move them together.
  if (term.kind === 'muscle_group' && name !== term.name) {
    await sql`update exercises set muscle_group = ${name} where muscle_group = ${term.name}`;
  }
  // Tags are stored by slug, which is derived from `normalized` — rewrite those too.
  if (term.kind === 'tag' && normalized !== term.normalized) {
    const from = termSlug(String(term.normalized));
    const to = termSlug(normalized);
    await sql`
      update exercises
      set tags = (select array_agg(distinct x) from unnest(array_replace(tags, ${from}, ${to})) as x)
      where ${from} = any(tags)
    `;
  }

  const rows = await sql`
    update taxonomy_terms set name = ${name}, normalized = ${normalized}
    where id = ${termId}
    returning id, name, normalized, category, status,
              (status in ('core','approved')) as is_canon, false as is_mine
  `;
  return { ok: true, term: rows[0] as TaxonomyTerm };
}

/** Tag id → term, for every tag this gym may put on an exercise. */
export async function tenantTagIds(tenantId: string): Promise<Map<string, TaxonomyTerm>> {
  const terms = await tenantTerms(tenantId, 'tag');
  return new Map(terms.map((t) => [termSlug(t.normalized), t]));
}

export interface RegionRow {
  region: string;
  groups: string[];
}

/**
 * The admin-managed muscle-group hierarchy — regions with their children, for
 * the builder's REGION tiles. Only live, shared (core/approved) parents with
 * at least one live, shared child are offered — a region an admin hasn't
 * finished building simply doesn't show up. Public data (core muscle groups
 * are global), shared by GET /api/taxonomy/regions and the server-rendered
 * gym build page, so both resolve the exact same tree.
 */
export async function fetchRegionHierarchy(): Promise<RegionRow[]> {
  const sql = getSql();
  if (!sql) return [];

  const rows = await sql`
    select p.id as parent_id, p.name as region, c.name as group_name
    from taxonomy_terms p
    join taxonomy_terms c on c.parent_id = p.id
    where p.kind = 'muscle_group' and p.status in ('core', 'approved') and p.archived_at is null
      and c.kind = 'muscle_group' and c.status in ('core', 'approved') and c.archived_at is null
    order by p.name, c.name
  `;

  const byParent = new Map<string, RegionRow>();
  for (const r of rows) {
    const key = String(r.parent_id);
    const entry = byParent.get(key) ?? { region: String(r.region), groups: [] };
    entry.groups.push(String(r.group_name));
    byParent.set(key, entry);
  }
  return Array.from(byParent.values());
}
