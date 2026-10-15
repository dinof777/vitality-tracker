import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from '@/lib/db';
import { GET } from './route';

// The read half of the AMRAP contract (DESIGN.md §"AMRAP toggle" → Behaviour
// contract #5). lib/prefill.test.ts covers the selection rule itself; this
// file covers the route actually applying it — specifically that the query
// still SELECTS set_type and still reads a window rather than `limit 1`.
// Either of those quietly reverting restores the original bug: the newest row
// wins, so a drop set at 95 lb off a 135 lb working set becomes next
// session's starting weight.
vi.mock('@/lib/db', () => ({ getSql: vi.fn() }));

type SqlOrNull = ReturnType<typeof getSql>;

const get = () => GET(new Request('http://x'), { params: { exerciseId: 'ex-1' } });

function captureSql(rows: unknown[]) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join('¶'), values });
    return Promise.resolve(rows);
  });
  vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
  return calls;
}

const row = (set_type: string, weight: number, reps: number) => ({
  weight,
  reps,
  tempo: '3-1-1',
  set_type,
});

beforeEach(() => {
  vi.mocked(getSql).mockReset();
});

describe('GET /api/exercises/[exerciseId]/last', () => {
  it('selects set_type and reads more than one row', async () => {
    const calls = captureSql([row('normal', 135, 8)]);

    await get();

    const text = calls[0].text.toLowerCase();
    expect(text).toContain('set_type');
    expect(text).toContain('order by created_at desc');
    // A bare `limit 1` cannot skip anything — the window is what makes the
    // straight-set preference possible at all.
    expect(text).not.toMatch(/limit 1\b/);
  });

  it('skips a trailing AMRAP set and returns the working set before it', async () => {
    captureSql([row('amrap', 115, 19), row('normal', 135, 8)]);

    const json = await (await get()).json();

    expect(json.last).toEqual({ weight: 135, reps: 8, tempo: '3-1-1', setType: 'normal' });
  });

  it('skips a trailing drop set', async () => {
    captureSql([row('dropset', 95, 12), row('normal', 135, 8)]);

    const json = await (await get()).json();

    expect(json.last.weight).toBe(135);
  });

  it('falls back to the newest row for an exercise only ever logged as AMRAP', async () => {
    captureSql([row('amrap', 115, 21), row('amrap', 110, 20)]);

    const json = await (await get()).json();

    expect(json.last.weight).toBe(115);
    expect(json.last.setType).toBe('amrap');
  });

  it('returns last: null with no history', async () => {
    captureSql([]);

    const json = await (await get()).json();

    expect(json.last).toBeNull();
  });

  it('returns 503 and last: null when the database is not configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);

    const res = await get();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.last).toBeNull();
  });
});
