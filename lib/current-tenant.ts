import { auth, clerkClient } from '@clerk/nextjs/server';
import { getSql } from './db';
import type { Tenant } from './tenant';

// Resolve the signed-in trainer's tenant (gym). Prefers their active Clerk org,
// then falls back to any org they're a member of that maps to a tenant — so a
// freshly-onboarded trainer (whose active org may not be set yet) still resolves.
// Server-only.
export async function currentTenant(): Promise<Tenant | null> {
  const { userId, orgId } = await auth();
  if (!userId) return null;
  const sql = getSql();
  if (!sql) return null;

  const orgIds: string[] = [];
  if (orgId) orgIds.push(orgId);
  try {
    const client = await clerkClient();
    const res = await client.users.getOrganizationMembershipList({ userId });
    const list = (res.data ?? []) as Array<{ organization?: { id?: string } }>;
    for (const m of list) {
      const id = m.organization?.id;
      if (id && !orgIds.includes(id)) orgIds.push(id);
    }
  } catch {
    /* membership lookup best-effort */
  }
  if (orgIds.length === 0) return null;

  const rows = await sql`
    select id, slug, name, branding, custom_domain, plan
    from tenants
    where clerk_org_id = any(${orgIds})
    limit 1
  `;
  return (rows[0] as Tenant) ?? null;
}
