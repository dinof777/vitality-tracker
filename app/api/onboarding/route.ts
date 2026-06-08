import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getSql } from '@/lib/db';
import { isValidSlug } from '@/lib/slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a gym: a Clerk Organization (the tenant identity) + a tenants row
// linked by clerk_org_id. The signed-in trainer becomes the org admin.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'No database' }, { status: 500 });

  let body: { name?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 80);
  const slug = (body.slug ?? '').trim().toLowerCase();
  if (!name) return NextResponse.json({ error: 'Gym name is required.' }, { status: 400 });
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'Pick a URL of 2–32 letters, numbers, or hyphens.' }, { status: 400 });
  }

  // Slug must be free.
  const taken = await sql`select 1 from tenants where slug = ${slug} limit 1`;
  if (taken[0]) return NextResponse.json({ error: 'That URL is taken — try another.' }, { status: 409 });

  // Create the Clerk Organization (creator becomes admin).
  let orgId: string;
  try {
    const client = await clerkClient();
    const org = await client.organizations.createOrganization({ name, createdBy: userId });
    orgId = org.id;
  } catch {
    return NextResponse.json({ error: "Couldn't create your gym org. Try again." }, { status: 502 });
  }

  // Insert the tenant with default (lime) branding to start.
  const defaultBranding = { brandName: name, accent: '#a3e635', accentPress: '#84cc16', onAccent: '#0b0b0c' };
  try {
    await sql`
      insert into tenants (slug, name, clerk_org_id, branding)
      values (${slug}, ${name}, ${orgId}, ${JSON.stringify(defaultBranding)}::jsonb)
    `;
  } catch {
    return NextResponse.json({ error: 'That URL was just taken — try another.' }, { status: 409 });
  }

  return NextResponse.json({ slug, next: `/g/${slug}/branding` });
}
