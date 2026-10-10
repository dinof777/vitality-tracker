import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from '@/lib/db';
import { DEVICE_COOKIE } from '@/lib/device';
import { GET, POST, DELETE } from './route';

// DELETE /api/routines was the worst finding in SECURITY.md: an
// unauthenticated endpoint that ran `delete from routines where from_plan =
// true` with no owner filter, i.e. anyone on the internet could wipe the
// weekly plan of every visitor to liveelevated.fit. These tests pin the two
// properties that fix depends on — the delete is always scoped to the caller's
// device, and with no device cookie it touches the database at all — so a
// later refactor that drops the filter fails here instead of in production.
// Same mock-the-sql-tag, assert-the-text technique as
// app/api/log/[entryId]/route.test.ts; no live database.
vi.mock('@/lib/db', () => ({ getSql: vi.fn() }));

type SqlOrNull = ReturnType<typeof getSql>;

const DEVICE = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function req(cookie?: string, init?: RequestInit): Request {
  return new Request('http://x', {
    ...init,
    headers: { ...(cookie ? { cookie } : {}), ...(init?.headers ?? {}) },
  });
}

function recordingSql(rows: unknown[] = []) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join('¶').toLowerCase(), values });
    return Promise.resolve(rows);
  });
  vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
  return { sql, calls };
}

beforeEach(() => {
  vi.mocked(getSql).mockReset();
});

describe('DELETE /api/routines', () => {
  it('scopes the plan wipe to the calling device', async () => {
    const { calls } = recordingSql();

    const res = await DELETE(req(`${DEVICE_COOKIE}=${DEVICE}`, { method: 'DELETE' }));

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('delete from routines');
    expect(calls[0].text).toContain('from_plan = true');
    expect(calls[0].text).toContain('device_id =');
    expect(calls[0].values).toEqual([DEVICE]);
  });

  it('deletes nothing at all when the caller has no device cookie', async () => {
    const { sql } = recordingSql();

    const res = await DELETE(req(undefined, { method: 'DELETE' }));

    expect(res.status).toBe(200);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('GET /api/routines', () => {
  it('filters to the calling device', async () => {
    const { calls } = recordingSql([{ id: 'r1' }]);

    const res = await GET(req(`${DEVICE_COOKIE}=${DEVICE}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.routines).toEqual([{ id: 'r1' }]);
    expect(calls[0].text).toContain('r.device_id =');
    expect(calls[0].values).toEqual([DEVICE]);
  });

  it('returns an empty list, not everyone else’s routines, with no cookie', async () => {
    const { sql } = recordingSql([{ id: 'someone-elses' }]);

    const res = await GET(req());
    const json = await res.json();

    expect(json).toEqual({ routines: [] });
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('POST /api/routines', () => {
  it('stamps the caller’s existing device id and does not re-set the cookie', async () => {
    const { calls } = recordingSql([{ id: 'r1', name: 'Push A' }]);

    const res = await POST(
      req(`${DEVICE_COOKIE}=${DEVICE}`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Push A' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(calls[0].text).toContain('insert into routines');
    expect(calls[0].values[0]).toBe(DEVICE);
    expect(res.cookies.get(DEVICE_COOKIE)).toBeUndefined();
  });

  it('mints an identity on a first-ever write and persists it as an httpOnly cookie', async () => {
    const { calls } = recordingSql([{ id: 'r1', name: 'Push A' }]);

    const res = await POST(req(undefined, { method: 'POST', body: JSON.stringify({ name: 'Push A' }) }));

    const minted = calls[0].values[0] as string;
    expect(minted).toMatch(/^[0-9a-f-]{36}$/i);
    const cookie = res.cookies.get(DEVICE_COOKIE);
    expect(cookie?.value).toBe(minted);
    expect(cookie?.httpOnly).toBe(true);
  });

  it('still rejects a nameless routine before any identity work', async () => {
    const { sql } = recordingSql();

    const res = await POST(req(undefined, { method: 'POST', body: JSON.stringify({}) }));

    expect(res.status).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });
});
