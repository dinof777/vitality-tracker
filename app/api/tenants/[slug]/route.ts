import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSql } from '@/lib/db';
import { currentTenant } from '@/lib/current-tenant';
import { isAdmin } from '@/lib/is-admin';
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

  // Only the gym's own trainer can edit it — resolved via Clerk org membership
  // (robust even right after onboarding). Org-less seed/demo tenants: admins only.
  const me = await currentTenant();
  const isOwner = !!me && me.slug === params.slug;
  if (!isOwner && !(await isAdmin())) {
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

  // Branding feeds fetchTenantBySlug (lib/tenant.ts), cached per-slug for an
  // hour — without this the gym's own branding edit wouldn't show on their
  // public page until the window lapsed. See DECISION.md item 4.
  revalidateTag(`tenant-slug:${params.slug}`);
  revalidatePath(`/g/${params.slug}`);
  revalidatePath(`/g/${params.slug}/exercises`);

  return NextResponse.json(rows[0]);
}
