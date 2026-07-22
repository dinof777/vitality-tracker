import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from './db';
import { NO_USAGE } from './lifecycle';
import { exerciseUsage, termUsage, termDependents, exerciseDependents } from './lifecycle-db';

// The gap this file closes: lib/lifecycle.test.ts only proves the PURE
// counting rules (isInUse, deleteEffect, …) behave correctly given a Usage
// object. It cannot catch a bug in the SQL that BUILDS that Usage object.
//
// The production incident this whole lifecycle module exists to prevent —
// exercises CASCADE to log_entries/routine_exercises, so hard-deleting a used
// exercise destroyed training history — depended on a query correctly
// counting "does anything reference this row". If exerciseUsage/termUsage
// ever query the wrong column, the wrong table, or the wrong id, they return
// zero usage, deleteEffect() says "deleted" instead of "archived", and the
// history-destroying bug reappears with the pure tests still green.
//
// So these tests assert TWO things per query, deliberately:
//   1. the query text references the right table/column (a typo'd column or
//      table name — e.g. `exercise_id` -> `exerciseid`, or the wrong table —
//      would silently always return 0 against a real schema);
//   2. the id being looked up is actually threaded through as a bound
//      parameter (a copy-paste bug that counts usage of the WRONG row is the
//      other way this class of bug hides behind a passing pure-function test).
//
// No live database. `./db` is mocked; `sql` is a fake tagged-template
// function keyed off the literal SQL text, matching the precedent set by
// lib/scoped-db.test.ts of testing SQL-shaped code without touching Postgres.

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

