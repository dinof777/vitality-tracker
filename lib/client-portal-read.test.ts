import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from './db';
import { fetchMetricHistory } from './client-portal-db';
import { fetchPortalData } from './client-portal-read';

// The no-auth, public loader for /portal/[token] — the highest-privacy-risk
// module in this feature (see the module's own header comment). Same
// fake-`sql` technique as lib/lifecycle-db.test.ts / lib/client-portal-db.test.ts:
// `./db` is mocked; `sql` is a fake tagged-template function keyed off the
// literal SQL text + bound params, so this proves real query shape without
// touching Postgres. `./client-portal-db`'s fetchMetricHistory is mocked too
// (its own ordering contract is already proven in lib/client-portal-db.test.ts
// and lib/client-metrics.test.ts) so this file can focus on what's unique to
// the loader: the notes-never-leak invariant, null-branch behavior, and the
// activity/BMI derivation.

vi.mock('./db', () => ({ getSql: vi.fn() }));
vi.mock('./client-portal-db', () => ({ fetchMetricHistory: vi.fn() }));

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

const profileRow = {
  client_id: 'c-1',
  tenant_id: 't-1',
  height_cm: 180,
  goal_weight_kg: 75,
  client_name: 'Alex Rivera',
  tenant_name: 'Iron House',
  tenant_branding: null,
};

const noActivityRow = { last_workout_at: null, sessions_this_week: 0, total_completions: 0 };

function fakeSqlWithProfile(row: Row | undefined, activityRow: Row = noActivityRow) {
  return fakeSql([
    (text) => (text.includes('from client_profiles') && text.includes('join clients') ? (row ? [row] : []) : undefined),
    (text) => (text.includes('from syncrofit_events') ? [activityRow] : undefined),
  ]);
}

beforeEach(() => {
  vi.mocked(getSql).mockReset();
  vi.mocked(fetchMetricHistory).mockReset();
  vi.mocked(fetchMetricHistory).mockResolvedValue([]);
});

describe('fetchPortalData — null branches (never throw, never leak existence)', () => {
  it('returns null for an empty-string token without ever touching the database', async () => {
    const result = await fetchPortalData('');
    expect(result).toBeNull();
    expect(getSql).not.toHaveBeenCalled();
  });

  it('returns null when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await fetchPortalData('tok-1')).toBeNull();
  });

  it('returns null for an unknown token (zero rows matched)', async () => {
    const { sql } = fakeSqlWithProfile(undefined);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    expect(await fetchPortalData('tok-does-not-exist')).toBeNull();
  });

  it('returns null for a REVOKED token — POST /portal-link\'s DELETE nulls portal_token, so the same "where portal_token = $1" match simply finds nothing', async () => {
    // Mirrors the module's own doc comment: revocation needs no special
    // handling in this file because it's just the general "zero rows" case.
    const { sql } = fakeSqlWithProfile(undefined);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    expect(await fetchPortalData('tok-that-was-revoked')).toBeNull();
  });
});

