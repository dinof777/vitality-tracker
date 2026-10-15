import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from '@/lib/db';
import { DEVICE_COOKIE } from '@/lib/device';
import { GET, POST } from './route';
import { parseDays } from '@/lib/mobility-days';

// /api/mobility is the Daily 5 persistence boundary. Three things have to be
// true of it and none was before this pass:
//
//   1. every row it touches is scoped to one device, not shared by date
//      (mobility_logs.logged_date used to be UNIQUE table-wide, so there was
//      one Daily 5 row per calendar day for every visitor at once);
//   2. the owner is decided SERVER-SIDE from the httpOnly vt_device cookie —
//      nothing a client sends in a body or a header can name an owner;
//   3. there is a RANGE read at all. Every tick was already being written and
//      nothing ever read it back, so a reinstall showed a streak of 0 while
//      the rows sat there intact. That read is what this card exists for.
//
// Same mock-the-sql-tag, assert-the-text technique as
// app/api/routines/route.test.ts. No Clerk, no network, no database,
// order-independent.
vi.mock('@/lib/db', () => ({ getSql: vi.fn() }));

type SqlOrNull = ReturnType<typeof getSql>;

const DEVICE = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function req(url: string, cookie?: string, init?: RequestInit): Request {
  return new Request(url, {
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

const WITH_COOKIE = `${DEVICE_COOKIE}=${DEVICE}`;

beforeEach(() => {
  vi.mocked(getSql).mockReset();
});

describe('parseDays — the bulk history payload', () => {
  it('normalizes a well-formed day', () => {
    expect(
      parseDays([{ date: '2026-10-08', completedItems: ['hydration'], streakCount: 3 }]),
    ).toEqual([{ date: '2026-10-08', completedItems: ['hydration'], streakCount: 3 }]);
  });

  it('defaults a missing or nonsense streak to 0 and drops non-string items', () => {
    expect(parseDays([{ date: '2026-10-08', completedItems: ['a', 2, null] }])).toEqual([
      { date: '2026-10-08', completedItems: ['a'], streakCount: 0 },
    ]);
    expect(parseDays([{ date: '2026-10-08', streakCount: -4 }])?.[0].streakCount).toBe(0);
  });

  it('rejects a bad date, an empty list, a non-list, and an unbounded one', () => {
    expect(parseDays([{ date: '8 Oct 2026' }])).toBeNull();
    expect(parseDays([{ completedItems: [] }])).toBeNull();
    expect(parseDays([])).toBeNull();
    expect(parseDays('nope')).toBeNull();
    expect(parseDays(Array.from({ length: 401 }, () => ({ date: '2026-10-08' })))).toBeNull();
  });
});

describe('GET /api/mobility — the range read', () => {
  it('reads the history back scoped to the calling device', async () => {
    const rows = [{ logged_date: '2026-10-08', completed_items: ['hydration'], streak_count: 1 }];
    const { calls } = recordingSql(rows);

    const res = await GET(req('http://x/api/mobility', WITH_COOKIE));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ logs: rows, count: 1 });
    expect(calls[0].text).toContain('device_id =');
    expect(calls[0].values).toContain(DEVICE);
  });

  it('never echoes the device id back to the client', async () => {
    // vt_device is httpOnly precisely so page JavaScript cannot read it.
    // Returning it in a JSON body would hand it to any XSS and throw that away.
    recordingSql([{ logged_date: '2026-10-08', completed_items: [], streak_count: 0 }]);

    const body = JSON.stringify(await (await GET(req('http://x/api/mobility', WITH_COOKIE))).json());

    expect(body).not.toContain(DEVICE);
  });

  it('returns an empty history, not an error, when the caller has no cookie', async () => {
    // A browser that has never written owns nothing, so empty is the honest
    // answer. It must also not touch the database, and must not mint a cookie:
    // minting happens only in write routes, to keep Set-Cookie off responses
    // that may be cached.
    const { sql } = recordingSql();

    const res = await GET(req('http://x/api/mobility'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ logs: [], count: 0 });
    expect(sql).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('ignores a cookie that is not a well-formed uuid rather than passing it to SQL', async () => {
    const { sql } = recordingSql();

    const res = await GET(req('http://x/api/mobility', `${DEVICE_COOKIE}=' or 1=1 --`));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ logs: [], count: 0 });
    expect(sql).not.toHaveBeenCalled();
  });

  it('caps the read at the lookback horizon', async () => {
    const { calls } = recordingSql();

    await GET(req('http://x/api/mobility', WITH_COOKIE));

    expect(calls[0].text).toContain('limit');
    expect(calls[0].values).toContain(400);
  });

  it('503s when the database is not configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    const res = await GET(req('http://x/api/mobility', WITH_COOKIE));
    expect(res.status).toBe(503);
  });

  it('500s with the error rather than hanging when the query fails', async () => {
    const sql = () => Promise.reject(new Error('relation does not exist'));
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    const res = await GET(req('http://x/api/mobility', WITH_COOKIE));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'relation does not exist' });
  });
});

