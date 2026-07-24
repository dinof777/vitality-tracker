import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentTrainer } from '@/lib/current-tenant';
import { authorizeClient, insertMetric, fetchMetricHistory } from '@/lib/client-portal-db';
import { GET, POST } from './route';

// Guard/validation wiring for the metrics endpoints, plus the second
// highest-value regression: recorded_by must never be attacker-controlled.
// insertMetric's own signature has no recorded_by parameter (proven at the
// lib layer in lib/client-portal-db.test.ts), but this file proves the ROUTE
// never threads a body-supplied recordedBy/recorded_by value anywhere near
// the call, even when a trainee-authored client tries to smuggle one in.
// Validation itself (lib/client-metrics.ts) is exercised directly at the
// pure layer in lib/client-metrics.test.ts — kept real here, not mocked, so
// this file also proves the route actually calls it.

vi.mock('@/lib/current-tenant', () => ({ currentTrainer: vi.fn() }));
vi.mock('@/lib/client-portal-db', () => ({
  authorizeClient: vi.fn(),
  insertMetric: vi.fn(),
  fetchMetricHistory: vi.fn(),
}));

const trainer = { tenant: { id: 't-1' }, userId: 'u-1', isOwner: false } as Awaited<ReturnType<typeof currentTrainer>>;
const client = { id: 'c-1', name: 'Alex', contact: null };

function postReq(body: unknown) {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.mocked(currentTrainer).mockReset();
  vi.mocked(authorizeClient).mockReset();
  vi.mocked(insertMetric).mockReset();
  vi.mocked(fetchMetricHistory).mockReset();
});

describe('GET /api/tenant/clients/[clientId]/metrics', () => {
  it('403s when there is no gym for this account', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);
    const res = await GET(new Request('http://x?type=weight_kg'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(403);
  });

  it('404s when the client does not authorize', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(null);
    const res = await GET(new Request('http://x?type=weight_kg'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(404);
  });

  it('400s when type is missing or not one of weight_kg/hrv_ms', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);

    const res1 = await GET(new Request('http://x'), { params: { clientId: 'c-1' } });
    expect(res1.status).toBe(400);

    const res2 = await GET(new Request('http://x?type=height_cm'), { params: { clientId: 'c-1' } });
    expect(res2.status).toBe(400);

    expect(fetchMetricHistory).not.toHaveBeenCalled();
  });

  it('200s with the history from fetchMetricHistory, scoped by the requested type', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
    vi.mocked(fetchMetricHistory).mockResolvedValue([{ value: 80, recordedAt: '2026-01-01T00:00:00.000Z' }]);

    const res = await GET(new Request('http://x?type=weight_kg'), { params: { clientId: 'c-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ history: [{ value: 80, recordedAt: '2026-01-01T00:00:00.000Z' }] });
    expect(fetchMetricHistory).toHaveBeenCalledWith('c-1', 'weight_kg');
  });
});

describe('POST /api/tenant/clients/[clientId]/metrics — guards + validation', () => {
  beforeEach(() => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
  });

  it('403s when there is no gym for this account', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);
    const res = await POST(postReq({ metricType: 'weight_kg', value: 80 }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(403);
    expect(insertMetric).not.toHaveBeenCalled();
  });

  it('404s when the client does not authorize', async () => {
    vi.mocked(authorizeClient).mockResolvedValue(null);
    const res = await POST(postReq({ metricType: 'weight_kg', value: 80 }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(404);
    expect(insertMetric).not.toHaveBeenCalled();
  });

  it('400s on invalid JSON', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: '{bad' }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(insertMetric).not.toHaveBeenCalled();
  });

  it('400s on an unrecognized metricType', async () => {
    const res = await POST(postReq({ metricType: 'height_cm', value: 180 }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(insertMetric).not.toHaveBeenCalled();
  });

  it('400s on an out-of-range value (weight_kg > 400)', async () => {
    const res = await POST(postReq({ metricType: 'weight_kg', value: 401 }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(insertMetric).not.toHaveBeenCalled();
  });

  it('400s on an unparseable recordedAt', async () => {
    const res = await POST(
      postReq({ metricType: 'weight_kg', value: 80, recordedAt: 'not-a-date' }),
      { params: { clientId: 'c-1' } },
    );
    expect(res.status).toBe(400);
    expect(insertMetric).not.toHaveBeenCalled();
  });

  it('201s and inserts on a valid body', async () => {
    vi.mocked(insertMetric).mockResolvedValue({
      id: 'm-1',
      client_id: 'c-1',
      tenant_id: 't-1',
      metric_type: 'weight_kg',
      value: 80,
      recorded_at: '2026-01-01T00:00:00.000Z',
      recorded_by: 'trainer',
      note: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const res = await POST(postReq({ metricType: 'weight_kg', value: 80 }), { params: { clientId: 'c-1' } });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.metric.recordedBy).toBe('trainer');
  });
});

describe('POST /api/tenant/clients/[clientId]/metrics — recorded_by cannot be spoofed via the body', () => {
  beforeEach(() => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
    vi.mocked(insertMetric).mockResolvedValue({
      id: 'm-1',
      client_id: 'c-1',
      tenant_id: 't-1',
      metric_type: 'weight_kg',
      value: 80,
      recorded_at: '2026-01-01T00:00:00.000Z',
      recorded_by: 'trainer',
      note: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('a body carrying recordedBy: "trainee" is accepted (extra field ignored) but never reaches insertMetric', async () => {
    // postReq takes `unknown`, so this extra attacker-controlled field is not
    // even a type error — it's exactly what an untyped/hand-crafted request
    // body could send.
    const res = await POST(
      postReq({ metricType: 'weight_kg', value: 80, recordedBy: 'trainee' }),
      { params: { clientId: 'c-1' } },
    );

    expect(res.status).toBe(201);
    expect(insertMetric).toHaveBeenCalledTimes(1);
    // insertMetric's real signature is (clientId, tenantId, metricType, value, recordedAtIso, note) —
    // exactly 6 positional args, none of them derived from body.recordedBy.
    const callArgs = vi.mocked(insertMetric).mock.calls[0];
    expect(callArgs).toHaveLength(6);
    expect(callArgs).not.toContain('trainee');
    // The response always reflects what insertMetric actually returned, which
    // hard-codes 'trainer' (see lib/client-portal-db.test.ts) — never the body value.
    const json = await res.json();
    expect(json.metric.recordedBy).toBe('trainer');
  });
});
