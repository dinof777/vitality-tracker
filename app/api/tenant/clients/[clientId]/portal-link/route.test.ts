import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentTrainer } from '@/lib/current-tenant';
import { authorizeClient, issuePortalLink, revokePortalLink } from '@/lib/client-portal-db';
import { POST, DELETE } from './route';

// The single highest-value regression in this whole handoff: a trainer must
// never be able to issue a trainee-portal link without explicit consent:true
// in the body. Route wiring is mocked out (guard + DB adapter — both already
// covered at the lib layer in lib/client-portal-db.test.ts) so this file
// isolates exactly the consent gate + guard order, matching the thin-HTTP-
// layer pattern established by app/api/log/[entryId]/route.test.ts.

vi.mock('@/lib/current-tenant', () => ({ currentTrainer: vi.fn() }));
vi.mock('@/lib/client-portal-db', () => ({
  authorizeClient: vi.fn(),
  issuePortalLink: vi.fn(),
  revokePortalLink: vi.fn(),
}));

const trainer = { tenant: { id: 't-1' }, userId: 'u-1', isOwner: false } as Awaited<ReturnType<typeof currentTrainer>>;
const client = { id: 'c-1', name: 'Alex', contact: null };

function req(body: unknown) {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.mocked(currentTrainer).mockReset();
  vi.mocked(authorizeClient).mockReset();
  vi.mocked(issuePortalLink).mockReset();
  vi.mocked(revokePortalLink).mockReset();
});

describe('POST /api/tenant/clients/[clientId]/portal-link — guards', () => {
  it('403s when there is no gym for this account, and never touches the DB adapter', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);

    const res = await POST(req({ consent: true }), { params: { clientId: 'c-1' } });

    expect(res.status).toBe(403);
    expect(authorizeClient).not.toHaveBeenCalled();
    expect(issuePortalLink).not.toHaveBeenCalled();
  });

  it('404s when the client does not authorize (wrong tenant / not this trainer\'s client)', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(null);

    const res = await POST(req({ consent: true }), { params: { clientId: 'c-1' } });

    expect(res.status).toBe(404);
    expect(issuePortalLink).not.toHaveBeenCalled();
  });

  it('400s on invalid JSON body', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);

    const res = await POST(new Request('http://x', { method: 'POST', body: '{not json' }), { params: { clientId: 'c-1' } });

    expect(res.status).toBe(400);
    expect(issuePortalLink).not.toHaveBeenCalled();
  });
});

describe('POST /api/tenant/clients/[clientId]/portal-link — consent gate (the regression this test exists for)', () => {
  beforeEach(() => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);
  });

  it('400s and NEVER calls issuePortalLink when consent is absent from the body', async () => {
    const res = await POST(req({}), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(issuePortalLink).not.toHaveBeenCalled();
  });

  it('400s and NEVER calls issuePortalLink when consent is explicitly false', async () => {
    const res = await POST(req({ consent: false }), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(400);
    expect(issuePortalLink).not.toHaveBeenCalled();
  });

  it('400s and NEVER calls issuePortalLink when consent is a truthy non-boolean ("true", 1)', async () => {
    // Must be the boolean true, not merely truthy — guards against a client
    // sending the string "true" and getting waved through.
    for (const sneaky of ['true', 1, 'yes']) {
      vi.mocked(issuePortalLink).mockClear();
      const res = await POST(req({ consent: sneaky }), { params: { clientId: 'c-1' } });
      expect(res.status).toBe(400);
      expect(issuePortalLink).not.toHaveBeenCalled();
    }
  });

  it('issues the link ONLY when consent is exactly true', async () => {
    vi.mocked(issuePortalLink).mockResolvedValue({
      portal_token: 'tok-123',
      portal_token_created_at: '2026-01-01T00:00:00.000Z',
      portal_consent_at: '2026-01-01T00:00:00.000Z',
    });

    const res = await POST(req({ consent: true }), { params: { clientId: 'c-1' } });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(issuePortalLink).toHaveBeenCalledWith('c-1', 't-1');
    expect(json).toEqual({ token: 'tok-123', url: '/portal/tok-123', consentAt: '2026-01-01T00:00:00.000Z' });
  });
});

describe('DELETE /api/tenant/clients/[clientId]/portal-link', () => {
  it('403s when there is no gym for this account', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);
    const res = await DELETE(new Request('http://x'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(403);
    expect(revokePortalLink).not.toHaveBeenCalled();
  });

  it('404s when the client does not authorize', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(null);
    const res = await DELETE(new Request('http://x'), { params: { clientId: 'c-1' } });
    expect(res.status).toBe(404);
    expect(revokePortalLink).not.toHaveBeenCalled();
  });

  it('revokes the link for an authorized client', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(authorizeClient).mockResolvedValue(client);

    const res = await DELETE(new Request('http://x'), { params: { clientId: 'c-1' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(revokePortalLink).toHaveBeenCalledWith('c-1');
  });
});