describe('GET /api/mobility?date= — the single-day read', () => {
  it('scopes a single-day read to the device too', async () => {
    const { calls } = recordingSql([{ logged_date: '2026-10-08' }]);

    const res = await GET(req('http://x/api/mobility?date=2026-10-08', WITH_COOKIE));

    expect(res.status).toBe(200);
    expect(calls[0].text).toContain('device_id =');
    expect(calls[0].values).toEqual([DEVICE, '2026-10-08']);
  });

  it('returns a null log with no cookie, without querying', async () => {
    const { sql } = recordingSql();

    const res = await GET(req('http://x/api/mobility?date=2026-10-08'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ log: null });
    expect(sql).not.toHaveBeenCalled();
  });

  it('400s a malformed date instead of passing it to SQL', async () => {
    const { sql } = recordingSql();

    const res = await GET(req('http://x/api/mobility?date=yesterday', WITH_COOKIE));

    expect(res.status).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe('POST /api/mobility', () => {
  function post(body: unknown, cookie?: string) {
    return req('http://x/api/mobility', cookie, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('upserts one day on (device_id, logged_date), not on the date alone', async () => {
    // The old conflict target was `logged_date` alone, so two people ticking
    // the same calendar day overwrote each other's checklist, streak and all.
    const { calls } = recordingSql([{ logged_date: '2026-10-08' }]);

    const res = await POST(
      post({ date: '2026-10-08', completedItems: ['hydration'], streakCount: 2 }, WITH_COOKIE),
    );

    expect(res.status).toBe(200);
    expect(calls[0].text).toContain('on conflict (device_id, logged_date)');
    expect(calls[0].values[0]).toBe(DEVICE);
    expect(calls[0].values[1]).toContain('"date":"2026-10-08"');
    expect(calls[0].values[1]).toContain('"streak":2');
  });

  it('mints a device cookie when the browser has none, so the write is owned', async () => {
    const { calls } = recordingSql([{ logged_date: '2026-10-08' }]);

    const res = await POST(post({ date: '2026-10-08', completedItems: [], streakCount: 0 }));

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${DEVICE_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain('httponly');
    // The minted id is what the row was written under — not null, not shared.
    expect(typeof calls[0].values[0]).toBe('string');
    expect(setCookie).toContain(calls[0].values[0] as string);
  });

  it('does not re-mint a cookie for a browser that already has one', async () => {
    recordingSql([{ logged_date: '2026-10-08' }]);

    const res = await POST(post({ date: '2026-10-08' }, WITH_COOKIE));

    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('takes a whole history in a single statement (the one-time device push)', async () => {
    const rows = Array.from({ length: 12 }, (_, n) => ({ logged_date: `2026-09-${20 + n}` }));
    const { calls } = recordingSql(rows);

    const days = rows.map((r) => ({
      date: r.logged_date,
      completedItems: ['hydration'],
      streakCount: 1,
    }));
    const res = await POST(post({ days }, WITH_COOKIE));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ saved: 12 });
    expect(calls).toHaveLength(1); // not 12 round trips
    expect(calls[0].values[0]).toBe(DEVICE);
  });

  it('400s a malformed history payload instead of writing part of it', async () => {
    const { sql } = recordingSql();

    const res = await POST(post({ days: [{ date: '2026-10-08' }, { date: 'tomorrow' }] }, WITH_COOKIE));

    expect(res.status).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  });

  it('400s invalid JSON and a missing date', async () => {
    recordingSql();
    expect((await POST(post('{not json', WITH_COOKIE))).status).toBe(400);
    expect((await POST(post({ completedItems: [] }, WITH_COOKIE))).status).toBe(400);
  });

  it('503s when the database is not configured, before minting anything', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    const res = await POST(post({ date: '2026-10-08' }));
    expect(res.status).toBe(503);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('500s with the error when the write fails', async () => {
    const sql = () => Promise.reject(new Error('column device_id does not exist'));
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    const res = await POST(post({ date: '2026-10-08' }, WITH_COOKIE));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'column device_id does not exist' });
  });
});
