import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from './db';
import {
  authorizeClient,
  fetchProfile,
  upsertProfile,
  insertMetric,
  fetchMetricHistory,
  fetchMetricsSummary,
  issuePortalLink,
  revokePortalLink,
  type ClientProfile,
} from './client-portal-db';

// Same fake-`sql` technique as lib/lifecycle-db.test.ts: `./db` is mocked;
// `sql` is a fake tagged-template function keyed off the literal SQL text +
// bound params, so this asserts real query shape without touching Postgres.
// See lib/lifecycle-db.test.ts for the rationale on why asserting query text
// (not just return values) matters — a wrong table/column silently returns
// zero rows against a real schema, and a pure-return-value-only test can't
// catch that.

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

describe('authorizeClient — tenant/owner guard', () => {
  it('returns null when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await authorizeClient('c-1', 't-1', 'u-1', false)).toBeNull();
  });

  it('scopes by tenant_id AND (isOwner OR owner_user_id = userId), in that order', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from clients') ? [{ id: 'c-1', name: 'Alex', contact: null }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const client = await authorizeClient('c-1', 't-1', 'u-1', false);
    expect(client).toEqual({ id: 'c-1', name: 'Alex', contact: null });

    const { text, values } = calls[0];
    expect(text).toContain('tenant_id =');
    expect(text).toContain('owner_user_id =');
    // clientId, tenantId, isOwner, userId — the exact binding order in the query.
    expect(values).toEqual(['c-1', 't-1', false, 'u-1']);
  });

  it('threads isOwner=true through as-is (gym owner bypasses the owner_user_id check)', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('from clients') ? [{ id: 'c-2', name: 'Sam', contact: null }] : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await authorizeClient('c-2', 't-1', 'someone-else', true);
    expect(calls[0].values).toEqual(['c-2', 't-1', true, 'someone-else']);
  });

  it('returns null (not throws) when the row is not found — caller cannot distinguish 403 from 404', async () => {
    const { sql } = fakeSql([(text) => (text.includes('from clients') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    expect(await authorizeClient('ghost', 't-1', 'u-1', false)).toBeNull();
  });
});

describe('fetchProfile', () => {
  it('returns null when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await fetchProfile('c-1')).toBeNull();
  });

  it('returns null when the client has no profile row yet', async () => {
    const { sql } = fakeSql([(text) => (text.includes('from client_profiles') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    expect(await fetchProfile('c-1')).toBeNull();
  });

  it('returns the row when present', async () => {
    const row = { client_id: 'c-1', goals: ['a'] } as unknown as Row;
    const { sql } = fakeSql([(text) => (text.includes('from client_profiles') ? [row] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);
    expect(await fetchProfile('c-1')).toEqual(row);
  });
});

function baseProfileRow(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return {
    client_id: 'c-1',
    tenant_id: 't-1',
    goals: ['existing-goal'],
    equipment: ['dumbbell'],
    notes: 'existing note',
    height_cm: 180,
    goal_weight_kg: 80,
    portal_token: null,
    portal_token_created_at: null,
    portal_consent_at: null,
    syncrofit_user_scoped_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('upsertProfile — read-then-write merge (absent vs explicit null)', () => {
  it('with no existing row: fields not in the patch default to [] / null, not left undefined', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('select * from client_profiles') ? [] : undefined),
      (text) => (text.includes('insert into client_profiles') ? ([baseProfileRow({ goals: ['new goal'] })] as unknown as Row[]) : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await upsertProfile('c-1', 't-1', { goals: ['new goal'] });

    const insertCall = calls.find((c) => c.text.includes('insert into client_profiles'))!;
    // clientId, tenantId, goals, equipment, notes, heightCm, goalWeightKg
    expect(insertCall.values).toEqual(['c-1', 't-1', ['new goal'], [], null, null, null]);
  });

  it('with an existing row: a field ABSENT from the patch keeps its existing DB value', async () => {
    const existing = baseProfileRow();
    const { sql, calls } = fakeSql([
      (text) => (text.includes('select * from client_profiles') ? ([existing] as unknown as Row[]) : undefined),
      (text) => (text.includes('insert into client_profiles') ? ([existing] as unknown as Row[]) : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    // Patch only touches heightCm — goals/equipment/notes/goalWeightKg must survive untouched.
    await upsertProfile('c-1', 't-1', { heightCm: 190 });

    const insertCall = calls.find((c) => c.text.includes('insert into client_profiles'))!;
    expect(insertCall.values).toEqual(['c-1', 't-1', ['existing-goal'], ['dumbbell'], 'existing note', 190, 80]);
  });

  it('with an existing row: an EXPLICIT null on the patch clears that field, others survive', async () => {
    const existing = baseProfileRow();
    const { sql, calls } = fakeSql([
      (text) => (text.includes('select * from client_profiles') ? ([existing] as unknown as Row[]) : undefined),
      (text) => (text.includes('insert into client_profiles') ? ([{ ...existing, notes: null }] as unknown as Row[]) : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await upsertProfile('c-1', 't-1', { notes: null });

    const insertCall = calls.find((c) => c.text.includes('insert into client_profiles'))!;
    // notes cleared to null; goals/equipment/height/goalWeight untouched from existing.
    expect(insertCall.values).toEqual(['c-1', 't-1', ['existing-goal'], ['dumbbell'], null, 180, 80]);
  });

  it('uses an upsert (on conflict do update) keyed on client_id', async () => {
    const { sql, calls } = fakeSql([
      (text) => (text.includes('select * from client_profiles') ? [] : undefined),
      (text) => (text.includes('insert into client_profiles') ? ([baseProfileRow()] as unknown as Row[]) : undefined),
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await upsertProfile('c-1', 't-1', {});
    const insertCall = calls.find((c) => c.text.includes('insert into client_profiles'))!;
    expect(insertCall.text).toContain('on conflict (client_id) do update');
  });

  it('throws when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    await expect(upsertProfile('c-1', 't-1', {})).rejects.toThrow('No database');
  });
});

describe('insertMetric — recorded_by cannot be spoofed', () => {
  it('hard-codes recorded_by as the literal \'trainer\' in the query text, not as a bound param', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('insert into client_metrics')
          ? [
              {
                id: 'm-1',
                client_id: 'c-1',
                tenant_id: 't-1',
                metric_type: 'weight_kg',
                value: 82,
                recorded_at: '2026-01-01T00:00:00.000Z',
                recorded_by: 'trainer',
                note: null,
                created_at: '2026-01-01T00:00:00.000Z',
              },
            ]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const metric = await insertMetric('c-1', 't-1', 'weight_kg', 82, '2026-01-01T00:00:00.000Z', null);
    expect(metric.recorded_by).toBe('trainer');

    const { text, values } = calls[0];
    // 'trainer' must appear as a literal in the SQL text (not interpolated),
    // and the bound-values array must be EXACTLY the 6 params insertMetric's
    // signature accepts — there is no recorded_by parameter to spoof at all.
    expect(text).toContain("'trainer'");
    expect(values).toEqual(['c-1', 't-1', 'weight_kg', 82, '2026-01-01T00:00:00.000Z', null]);
    expect(values).not.toContain('trainee');
    expect(values).not.toContain('trainer'); // present in TEXT, never in the bound values
  });

  it('throws when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    await expect(insertMetric('c-1', 't-1', 'weight_kg', 82, '2026-01-01T00:00:00.000Z', null)).rejects.toThrow(
      'No database',
    );
  });
});

describe('fetchMetricHistory', () => {
  it('returns [] when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await fetchMetricHistory('c-1', 'weight_kg')).toEqual([]);
  });

  it('scopes by client_id + metric_type and returns oldest-first history', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from client_metrics')
          ? [
              { value: 84, recorded_at: '2026-03-01T00:00:00.000Z' },
              { value: 90, recorded_at: '2026-01-01T00:00:00.000Z' },
            ]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const history = await fetchMetricHistory('c-1', 'weight_kg');
    expect(history.map((p) => p.value)).toEqual([90, 84]); // sorted oldest-first despite DB row order

    const { text, values } = calls[0];
    expect(text).toContain('client_id =');
    expect(text).toContain('metric_type =');
    expect(values).toEqual(['c-1', 'weight_kg']);
  });
});

describe('fetchMetricsSummary', () => {
  it('returns null/null for both metrics when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    expect(await fetchMetricsSummary('c-1')).toEqual({
      weight: { current: null, starting: null },
      hrv: { current: null, starting: null },
    });
  });

  it('splits mixed weight_kg/hrv_ms rows into the right bucket', async () => {
    const { sql, calls } = fakeSql([
      (text) =>
        text.includes('from client_metrics')
          ? [
              { metric_type: 'weight_kg', value: 90, recorded_at: '2026-01-01T00:00:00.000Z' },
              { metric_type: 'weight_kg', value: 84, recorded_at: '2026-03-01T00:00:00.000Z' },
              { metric_type: 'hrv_ms', value: 55, recorded_at: '2026-02-01T00:00:00.000Z' },
            ]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const summary = await fetchMetricsSummary('c-1');
    expect(summary.weight.starting).toEqual({ value: 90, recordedAt: '2026-01-01T00:00:00.000Z' });
    expect(summary.weight.current).toEqual({ value: 84, recordedAt: '2026-03-01T00:00:00.000Z' });
    expect(summary.hrv.starting).toEqual({ value: 55, recordedAt: '2026-02-01T00:00:00.000Z' });
    expect(summary.hrv.current).toEqual({ value: 55, recordedAt: '2026-02-01T00:00:00.000Z' });

    expect(calls[0].text).toContain("metric_type in ('weight_kg', 'hrv_ms')");
  });
});

describe('issuePortalLink', () => {
  it('throws when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    await expect(issuePortalLink('c-1', 't-1')).rejects.toThrow('No database');
  });

  it('generates a token and persists portal_consent_at alongside it', async () => {
    const { sql, calls } = fakeSql([
      (text, values) =>
        text.includes('insert into client_profiles')
          ? [{ portal_token: values[2], portal_token_created_at: '2026-01-01T00:00:00.000Z', portal_consent_at: '2026-01-01T00:00:00.000Z' }]
          : undefined,
    ]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    const link = await issuePortalLink('c-1', 't-1');
    expect(typeof link.portal_token).toBe('string');
    expect(link.portal_token!.length).toBeGreaterThan(0);
    expect(link.portal_consent_at).toBe('2026-01-01T00:00:00.000Z');

    const { text, values } = calls[0];
    expect(text).toContain('portal_consent_at');
    expect(values[0]).toBe('c-1');
    expect(values[1]).toBe('t-1');
    expect(typeof values[2]).toBe('string'); // the generated token
  });
});

describe('revokePortalLink — nulls the token but PRESERVES portal_consent_at', () => {
  it('does nothing (no throw) when no database is configured', async () => {
    vi.mocked(getSql).mockReturnValue(null);
    await expect(revokePortalLink('c-1')).resolves.toBeUndefined();
  });

  it('sets portal_token and portal_token_created_at to null, and never touches portal_consent_at', async () => {
    const { sql, calls } = fakeSql([(text) => (text.includes('update client_profiles') ? [] : undefined)]);
    vi.mocked(getSql).mockReturnValue(sql as unknown as SqlOrNull);

    await revokePortalLink('c-1');

    const { text, values } = calls[0];
    expect(text).toContain('portal_token = null');
    expect(text).toContain('portal_token_created_at = null');
    // The audit-trail guarantee: revoke must never null the consent record.
    expect(text).not.toContain('portal_consent_at');
    expect(values).toEqual(['c-1']);
  });
});
