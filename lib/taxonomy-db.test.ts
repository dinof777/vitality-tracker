import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from './db';
import { promotionThreshold, PROMOTION_FLOOR } from './taxonomy';
import { renameTerm, promoteIfPopular, addTerm, tenantTerms } from './taxonomy-db';

// The gap this file closes: lib/taxonomy.test.ts only proves the PURE
// dedup engine (normalizeTerm, canonicalTerm, findTermDuplicate, …) behaves
// correctly given plain data. It says nothing about taxonomy-db.ts, which is
// where every write actually happens against Postgres — including the one
// genuinely data-mutating path in this module: renameTerm() rewrites
// `exercises.muscle_group` and `exercises.tags` in place. A bug here doesn't
// throw; it silently mislabels or orphans exercises. That gets tested first
// and in the most depth. promoteIfPopular (the auto-promotion threshold) and
// addTerm's fold-vs-create branching are the next highest-value paths: they
// are the two production guarantees this module claims ("trainers are never
// blocked" / "promotion is gated on promotionThreshold(tenantCount) independent
// gyms, scaling with the platform rather than a flat magic number").
//
// No live database. `./db` is mocked; `sql` is a fake tagged-template
// function keyed off the literal SQL text — same pattern as
// lib/lifecycle-db.test.ts, itself following the lib/scoped-db.test.ts
// precedent of testing SQL-shaped code without touching Postgres.

vi.mock('./db', () => ({ getSql: vi.fn() }));

/** A row shape generic enough for every fixture below — mirrors what `neon()`'s
 * tagged-template `sql` actually returns: plain objects, columns unknown until read. */
type Row = Record<string, unknown>;
type Handler = (text: string, values: unknown[]) => Row[] | undefined;
type FakeSql = ReturnType<typeof vi.fn> & ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>);
/** The type `getSql()` actually returns — used to cast the fake through `unknown`
 * rather than `any`, since FakeSql doesn't structurally match NeonQueryFunction. */
type SqlOrNull = ReturnType<typeof getSql>;

function fakeSql(handlers: Handler[]): { sql: FakeSql; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('¶');
    calls.push({ text, values });
    for (const h of handlers) {
      const r = h(text, values);
      if (r !== undefined) return Promise.resolve(r);
    }
    throw new Error(`fakeSql: no handler matched query:\n${text}\nvalues: ${JSON.stringify(values)}`);
  });
  return { sql: sql as unknown as FakeSql, calls };
}

beforeEach(() => {
  vi.mocked(getSql).mockReset();
});

