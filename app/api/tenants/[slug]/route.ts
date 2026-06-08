import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSql } from '@/lib/db';
import type { Branding } from '@/lib/tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });
  const rows = await sql`select slug, name, branding, plan from tenants where slug = ${params.slug} limit 1`;
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

const ALLOWED: (keyof Branding)[] = ['brandName', 'logoUrl', 'accent', 'accentPress', 'onAccent', 'background', 'surface'];

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  // Must be signed in; if the tenant is linked to a Clerk org, the caller's
  // active org must be that gym (so a trainer can only edit their own gym).
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const owner = await sql`select clerk_org_id from tenants where slug = ${params.slug} limit 1`;
  if (!owner[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Block only a definite cross-gym mismatch (caller is actively in a *different*
  // gym's org). When the caller has no active org yet (just onboarded), allow.
  // TODO: tighten to a full org-membership check once active-org is reliably set.
  const ownerOrg = owner[0].clerk_org_id as string | null;
  if (ownerOrg && orgId && orgId !== ownerOrg) {
    return NextResponse.json({ error: 'Not your gym.' }, { status: 403 });
  }

  let body: { branding?: Record<string, unknown>; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist branding keys; coerce to strings, drop empties.
  const branding: Record<string, string> = {};
  for (const key of ALLOWED) {
    const v = body.branding?.[key];
    if (typeof v === 'string' && v.trim()) branding[key] = v.trim().slice(0, 2048);
  }

  const rows = await sql`
    update tenants
       set branding = ${JSON.stringify(branding)}::jsonb,
           name = coalesce(${body.name ?? null}, name)
     where slug = ${params.slug}
     returning slug, name, branding, plan
  `;
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}
