import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { currentTrainer } from '@/lib/current-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The signed-in user's own gym identity + branding, scoped for a printable
// PDF header in the consumer app (name, brandName, logoUrl, slug — not the
// full branding jsonb, and never clerk_org_id/plan).
//
// Unlike every other /api/tenant/* route, a caller with no gym gets a plain
// 200 { tenant: null, trainer: null } rather than 403 — most callers of this
// endpoint are consumers, not trainers, and the client needs to branch on
// null cleanly rather than catch an error on the common case.
//
// No tenant id/slug is ever accepted as input (no query params read at all)
// — this only ever resolves the CALLER's own tenant via currentTrainer(),
// which derives it from the Clerk session. There is no IDOR surface: nothing
// here lets a caller ask for another gym's branding.
export async function GET() {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ tenant: null, trainer: null });

  const branding = t.tenant.branding ?? {};
  const tenantJson = {
    name: t.tenant.name,
    brandName: branding.brandName ?? null,
    logoUrl: branding.logoUrl ?? null,
    slug: t.tenant.slug,
  };

  // Best-effort — a print header still works with just the gym's branding if
  // the Clerk user lookup fails for any reason.
  let trainerName: string | null = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(t.userId);
    trainerName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      null;
  } catch {
    /* trainer stays null */
  }

  return NextResponse.json({
    tenant: tenantJson,
    trainer: trainerName ? { name: trainerName } : null,
  });
}