describe('renameTerm', () => {
  it('reports "No database" without touching anything when unconfigured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    const r = await renameTerm('term-1', 'New Name');
    expect(r).toEqual({ ok: false, message: 'No database' });
  });

  it('rejects a blank/whitespace-only name before any query runs', async () => {
    const { sql } = fakeSql([]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await renameTerm('term-1', '   ');
    expect(r).toEqual({ ok: false, message: 'Give it a real name.' });
    expect(sql).not.toHaveBeenCalled();
  });

  it('reports "Unknown term." and stops when the term id does not exist', async () => {
    const { sql } = fakeSql([(text) => (text.includes('from taxonomy_terms where id') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await renameTerm('ghost', 'New Name');
    expect(r).toEqual({ ok: false, message: 'Unknown term.' });
    expect(sql).toHaveBeenCalledTimes(1); // never gets to the clash check or any mutation
  });

  it('blocks renaming onto a name another term of the same kind already owns, and never mutates exercises', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ id: 'term-1', kind: 'muscle_group', name: 'Rear Delts', normalized: 'rear delts' }]
          : undefined,
      (text) =>
        text.includes('and id <>') ? [{ id: 'term-2', name: 'Shoulders' }] : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await renameTerm('term-1', 'Shoulders');
    expect(r).toEqual({ ok: false, message: '“Shoulders” already uses that name — merge into it instead.' });
    // The clash check must run BEFORE any exercises mutation, and renameTerm
    // must bail out on a clash rather than proceeding to mutate/update.
    expect(calls.some((c) => c.text.includes('update exercises'))).toBe(false);
    expect(calls.some((c) => c.text.includes('update taxonomy_terms set name'))).toBe(false);
  });

  it('renaming a muscle group rewrites exercises.muscle_group FROM the old display name TO the new one', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ id: 'term-1', kind: 'muscle_group', name: 'Rear Delts', normalized: 'rear delts' }]
          : undefined,
      (text) => (text.includes('and id <>') ? [] : undefined),
      (text) =>
        text.includes('update exercises set muscle_group')
          ? [{}]
          : undefined,
      (text) =>
        text.includes('update taxonomy_terms set name')
          ? [{ id: 'term-1', name: 'Posterior Delts', normalized: 'posterior delts', category: null, status: 'core', is_canon: true, is_mine: false }]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await renameTerm('term-1', 'Posterior Delts');
    expect(r.ok).toBe(true);

    const mutation = calls.find((c) => c.text.includes('update exercises set muscle_group'))!;
    expect(mutation).toBeDefined();
    expect(mutation.values).toEqual(['Posterior Delts', 'Rear Delts']); // new value, WHERE old value

    const finalUpdate = calls.find((c) => c.text.includes('update taxonomy_terms set name'))!;
    expect(finalUpdate.values).toEqual(['Posterior Delts', 'posterior delts', 'term-1']);
  });

  it('skips the exercises mutation when the muscle group name is unchanged (case-identical no-op rename)', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ id: 'term-1', kind: 'muscle_group', name: 'Rear Delts', normalized: 'rear delts' }]
          : undefined,
      (text) => (text.includes('and id <>') ? [] : undefined),
      (text) =>
        text.includes('update taxonomy_terms set name')
          ? [{ id: 'term-1', name: 'Rear Delts', normalized: 'rear delts', category: null, status: 'core', is_canon: true, is_mine: false }]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    // Same normalized form -> same trimmed display name -> no-op rename.
    await renameTerm('term-1', 'Rear Delts');
    expect(calls.some((c) => c.text.includes('update exercises set muscle_group'))).toBe(false);
  });

  it('renaming a tag rewrites exercises.tags via array_replace using slugs derived from `normalized`, not `name`', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ id: 'term-1', kind: 'tag', name: 'Knee Rehab', normalized: 'knee rehab' }]
          : undefined,
      (text) => (text.includes('and id <>') ? [] : undefined),
      (text) => (text.includes('array_replace(tags') ? [{}] : undefined),
      (text) =>
        text.includes('update taxonomy_terms set name')
          ? [{ id: 'term-1', name: 'Knee PT', normalized: 'knee pt', category: 'stage', status: 'core', is_canon: true, is_mine: false }]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await renameTerm('term-1', 'Knee PT');
    expect(r.ok).toBe(true);

    const mutation = calls.find((c) => c.text.includes('array_replace(tags'))!;
    expect(mutation).toBeDefined();
    // from slug 'knee-rehab' -> to slug 'knee-pt', both dash-joined from `normalized`
    expect(mutation.values).toEqual(['knee-rehab', 'knee-pt', 'knee-rehab']);
  });

  it('skips the tags mutation when the normalized form is unchanged (pure display-casing rename)', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ id: 'term-1', kind: 'tag', name: 'knee pt', normalized: 'knee pt' }]
          : undefined,
      (text) => (text.includes('and id <>') ? [] : undefined),
      (text) =>
        text.includes('update taxonomy_terms set name')
          ? [{ id: 'term-1', name: 'Knee PT', normalized: 'knee pt', category: 'stage', status: 'core', is_canon: true, is_mine: false }]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    // 'Knee PT' normalizes to the same 'knee pt' -> no slug change -> no tags rewrite needed.
    await renameTerm('term-1', 'Knee PT');
    expect(calls.some((c) => c.text.includes('array_replace(tags'))).toBe(false);
  });
});

