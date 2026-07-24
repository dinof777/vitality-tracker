import { NextResponse } from 'next/server';
import { currentTrainer } from '@/lib/current-tenant';
import { authorizeClient, upsertProfile } from '@/lib/client-portal-db';
import { validateProfilePatch, type ProfilePatchInput } from '@/lib/client-profile';
import { toProfileJson } from '../shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Trainer-entered enrichment for one client: goals, home equipment, notes,
// height, goal weight. `notes` is trainer-private — see the read-side note in
// ../route.ts. Same tenant/owner guard as every other clients route.
export async function PUT(req: Request, { params }: { params: { clientId: string } }) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  const client = await authorizeClient(params.clientId, t.tenant.id, t.userId, t.isOwner);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: ProfilePatchInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = validateProfilePatch(body);
  if (!validation.ok || !validation.patch) {
    return NextResponse.json({ error: validation.error ?? 'Invalid profile data.' }, { status: 400 });
  }

  const profile = await upsertProfile(params.clientId, t.tenant.id, validation.patch);
  return NextResponse.json({ profile: toProfileJson(profile) });
}
