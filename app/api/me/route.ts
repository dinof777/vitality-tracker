import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/is-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Minimal "who am I" for client components that need the admin flag (e.g. the
// Profile page's admin link). The flag is resolved server-side from Clerk — the
// client never sees the allowlist, and the /admin pages enforce isAdmin
// themselves regardless, so this only decides whether to render a shortcut.
export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}
