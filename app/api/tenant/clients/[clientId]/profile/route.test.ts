import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentTrainer } from '@/lib/current-tenant';
import { authorizeClient, upsertProfile } from '@/lib/client-portal-db';
import { PUT } from './route';

// Guard + validation wiring for PUT profile. validateProfilePatch itself is
// exercised directly (unmocked) at the pure layer in lib/client-profile.test.ts;
// this file proves the route actually calls it and short-circuits before
// touching the DB adapter on invalid input.

vi.mock('@/lib/current-tenant', () => ({ currentTrainer: vi.fn() }));
vi.mock('@/lib/client-portal-db', () => ({
  authorizeClient: vi.fn(),
  upsertProfile: vi.fn(),
}));

const trainer = { tenant: { id: 't-1' }, userId: 'u-1', isOwner: false } as Awaited<ReturnType<typeof currentTrainer>>;
const client = { id: 'c-1', name: 'Alex', contact: null };

function req(body: unknown) {
  return new Request('http://x', { method: 'PUT', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.mocked(currentTrainer).mockReset();
  vi.mocked(authorizeClient).mockReset();
  vi.mocked(upsertProfile).mockReset();
});

describe('PUT /api/tenant/clients/[clientId]/profile', () => {
  it('403s when there is no gym for this account', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);
    const res = await PUT(req({ notes: 'hi' }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(403);
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it('404s when the client does not authorize', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(null);
    const res = await PUT(req({ notes: 'hi' }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(404);
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it('400s on invalid JSON', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
    const res = await PUT(new Request('http://x', { method: 'PUT', body: '{oops' }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it('400s and never calls upsertProfile when validation fails (heightCm out of range)', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
    const res = await PUT(req({ heightCm: 999 }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  it('200s, calls upsertProfile with the validated patch, and shapes the response as camelCase', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
    vi.mocked(upsertProfile).mockResolvedValue({
      client_id: 'c-1',
      tenant_id: 't-1',
      goals: ['goal-1'],
      equipment: [],
      notes: null,
      height_cm: 180,
      goal_weight_kg: null,
      portal_token: null,
      portal_token_created_at: null,
      portal_consent_at: null,
      syncrofit_user_scoped_id: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const res = await PUT(req({ goals: ['goal-1'], heightCm: 180 }), { params: { clientId: 'c-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(upsertProfile).toHaveBeenCalledWith('c-1', 't-1', { goals: ['goal-1'], heightCm: 180 });
    expect(json.profile).toMatchObject({ clientId: 'c-1', goals: ['goal-1'], heightCm: 180, notes: null });
  });
});
