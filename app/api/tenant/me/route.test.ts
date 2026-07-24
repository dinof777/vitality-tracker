import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentTrainer } from '@/lib/current-tenant';
import { clerkClient } from '@clerk/nextjs/server';
import { GET } from './route';

// GET /api/tenant/me feeds the trainer branding into the personalized PDF
// print header. Route-level test, mirroring the thin-HTTP-layer pattern from
// app/api/log/[entryId]/route.test.ts: mock currentTrainer() (and Clerk's
// user lookup, the route's only other I/O) and assert on status + shape.
//
// The regression this file exists to catch: this route is a DELIBERATE
// divergence from every sibling /api/tenant/* route (which 403 when there's
// no gym) — most callers here are the consumer app, not a trainer, so the
// client branches on `tenant === null`, not on catching an HTTP error. If
// this route is ever "fixed" back to matching the other routes' 403
// convention, the consumer PDF flow breaks silently for every logged-out
// print. See the route's own comment for the same rationale.

vi.mock('@/lib/current-tenant', () => ({ currentTrainer: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn() }));

const baseTenant = {
  id: 'tenant-secret-id',
  slug: 'iron-house',
  name: 'Iron House Gym',
  branding: {
    brandName: 'Iron House',
    logoUrl: 'https://cdn.example.com/logo.png',
    accent: '#a3e635',
    accentPress: '#84cc16',
    onAccent: '#0b0b0c',
    background: '#121316',
    surface: '#1b1c20',
  },
  custom_domain: 'gym.example.com',
  plan: 'pro',
  clerk_org_id: 'org_super_secret_internal_id',
};

const trainer = {
  tenant: baseTenant,
  userId: 'user_123',
  isOwner: true,
} as unknown as Awaited<ReturnType<typeof currentTrainer>>;

beforeEach(() => {
  vi.mocked(currentTrainer).mockReset();
  vi.mocked(clerkClient).mockReset();
});

describe('GET /api/tenant/me — null branch (deliberate divergence from sibling routes)', () => {
  it('returns 200 (NOT 403) with { tenant: null, trainer: null } when the caller has no gym', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(null);

    const res = await GET();
    const json = await res.json();

    // The whole point of this test: if a future edit "fixes" this route to
    // match every other /api/tenant/* route's 403-on-no-gym convention, this
    // assertion fails loudly. The consumer app's PDF flow depends on this
    // staying a clean 200 with nulls, never an error to catch.
    expect(res.status).toBe(200);
    expect(json).toEqual({ tenant: null, trainer: null });
  });
});

describe('GET /api/tenant/me — no IDOR surface', () => {
  it('accepts no request/params at all — there is no code path that could accept an override', async () => {
    // GET() takes zero arguments (no Request, no params) — this pins that
    // fact so nobody can silently add a tenantId/slug override later without
    // this test forcing a conscious change. There is no query-string or body
    // to tamper with in the first place.
    expect(GET.length).toBe(0);
  });

  it('the response always reflects ONLY currentTrainer()\'s own tenant — no way to ask for another', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(clerkClient).mockRejectedValue(new Error('no clerk in this test'));

    const res = await GET();
    const json = await res.json();

    expect(json.tenant.slug).toBe('iron-house');
    expect(json.tenant.name).toBe('Iron House Gym');
    // Calling it again with the exact same mocked session yields the exact
    // same tenant — nothing in the call surface can steer it elsewhere.
    const res2 = await GET();
    const json2 = await res2.json();
    expect(json2).toEqual(json);
  });
});

describe('GET /api/tenant/me — happy path + field allowlist (no clerk_org_id/plan/id leakage)', () => {
  it('exposes only tenant.name/brandName/logoUrl/slug and trainer.name — nothing else', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: 'Sam',
          lastName: 'Rivera',
          username: 'samr',
          primaryEmailAddress: { emailAddress: 'sam@example.com' },
        }),
      },
    } as never);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      tenant: {
        name: 'Iron House Gym',
        brandName: 'Iron House',
        logoUrl: 'https://cdn.example.com/logo.png',
        slug: 'iron-house',
        // accent/accentPress: added for the printed handout's QR-frame color
        // (Ivy's design review, precedent: app/g/[slug]/poster/page.tsx).
        // Priya extended the contract here — flagged for Theo to review.
        accent: '#a3e635',
        accentPress: '#84cc16',
      },
      trainer: { name: 'Sam Rivera' },
    });

    // Explicit negative assertions — the security-relevant part of this test.
    expect(Object.keys(json.tenant).sort()).toEqual([
      'accent',
      'accentPress',
      'brandName',
      'logoUrl',
      'name',
      'slug',
    ]);
    expect(json.tenant.id).toBeUndefined();
    expect(json.tenant.custom_domain).toBeUndefined();
    expect(json.tenant.plan).toBeUndefined();
    expect(json.tenant.clerk_org_id).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('org_super_secret_internal_id');
    expect(JSON.stringify(json)).not.toContain('tenant-secret-id');
    expect(JSON.stringify(json)).not.toContain('gym.example.com');
    expect(JSON.stringify(json)).not.toContain('pro');
    expect(Object.keys(json.trainer)).toEqual(['name']);
  });

  it('falls back to brandName/logoUrl/accent/accentPress === null when branding is empty', async () => {
    vi.mocked(currentTrainer).mockResolvedValue({
      ...trainer,
      tenant: { ...baseTenant, branding: {} },
    } as never);
    vi.mocked(clerkClient).mockRejectedValue(new Error('no clerk'));

    const res = await GET();
    const json = await res.json();
    expect(json.tenant.brandName).toBeNull();
    expect(json.tenant.logoUrl).toBeNull();
    expect(json.tenant.accent).toBeNull();
    expect(json.tenant.accentPress).toBeNull();
  });

  it('trainer name falls back to username when first/last name are both absent', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: null,
          lastName: null,
          username: 'samr',
          primaryEmailAddress: { emailAddress: 'sam@example.com' },
        }),
      },
    } as never);

    const res = await GET();
    const json = await res.json();
    expect(json.trainer).toEqual({ name: 'samr' });
  });

  it('trainer name falls back to email when first/last name and username are all absent', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(clerkClient).mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: null,
          lastName: null,
          username: null,
          primaryEmailAddress: { emailAddress: 'sam@example.com' },
        }),
      },
    } as never);

    const res = await GET();
    const json = await res.json();
    expect(json.trainer).toEqual({ name: 'sam@example.com' });
  });

  it('trainer is null (best-effort) when the Clerk lookup throws — tenant branding still returns', async () => {
    vi.mocked(currentTrainer).mockResolvedValue(trainer);
    vi.mocked(clerkClient).mockRejectedValue(new Error('Clerk is down'));

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.trainer).toBeNull();
    expect(json.tenant.name).toBe('Iron House Gym'); // gym branding unaffected by the Clerk failure
  });
});