describe('promoteIfPopular', () => {
  it('returns false without a database', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await promoteIfPopular('term-1')).toBe(false);
  });

  it('reads the live tenant count and gates promotion on promotionThreshold(count), not a hardcoded number', async () => {
    // 40 tenants deliberately exercises the FRACTION branch (promotionThreshold(40)
    // === 4), not just the floor — so this test would fail if taxonomy-db.ts ever
    // reverted to the old flat constant (3) instead of deriving from the live count.
    const mockedTenantCount = 40;
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from tenants') ? [{ n: mockedTenantCount }] : undefined),
      (text) => (text.includes('update taxonomy_terms set status') ? [{ id: 'term-1' }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const promoted = await promoteIfPopular('term-1');
    expect(promoted).toBe(true);

    expect(calls.some((c) => c.text.includes('from tenants'))).toBe(true); // live count, not cached

    const updateQuery = calls.find((c) => c.text.includes('update taxonomy_terms set status'))!;
    expect(updateQuery.text).toContain("status = 'pending'");
    expect(updateQuery.values).toContain(promotionThreshold(mockedTenantCount));
    expect(updateQuery.values).toContain(4); // sanity: NOT the old flat PROMOTION_THRESHOLD of 3
  });

  it('falls back to 0 tenants (and so the floor) when the tenant count query returns no row', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from tenants') ? [] : undefined),
      (text) => (text.includes('update taxonomy_terms set status') ? [{ id: 'term-1' }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await promoteIfPopular('term-1');
    const updateQuery = calls.find((c) => c.text.includes('update taxonomy_terms set status'))!;
    expect(updateQuery.values).toContain(PROMOTION_FLOOR);
  });

  it('returns false when the update matches no rows (not yet popular enough, or not pending)', async () => {
    const { sql } = fakeSql([
      (text) => (text.includes('from tenants') ? [{ n: 3 }] : undefined),
      (text) => (text.includes('update taxonomy_terms set status') ? [] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    expect(await promoteIfPopular('term-1')).toBe(false);
  });
});

describe('addTerm', () => {
  const noRows = (): Row[] => [];

  it('reports "No database" without touching anything when unconfigured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    const r = await addTerm('tenant-1', 'muscle_group', 'Quads');
    expect(r).toEqual({ ok: false, kind: 'invalid', message: 'No database' });
  });

  it('rejects a tag with no/invalid category before any query runs (never blocks on a DB round-trip for bad input)', async () => {
    const { sql } = fakeSql([]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    // `category` is validated at runtime against ['goal', 'stage', 'pattern'], not
    // narrowed to an enum at the type level, so no cast is needed to pass a bad one.
    const r = await addTerm('tenant-1', 'tag', 'Explosive', { category: 'nonsense' });
    expect(r).toEqual({ ok: false, kind: 'invalid', message: 'Pick what kind of tag this is.' });
    expect(sql).not.toHaveBeenCalled();
  });

  it('an exact match FOLDS silently: links the tenant to the existing term and creates nothing new', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms t')
          ? [{ id: 'term-core', name: 'Core', normalized: 'core', category: null, status: 'core', is_canon: true, is_mine: false }]
          : undefined,
      (text) => (text.includes('insert into tenant_terms') ? [{}] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await addTerm('tenant-1', 'muscle_group', 'core');
    expect(r).toMatchObject({ ok: true, folded: false });
    expect(calls.some((c) => c.text.includes('insert into tenant_terms'))).toBe(true);
    expect(calls.some((c) => c.text.includes('insert into taxonomy_terms'))).toBe(false);
  });

  it('a fuzzy match without force comes back as an unresolved duplicate and creates nothing', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms t')
          ? [{ id: 'term-ham', name: 'Hamstrings', normalized: 'hamstrings', category: null, status: 'core', is_canon: true, is_mine: false }]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await addTerm('tenant-1', 'muscle_group', 'hamstrigs'); // typo, fuzzy-close
    expect(r).toMatchObject({ ok: false, kind: 'duplicate', reason: 'fuzzy' });
    expect(calls.some((c) => c.text.includes('insert'))).toBe(false);
  });

  it('a fuzzy match WITH force creates a genuinely new term instead of folding', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms t')
          ? [{ id: 'term-ham', name: 'Hamstrings', normalized: 'hamstrings', category: null, status: 'core', is_canon: true, is_mine: false }]
          : undefined,
      (text) => (text.includes('created_by_tenant_id') && text.includes('count(*)') ? [{ n: 0 }] : undefined),
      (text) =>
        text.includes('insert into taxonomy_terms')
          ? [{ id: 'term-new', name: 'Hamstrigs', normalized: 'hamstrigs', category: null, status: 'pending', is_canon: false, is_mine: true }]
          : undefined,
      (text) => (text.includes('insert into tenant_terms') ? [{}] : undefined),
      (text) => (text.includes('from tenants') ? [{ n: 3 }] : undefined),
      (text) => (text.includes('update taxonomy_terms set status') ? [] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await addTerm('tenant-1', 'muscle_group', 'hamstrigs', { force: true });
    expect(r).toMatchObject({ ok: true, folded: false, term: { normalized: 'hamstrigs' } });
    expect(calls.some((c) => c.text.includes('insert into taxonomy_terms'))).toBe(true);
  });

  it('refuses a new term once this tenant is at MAX_CUSTOM_TERMS_PER_TENANT, and creates nothing', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from taxonomy_terms t') ? noRows() : undefined),
      (text) => (text.includes('created_by_tenant_id') && text.includes('count(*)') ? [{ n: 25 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await addTerm('tenant-1', 'muscle_group', 'Rotator Cuff');
    expect(r).toMatchObject({ ok: false, kind: 'limit' });
    expect(calls.some((c) => c.text.includes('insert'))).toBe(false);
  });

  it('a genuinely new term is created as a pending proposal and immediately linked to the proposing tenant', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from taxonomy_terms t') ? noRows() : undefined),
      (text) => (text.includes('created_by_tenant_id') && text.includes('count(*)') ? [{ n: 0 }] : undefined),
      (text) =>
        text.includes('insert into taxonomy_terms')
          ? [{ id: 'term-new', name: 'Rotator Cuff', normalized: 'rotator cuff', category: null, status: 'pending', is_canon: false, is_mine: true }]
          : undefined,
      (text) => (text.includes('insert into tenant_terms') ? [{}] : undefined),
      (text) => (text.includes('from tenants') ? [{ n: 3 }] : undefined),
      (text) => (text.includes('update taxonomy_terms set status') ? [] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const r = await addTerm('tenant-1', 'muscle_group', 'Rotator Cuff');
    expect(r).toMatchObject({ ok: true, folded: false, term: { status: 'pending', is_mine: true } });
    expect(calls.some((c) => c.text.includes('insert into taxonomy_terms'))).toBe(true);
    expect(calls.some((c) => c.text.includes('insert into tenant_terms'))).toBe(true);
  });
});

describe('tenantTerms', () => {
  it('returns [] without a database', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await tenantTerms('tenant-1', 'tag')).toEqual([]);
  });
});