describe('fetchPortalData — NOTES NEVER LEAK (the privacy invariant this file exists to protect)', () => {
  it('client_profiles.notes never appears in the returned data, even if a future regression put it on the row', async () => {
    const SECRET_NOTE = 'client mentioned recovering from a knee surgery — sensitive, trainer-eyes-only';
    // Simulates the exact failure mode the module's header comment warns
    // about: if the SELECT column list is ever widened (or someone
    // regresses it to `select *`) and `notes` rides along on the row, this
    // proves the loader's OWN destructuring/shaping still won't leak it —
    // defense in depth on top of the query-shape assertion below.
    const { sql } = fakeSqlWithProfile({ ...profileRow, notes: SECRET_NOTE } as Row);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    vi.mocked(fetchMetricHistory).mockResolvedValue([]);

    const data = await fetchPortalData('tok-1');

    expect(data).not.toBeNull();
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain(SECRET_NOTE);
    expect(serialized).not.toContain('surgery');
    // No internal ids beyond the render shape either.
    expect(serialized).not.toContain('client_id');
    expect(serialized).not.toContain('tenant_id');
    expect(data).not.toHaveProperty('clientId');
    expect(data).not.toHaveProperty('tenantId');
  });

  it('the primary lookup query never selects cp.notes — named-column allowlist, no select *', async () => {
    const { sql, calls } = fakeSqlWithProfile(profileRow);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await fetchPortalData('tok-1');

    const lookupCall = calls.find((c) => c.text.includes('from client_profiles'))!;
    expect(lookupCall.text).not.toMatch(/\bnotes\b/i);
    expect(lookupCall.text.toLowerCase()).not.toContain('select *');
    // The exact allowlist this test pins — a future column addition must be
    // deliberate, not accidental, to show up here.
    expect(lookupCall.text).toContain('cp.client_id');
    expect(lookupCall.text).toContain('cp.tenant_id');
    expect(lookupCall.text).toContain('cp.height_cm');
    expect(lookupCall.text).toContain('cp.goal_weight_kg');
  });

  it('the lookup is scoped by portal_token ONLY (no cross-tenant widening surface) and binds exactly the token', async () => {
    const { sql, calls } = fakeSqlWithProfile(profileRow);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await fetchPortalData('tok-scoped');

    const lookupCall = calls.find((c) => c.text.includes('from client_profiles'))!;
    expect(lookupCall.text).toContain('where cp.portal_token =');
    expect(lookupCall.values).toEqual(['tok-scoped']);
  });
});

