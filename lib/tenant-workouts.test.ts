import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from './db';
import { renameWorkout } from './tenant-workouts';

// Same fake-`sql` technique as lib/lifecycle-db.test.ts / lib/client-portal-db.test.ts:
// `./db` is mocked; `sql` is a fake tagged-template function keyed off the
// literal SQL text + bound params, so this asserts real query shape without
// touching Postgres.
//
// The regression this file exists to catch: renameWorkout's UPDATE must be
// scoped by tenant_id AND (isOwner OR owner_user_id = userId) — the same
// guard every other tenant_workouts query in this file (listWorkouts,
// getWorkout, deleteWorkout) already uses. If that WHERE clause is ever
// dropped or weakened, a trainer could rename another gym's (or another
// trainer's) saved circuit.

vi.mock('./db', () => ({ getSql: vi.fn() }));

type Row = Record<string, unknown>;
type Handler = (text: string, values: unknown[]) => Row[] | undefined;
type FakeSql = ReturnType<typeof vi.fn> & ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>);
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

const workoutRow = {
  id: 'w-1',
  tenant_id: 't-1',
  owner_user_id: 'u-1',
  name: 'New Name',
  payload: { name: 'New Name', exercises: [], params: {} },
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('renameWorkout', () => {
  it('returns null when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await renameWorkout('w-1', 't-1', 'u-1', false, 'New Name')).toBeNull();
  });

  it('scopes the UPDATE by id, tenant_id, AND (isOwner OR owner_user_id = userId) — the security guard', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('update tenant_workouts') ? [workoutRow] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const workout = await renameWorkout('w-1', 't-1', 'u-1', false, 'New Name');
    expect(workout).toEqual(workoutRow);

    const { text, values } = calls[0];
    expect(text).toContain('update tenant_workouts');
    expect(text).toContain('set name =');
    expect(text).toContain('where id =');
    expect(text).toContain('tenant_id =');
    expect(text).toContain('owner_user_id =');
    // name, id, tenantId, isOwner, userId — the exact binding order in the query.
    expect(values).toEqual(['New Name', 'w-1', 't-1', false, 'u-1']);
  });

  it('threads isOwner=true through as-is (gym owner bypasses the owner_user_id check)', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('update tenant_workouts') ? [workoutRow] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await renameWorkout('w-1', 't-1', 'someone-else', true, 'New Name');
    expect(calls[0].values).toEqual(['New Name', 'w-1', 't-1', true, 'someone-else']);
  });

  it('returns null (does not throw) when the WHERE clause matches nothing — the case a cross-tenant or cross-owner rename attempt hits', async () => {
    // Proves the security-relevant path: a rename attempt against a workout
    // that isn't this tenant's (or isn't this non-owner trainer's) updates
    // zero rows, so `returning` comes back empty and the caller gets null,
    // never someone else's workout.
    const { sql } = fakeSql([(text) => (text.includes('update tenant_workouts') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    expect(await renameWorkout('w-not-mine', 't-1', 'u-1', false, 'New Name')).toBeNull();
  });

  it('binds the new name as a parameter (not string-concatenated into the query text)', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('update tenant_workouts') ? [{ ...workoutRow, name: "Robert'); DROP TABLE tenant_workouts;--" }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await renameWorkout('w-1', 't-1', 'u-1', false, "Robert'); DROP TABLE tenant_workouts;--");
    expect(calls[0].text).not.toContain('DROP TABLE');
    expect(calls[0].values[0]).toBe("Robert'); DROP TABLE tenant_workouts;--");
  });
});
