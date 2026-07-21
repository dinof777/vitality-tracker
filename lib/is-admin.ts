import { currentUser } from '@clerk/nextjs/server';

// Platform admins (moderate the global catalog + vocabulary, see /admin/*).
// Configured via the ADMIN_EMAILS env (comma-separated); defaults to the owner.
//
// The email match is a pure helper so the permission boundary is unit-testable
// without Clerk — see lib/is-admin.test.ts. The rule it enforces: a trainer
// whose email is not on the allowlist is NOT an admin.

/** The lowercased admin allowlist from ADMIN_EMAILS (or the owner default). */
export function adminAllowlist(csv = process.env.ADMIN_EMAILS ?? 'dinof777@gmail.com'): string[] {
  return csv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Pure gate: is this email a platform admin? Case-insensitive; a missing/empty
 * email is never an admin. This is the whole "doesn't show for other trainers"
 * guarantee — everything else is just I/O around it.
 */
export function isAdminEmail(email: string | null | undefined, csv?: string): boolean {
  if (!email) return false;
  return adminAllowlist(csv).includes(email.trim().toLowerCase());
}

/** Resolve the signed-in user's admin status. Server-only (uses Clerk). */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await currentUser();
    return isAdminEmail(user?.primaryEmailAddress?.emailAddress);
  } catch {
    return false;
  }
}