describe('fetchPortalData — activity 7-day window', () => {
  it('the query filters sessions_this_week by a 7-day interval — Priya\'s scratch-DB-verified window, pinned at the query-text level (no live Postgres in this test)', async () => {
    // A completion 2 days ago vs. one 10 days ago is a date-math distinction
    // Postgres itself evaluates inside the query (`now() - interval '7 days'`);
    // a fake-sql unit test can't execute that interval arithmetic without a
    // live database, so this pins the CONTRACT — the literal 7-day filter
    // clause is present — the same way lib/lifecycle-db.test.ts pins query
    // shape rather than re-deriving what Postgres would compute.
    const { sql, calls } = fakeSqlWithProfile(profileRow, {
      last_workout_at: '2026-07-23T00:00:00.000Z', // 2 days before "now" in this scenario
      sessions_this_week: 1, // only the 2-day-old completion counts
      total_completions: 2, // the 10-day-old one still counts toward the lifetime total
    });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const data = await fetchPortalData('tok-1');

    const activityCall = calls.find((c) => c.text.includes('from syncrofit_events'))!;
    expect(activityCall.text).toContain("interval '7 days'");
    expect(activityCall.text).toContain("filter (where coalesce(se.event_ts, se.received_at) >= now() - interval '7 days')");

    expect(data!.activity).toEqual({
      lastWorkoutAt: '2026-07-23T00:00:00.000Z',
      sessionsThisWeek: 1,
      totalCompletions: 2,
    });
  });

  it('coerces numeric-as-string row values (Number(...)) rather than passing raw strings through', async () => {
    const { sql } = fakeSqlWithProfile(profileRow, {
      last_workout_at: null,
      sessions_this_week: '3',
      total_completions: '11',
    });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const data = await fetchPortalData('tok-1');
    expect(data!.activity).toEqual({ lastWorkoutAt: null, sessionsThisWeek: 3, totalCompletions: 11 });
  });

  it('defaults to zeroed activity when the aggregate query returns no row', async () => {
    const { sql } = fakeSql([
      (text) => (text.includes('from client_profiles') && text.includes('join clients') ? [profileRow] : undefined),
      (text) => (text.includes('from syncrofit_events') ? [] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const data = await fetchPortalData('tok-1');
    expect(data!.activity).toEqual({ lastWorkoutAt: null, sessionsThisWeek: 0, totalCompletions: 0 });
  });
});

describe('fetchPortalData — history ordering (starting = first, current = last)', () => {
  it('derives weight starting/current from fetchMetricHistory\'s oldest-first array, and hrv current from its last element', async () => {
    const { sql } = fakeSqlWithProfile(profileRow);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    vi.mocked(fetchMetricHistory).mockImplementation(async (_clientId, metricType) => {
      if (metricType === 'weight_kg') {
        return [
          { value: 90, recordedAt: '2026-01-01T00:00:00.000Z' },
          { value: 85, recordedAt: '2026-04-01T00:00:00.000Z' },
          { value: 82, recordedAt: '2026-07-01T00:00:00.000Z' },
        ];
      }
      return [
        { value: 40, recordedAt: '2026-01-01T00:00:00.000Z' },
        { value: 55, recordedAt: '2026-06-01T00:00:00.000Z' },
      ];
    });

    const data = await fetchPortalData('tok-1');

    expect(data!.weight.starting).toEqual({ value: 90, recordedAt: '2026-01-01T00:00:00.000Z' });
    expect(data!.weight.current).toEqual({ value: 82, recordedAt: '2026-07-01T00:00:00.000Z' });
    expect(data!.weight.history).toHaveLength(3);
    expect(data!.hrv.current).toEqual({ value: 55, recordedAt: '2026-06-01T00:00:00.000Z' });
    expect(fetchMetricHistory).toHaveBeenCalledWith('c-1', 'weight_kg');
    expect(fetchMetricHistory).toHaveBeenCalledWith('c-1', 'hrv_ms');
  });

  it('starting/current/goal are all null when there is no metric history and no goal weight on file', async () => {
    const { sql } = fakeSqlWithProfile({ ...profileRow, goal_weight_kg: null });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    vi.mocked(fetchMetricHistory).mockResolvedValue([]);

    const data = await fetchPortalData('tok-1');
    expect(data!.weight).toEqual({ starting: null, current: null, goal: null, unit: 'kg', history: [] });
    expect(data!.hrv).toEqual({ current: null, history: [] });
  });
});

describe('fetchPortalData — BMI derivation', () => {
  it('bmi is null when the client has no height on file', async () => {
    const { sql } = fakeSqlWithProfile({ ...profileRow, height_cm: null });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    vi.mocked(fetchMetricHistory).mockResolvedValue([]);

    const data = await fetchPortalData('tok-1');
    expect(data!.bmi).toBeNull();
  });

  it('bmi.current is computed from height + latest weight when both are on file', async () => {
    const { sql } = fakeSqlWithProfile({ ...profileRow, height_cm: 180 });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    vi.mocked(fetchMetricHistory).mockImplementation(async (_clientId, metricType) =>
      metricType === 'weight_kg' ? [{ value: 82, recordedAt: '2026-01-01T00:00:00.000Z' }] : [],
    );

    const data = await fetchPortalData('tok-1');
    // 82 / (1.8*1.8) = 25.30... rounds to 25.3 (computeBmi's own rounding,
    // covered directly in lib/client-metrics.test.ts).
    expect(data!.bmi).toEqual({ current: 25.3 });
  });

  it('bmi is { current: null } (not null overall) when height is on file but there is no weight reading yet', async () => {
    const { sql } = fakeSqlWithProfile({ ...profileRow, height_cm: 180 });
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    vi.mocked(fetchMetricHistory).mockResolvedValue([]);

    const data = await fetchPortalData('tok-1');
    expect(data!.bmi).toEqual({ current: null });
  });
});

describe('fetchPortalData — gym branding + client name pass through correctly', () => {
  it('resolves clientName and falls back to tenant name / DEFAULT_BRANDING when branding is null', async () => {
    const { sql } = fakeSqlWithProfile(profileRow);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const data = await fetchPortalData('tok-1');
    expect(data!.clientName).toBe('Alex Rivera');
    expect(data!.gymBranding.name).toBe('Iron House');
    expect(data!.gymBranding.logoUrl).toBeNull();
    expect(data!.gymBranding.accent).toBe('#a3e635'); // DEFAULT_BRANDING fallback
  });
});
