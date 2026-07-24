import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSql } from '@/lib/db';
import { currentTrainer } from '@/lib/current-tenant';
import { fetchProfile, fetchMetricsSummary } from '@/lib/client-portal-db';
import { GET } from './route';

// This route composes the base client + shares (queried inline via getSql,
// same as before this handoff) with the new trainer-entered profile +
// metrics summary (lib/client-portal-db.ts). Guards + the 500-no-db path are
// unique to this route (it doesn't go through authorizeClient()), so it gets
// its own test file rather than folding into shared route coverage.

vi.mock('@/lib/db', () => ({ getSql: vi.fn() }));
vi.mock('@/lib/current-tenant', () => ({ currentTrainer: vi.fn() }));
vi.mock('@/lib/client-portal-db', () => ({
  fetchProfile: vi.fn(),
  fetchMetricsSummary: vi.fn(),
}));

const trainer = { tenant: { id: 't-1' }, userId: 'u-1', isOwner: false } as Awaited<ReturnType<typeof currentTrainer>>;

type Row = Record<string, unknown>;
type Handler = (text: string) => Row[] | undefined;
type SqlOrNull = ReturnType<typeof getSql>;

function fakeSql(handlers: Handler[]) {
  const sql = vi.fn((strings: TemplateStringsArray) => {
    const text = strings.join('¶');
    for (const h of handlers) {
      const r = h(text);
      if (r !== undefined) return Promise.resolve(r);
    }
    throw new Error(`fakeSql: no handler matched:\n${text}`);
  });
  return sql as unknown as SqlOrNull;
}

beforeEach(() => {
  vi.mocked(getSql).mockReset();
  vi.mocked(currentTrainer).mockReset();
  vi.mocked(fetchProfile).mockReset();
  vi.mocked(fetchMetricsSummary).mockReset();
});

describe('GET /api/tenant/clients/[clientId]', () => {
  it('403s when there is no gym for this account', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);
    const res = await GET(new Request('http://x'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(403);
  });

  it('500s when no database is configured', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(getSql).mockReturnValue(null);
    const res = await GET(new Request('http://x'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(500);
  });

  it('404s when the client is not found in this tenant', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(getSql).mockReturnValue(fakeSql([(text) => (text.includes('from clients') ? [] : undefined)]));

    const res = await GET(new Request('http://x'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(404);
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(fetchMetricsSummary).not.toHaveBeenCalled();
  });

  it('200s composing client + shares + profile + metrics', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(getSql).mockReturnValue(
      fakeSql([
        (text) => (text.includes('from clients') ? [{ id: 'c-1', name: 'Alex', contact: null }] : undefined),
        (text) => (text.includes('from share_links') ? [{ token: 'tok', name: 'Leg Day' }] : undefined),
      ]),
    );
    vi.mocked(fetchProfile).mockResolvedValue({
      client_id: 'c-1',
      tenant_id: 't-1',
      goals: [],
      equipment: [],
      notes: 'trainer-private note',
      height_cm: null,
      goal_weight_kg: null,
      portal_token: null,
      portal_token_created_at: null,
      portal_consent_at: null,
      syncrofit_user_scoped_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchMetricsSummary).mockResolvedValue({
      weight: { current: null, starting: null },
      hrv: { current: null, starting: null },
    });

    const res = await GET(new Request('http://x'), { params: { clientId: 'c-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.client).toEqual({ id: 'c-1', name: 'Alex', contact: null });
    expect(json.shares).toEqual([{ token: 'tok', name: 'Leg Day' }]);
    expect(json.profile.notes).toBe('trainer-private note');
    expect(json.metrics).toEqual({ weight: { current: null, starting: null }, hrv: { current: null, starting: null } });
    expect(fetchProfile).toHaveBeenCalledWith('c-1');
    expect(fetchMetricsSummary).toHaveBeenCalledWith('c-1');
  });
});