describe('exerciseUsage', () => {
  it('short-circuits to NO_USAGE when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await exerciseUsage('ex-1')).toEqual(NO_USAGE);
  });

  it('queries the three cascading tables and threads the exercise id through as a param', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from routine_exercises') ? [{ routines: 3, log_entries: 112, aliases: 1 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const usage = await exerciseUsage('ex-42');

    // The whole point: prove the return value is correct, not just that the
    // query looked plausible. A silent-zero here is what re-enables the
    // CASCADE-destroys-history bug this module exists to prevent.
    expect(usage).toEqual({ routines: 3, logEntries: 112, aliases: 1, exercises: 0, gyms: 0, children: 0 });

    expect(sql).toHaveBeenCalledTimes(1);
    const [{ text, values }] = calls;
    // The three tables that actually CASCADE off exercises — the specific
    // bug this module exists to prevent. If the query stops referencing any
    // one of them, that dependent count silently goes to zero.
    expect(text).toContain('from routine_exercises where exercise_id');
    expect(text).toContain('from log_entries');
    expect(text).toContain('exercise_id');
    expect(text).toContain('from exercise_aliases');
    // Every occurrence of exercise_id in the query is bound to the id we
    // were asked about — not left blank, not a different exercise.
    expect(values).toEqual(['ex-42', 'ex-42', 'ex-42']);
  });

  it('maps snake_case columns to the Usage shape correctly, including logEntries', async () => {
    const { sql } = fakeSql([
      (text) => (text.includes('from routine_exercises') ? [{ routines: 3, log_entries: 112, aliases: 1 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    expect(await exerciseUsage('ex-1')).toEqual({
      routines: 3,
      logEntries: 112,
      aliases: 1,
      exercises: 0,
      gyms: 0,
      children: 0,
    });
  });

  it('defaults to zero counts rather than throwing if the row is missing fields', async () => {
    // Guards the `r.routines ?? 0` fallbacks: a malformed/empty row must not
    // crash the caller, but note this is exactly the shape a broken query
    // (e.g. wrong table, always-false WHERE) would also produce — which is
    // why the query-shape assertions above exist as a second line of defense.
    const { sql } = fakeSql([(text) => (text.includes('from routine_exercises') ? [{}] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    expect(await exerciseUsage('ex-1')).toEqual({
      routines: 0,
      logEntries: 0,
      aliases: 0,
      exercises: 0,
      gyms: 0,
      children: 0,
    });
  });

  it('defaults to zero counts when no row comes back at all', async () => {
    const { sql } = fakeSql([(text) => (text.includes('from routine_exercises') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    expect(await exerciseUsage('ex-1')).toEqual({
      routines: 0,
      logEntries: 0,
      aliases: 0,
      exercises: 0,
      gyms: 0,
      children: 0,
    });
  });
});

describe('termUsage', () => {
  it('short-circuits to NO_USAGE when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await termUsage('term-1')).toEqual(NO_USAGE);
  });

  it('returns NO_USAGE and stops (no further queries) when the term does not exist', async () => {
    const { sql } = fakeSql([(text) => (text.includes('from taxonomy_terms where id') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    expect(await termUsage('ghost-term')).toEqual(NO_USAGE);
    expect(sql).toHaveBeenCalledTimes(1); // never queries gyms/exercises for a term that isn't real
  });

  it('muscle_group: counts exercises by DISPLAY NAME, not the normalized form', async () => {
    // Documented contract (lifecycle-db.ts comment): "Exercises store the
    // display value for a muscle group ... the slug for a tag." Using
    // `normalized` here instead of `name` would silently undercount every
    // muscle group whose display casing differs from its normalized form.
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ kind: 'muscle_group', name: 'Rear Delts', normalized: 'rear delts' }]
          : undefined,
      (text) => (text.includes('from tenant_terms where term_id') ? [{ n: 2 }] : undefined),
      (text) => (text.includes('exercises where') && text.includes('muscle_group =') ? [{ n: 7 }] : undefined),
      (text) => (text.includes('where parent_id =') ? [{ n: 0 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const usage = await termUsage('term-rd');
    expect(usage).toEqual({ routines: 0, logEntries: 0, aliases: 0, exercises: 7, gyms: 2, children: 0 });

    const exerciseQuery = calls.find((c) => c.text.includes('muscle_group ='))!;
    expect(exerciseQuery.values).toContain('Rear Delts'); // display name
    expect(exerciseQuery.values).not.toContain('rear delts'); // NOT the normalized form
  });

  it('muscle_group: a region with live children counts them, keyed by parent_id and excluding archived rows', async () => {
    // The whole reason this exists: a parent region with children must read as
    // in-use (isInUse) so deleting it archives instead of orphaning the
    // children still pointing at it via parent_id.
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ kind: 'muscle_group', name: 'Upper Body', normalized: 'upper body' }]
          : undefined,
      (text) => (text.includes('from tenant_terms where term_id') ? [{ n: 0 }] : undefined),
      (text) => (text.includes('exercises where') && text.includes('muscle_group =') ? [{ n: 0 }] : undefined),
      (text) => (text.includes('where parent_id =') ? [{ n: 3 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const usage = await termUsage('term-upper');
    expect(usage).toEqual({ routines: 0, logEntries: 0, aliases: 0, exercises: 0, gyms: 0, children: 3 });

    const childrenQuery = calls.find((c) => c.text.includes('where parent_id ='))!;
    expect(childrenQuery.text).toContain('archived_at is null');
    expect(childrenQuery.values).toEqual(['term-upper']);
  });

  it('tag: counts exercises by the SLUG derived from `normalized` (spaces -> dashes), not `name`', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ kind: 'tag', name: 'Knee PT', normalized: 'knee pt' }]
          : undefined,
      (text) => (text.includes('from tenant_terms where term_id') ? [{ n: 0 }] : undefined),
      (text) => (text.includes('any(tags)') ? [{ n: 5 }] : undefined),
      (text) => (text.includes('where parent_id =') ? [{ n: 0 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const usage = await termUsage('term-kneept');
    expect(usage).toEqual({ routines: 0, logEntries: 0, aliases: 0, exercises: 5, gyms: 0, children: 0 });

    const tagQuery = calls.find((c) => c.text.includes('any(tags)'))!;
    expect(tagQuery.values).toContain('knee-pt'); // slug: dash-joined normalized form
  });

  it('other kinds (equipment) do not query exercises at all — exercises stays 0', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from taxonomy_terms where id')
          ? [{ kind: 'equipment', name: 'Dumbbell', normalized: 'dumbbell' }]
          : undefined,
      (text) => (text.includes('from tenant_terms where term_id') ? [{ n: 4 }] : undefined),
      (text) => (text.includes('where parent_id =') ? [{ n: 0 }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const usage = await termUsage('term-db');
    expect(usage).toEqual({ routines: 0, logEntries: 0, aliases: 0, exercises: 0, gyms: 4, children: 0 });
    expect(calls.some((c) => c.text.includes('any(tags)') || c.text.includes('muscle_group ='))).toBe(false);
  });
});

describe('termDependents', () => {
  it('short-circuits to [] when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await termDependents('term-1')).toEqual([]);
  });

  it('joins tenants and excludes the given tenant id from both occurrences in the guard clause', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('join tenants t on t.id = tt.tenant_id') ? [{ name: 'Iron House' }, { name: 'Peak Fitness' }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const names = await termDependents('term-1', 'tenant-mine');
    expect(names).toEqual(['Iron House', 'Peak Fitness']);
    expect(calls[0].values).toEqual(['term-1', 'tenant-mine', 'tenant-mine']);
  });

  it('passes null for exceptTenantId when omitted, rather than "undefined"', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('join tenants t on t.id = tt.tenant_id') ? [] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await termDependents('term-1');
    expect(calls[0].values).toEqual(['term-1', null, null]);
  });
});

describe('exerciseDependents', () => {
  it('short-circuits to [] when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await exerciseDependents('ex-1')).toEqual([]);
  });

  it('queries exercise_aliases (the local-rename table), not exercises directly', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from exercise_aliases a') ? [{ name: 'Peak Fitness' }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const names = await exerciseDependents('ex-42', 'tenant-mine');
    expect(names).toEqual(['Peak Fitness']);
    const q = calls[0];
    expect(q.text).toContain('a.exercise_id');
    expect(q.values).toEqual(['ex-42', 'tenant-mine', 'tenant-mine']);
  });
});
