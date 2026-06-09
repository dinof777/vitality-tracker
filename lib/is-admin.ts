import { currentUser } from '@clerk/nextjs/server';

// Platform admins (moderate the global equipment catalog). Configure via the
// ADMIN_EMAILS env (comma-separated); defaults to the owner.
export async function isAdmin(): Promise<boolean> {
  const allow = (process.env.ADMIN_EMAILS ?? 'dinof777@gmail.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    return !!email && allow.includes(email);
  } catch {
    return false;
  }
}
