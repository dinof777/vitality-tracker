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

export interface Trainer {
  tenant: Tenant;
  userId: string;
  isOwner: boolean; // admin of the gym's Clerk org → sees every trainer's data
}

// Like currentTenant, but also returns the trainer's user id and whether they
// own (admin) the gym — used to scope clients/workouts per-trainer (owner sees all).
export async function currentTrainer(): Promise<Trainer | null> {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) return null;
  const sql = getSql();
  if (!sql) return null;

  const roleByOrg = new Map<string, string>();
  if (orgId) roleByOrg.set(orgId, orgRole ?? '');
  try {
    const client = await clerkClient();
    const res = await client.users.getOrganizationMembershipList({ userId });
    const list = (res.data ?? []) as Array<{ organization?: { id?: string }; role?: string }>;
    for (const m of list) {
      const id = m.organization?.id;
      if (id) roleByOrg.set(id, m.role ?? roleByOrg.get(id) ?? '');
    }
  } catch {
    /* best-effort */
  }
  if (roleByOrg.size === 0) return null;

  const orgIds = Array.from(roleByOrg.keys());
  const rows = await sql`
    select id, slug, name, branding, custom_domain, plan, clerk_org_id
    from tenants
    where clerk_org_id = any(${orgIds})
    limit 1
  `;
  if (!rows[0]) return null;
  const tenant = rows[0] as Tenant & { clerk_org_id: string };
  const role = roleByOrg.get(tenant.clerk_org_id) ?? '';
  return { tenant, userId, isOwner: role.toLowerCase().includes('admin') };
}
