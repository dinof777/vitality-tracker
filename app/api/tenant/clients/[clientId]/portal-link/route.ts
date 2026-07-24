import { NextResponse } from 'next/server';
import { currentTrainer } from '@/lib/current-tenant';
import { authorizeClient, issuePortalLink, revokePortalLink } from '@/lib/client-portal-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generates/regenerates or revokes the trainee-portal token
// (client_profiles.portal_token), reusing lib/share.ts#newShareToken() — the
// same generator already proven in production for /s/[token] workout shares.
// Same tenant/owner guard as every other clients route.
//
// Settled product decision: the consent tick must be persisted, not just a
// UI checkbox, so it's auditable. POST refuses to issue a token without
// `consent: true` in the request body; every issue (first-time or
// regenerate) re-stamps portal_consent_at.

// POST { consent: true } -> { token, url, consentAt } (201)
export async function POST(req: Request, { params }: { params: { clientId: string } }) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  const client = await authorizeClient(params.clientId, t.tenant.id, t.userId, t.isOwner);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { consent?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: 'consent must be true — the trainer must confirm they have this client’s consent to share this info.' },
      { status: 400 },
    );
  }

  const link = await issuePortalLink(params.clientId, t.tenant.id);
  return NextResponse.json(
    { token: link.portal_token, url: `/portal/${link.portal_token}`, consentAt: link.portal_consent_at },
    { status: 201 },
  );
}

// DELETE -> { ok: true } — revokes (nulls portal_token; the old link 404s).
export async function DELETE(_req: Request, { params }: { params: { clientId: string } }) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  const client = await authorizeClient(params.clientId, t.tenant.id, t.userId, t.isOwner);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await revokePortalLink(params.clientId);
  return NextResponse.json({ ok: true });
}
