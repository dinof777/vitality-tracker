import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from '@/lib/db';
import { DELETE } from './route';

// First app/api route test in the repo — added because Undo's server-side
// half (ExerciseCard's inline "Undo" -> DELETE /api/log/[entryId]) is
// otherwise silent: a wrong table/column here would delete nothing while the
// UI still shows the set gone, so the mismatch would only surface as a
// training-history ghost weeks later. Same "mock ./db, assert the SQL text +
// bound param" technique as lib/lifecycle-db.test.ts — no live database.
vi.mock('@/lib/db', () => ({ getSql: vi.fn() }));

type SqlOrNull = ReturnType<typeof getSql>;

beforeEach(() => {
  vi.mocked(getSql).mockReset();
});

describe('DELETE /api/log/[entryId]', () => {
  it('returns 503 when the database is not configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);

    const res = await DELETE(new Request('http://x'), { params: { entryId: 'entry-1' } });

    expect(res.status).toBe(503);
  });

  it('deletes the log_entries row by the given id and returns ok', async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ text: strings.join('¶'), values });
      return Promise.resolve([]);
    });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const res = await DELETE(new Request('http://x'), { params: { entryId: 'entry-123' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].text.toLowerCase()).toContain('delete from log_entries');
    expect(calls[0].text.toLowerCase()).toContain('where id =');
    expect(calls[0].values).toEqual(['entry-123']);
  });

  it('returns 500 with the error message when the query throws', async () => {
    const sql = vi.fn(() => Promise.reject(new Error('boom')));
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const res = await DELETE(new Request('http://x'), { params: { entryId: 'entry-123' } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: 'boom' });
  });
});
