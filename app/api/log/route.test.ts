import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from '@/lib/db';
import { POST } from './route';

// The AMRAP toggle's persistence half. The question this file answers is
// whether the set-type toggle is cosmetic: it is not, and these tests are what
// keeps it that way. `set_type` is WRITE-ONLY from the app's point of view —
// nothing reads it back except the pre-fill rule — so if the column were ever
// dropped from this INSERT, every logged set would silently become `normal`
// (the column's default) and nothing in the UI would look wrong until someone
// went looking for their AMRAP sets months later.
//
// Same "mock ./db, assert the SQL text + bound params" technique as
// app/api/log/[entryId]/route.test.ts — no live database.
vi.mock('@/lib/db', () => ({ getSql: vi.fn() }));

type SqlOrNull = ReturnType<typeof getSql>;

const post = (body: unknown) =>
  POST(new Request('http://x/api/log', { method: 'POST', body: JSON.stringify(body) }));

const baseSet = {
  workoutId: 'workout-1',
  exerciseId: 'ex-1',
  setNumber: 3,
  weight: 135,
  reps: 8,
  tempo: '3-1-1',
};

// Captures the SQL text + bound values of every query the route runs.
function captureSql(result: unknown[] = [{ id: 'entry-1' }]) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join('¶'), values });
    return Promise.resolve(result);
  });
  vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
  return calls;
}

// A supplied workoutId is first checked against the caller's device (a
// `select` before the INSERT), so the entry write is found by its text rather
// than assumed to be the first query.
function entryInsert(calls: Array<{ text: string; values: unknown[] }>) {
  const call = calls.find((c) => c.text.toLowerCase().includes('insert into log_entries'));
  if (!call) throw new Error('no insert into log_entries was run');
  return call;
}

beforeEach(() => {
  vi.mocked(getSql).mockReset();
});

describe('POST /api/log — set_type persistence', () => {
  it('writes set_type into the log_entries INSERT', async () => {
    const calls = captureSql();

    await post({ ...baseSet, setType: 'amrap' });

    const insert = entryInsert(calls);
    // The column must be named explicitly — relying on positional order or on
    // the column's `normal` default is how an AMRAP set turns into a straight
    // set without anything failing.
    expect(insert.text.toLowerCase()).toContain('set_type');
    expect(insert.values).toContain('amrap');
  });

  it.each(['normal', 'amrap', 'dropset', 'half_rep'] as const)(
    'persists set_type %s verbatim, unmapped and untranslated',
    async (setType) => {
      const calls = captureSql();

      const res = await post({ ...baseSet, setType });

      expect(res.status).toBe(200);
      expect(entryInsert(calls).values).toContain(setType);
    },
  );

  it('keeps weight and reps alongside an AMRAP set — the toggle is intent, not a different input mode', async () => {
    // DESIGN.md §"AMRAP toggle" → Behaviour contract #1: picking AMRAP does
    // not clear or drop the numbers. You still log what you actually lifted.
    const calls = captureSql();

    await post({ ...baseSet, weight: 115, reps: 19, setType: 'amrap' });

    const { values } = entryInsert(calls);
    expect(values).toContain(115);
    expect(values).toContain(19);
    expect(values).toContain('amrap');
  });

  it('attaches the set to the existing workout without creating a second one', async () => {
    // Guards against a mid-session toggle losing data by starting a new
    // workout: subtask "test toggling mid-session and verify no data loss".
    const calls = captureSql();

    const res = await post({ ...baseSet, setType: 'amrap' });
    const json = await res.json();

    // Ownership check, then the entry — no `insert into workouts`.
    expect(calls).toHaveLength(2);
    expect(calls[0].text.toLowerCase()).toContain('select 1 from workouts');
    expect(calls.some((c) => c.text.toLowerCase().includes('insert into workouts'))).toBe(false);
    expect(entryInsert(calls).values).toContain('workout-1');
    expect(json.workoutId).toBe('workout-1');
  });

  it('creates the parent workout then the entry when no workoutId is supplied', async () => {
    const calls = captureSql();

    const res = await post({ ...baseSet, workoutId: null, setType: 'amrap' });
    const json = await res.json();

    expect(calls).toHaveLength(2);
    expect(calls[0].text.toLowerCase()).toContain('insert into workouts');
    expect(calls[1].text.toLowerCase()).toContain('insert into log_entries');
    expect(calls[1].values).toContain('amrap');
    // The client needs this back to attach every later set of the session.
    expect(json.workoutId).toBe('entry-1');
  });

  it('returns 503 when the database is not configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);

    const res = await post({ ...baseSet, setType: 'amrap' });

    // The client treats 503 as "kept on-device" rather than an error, so the
    // set is not lost — see WorkoutSession.handleLogSet.
    expect(res.status).toBe(503);
  });
});
