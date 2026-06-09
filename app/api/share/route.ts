import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { currentTrainer } from '@/lib/current-tenant';
import { createShare, type ShareExercise, type ShareParams } from '@/lib/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a shareable workout link for the signed-in trainer. Owned by that
// trainer; can only be assigned to one of their own clients.
export async function POST(req: Request) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const tenant = t.tenant;

  let body: { name?: string; exercises?: ShareExercise[]; params?: ShareParams; clientId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Optional client to attach the share to — must be one of THIS trainer's
  // clients (or any in the gym, if they're the owner).
  let clientId: string | null = null;
  if (body.clientId) {
    const sql = getSql();
    const ok = sql
      ? await sql`select 1 from clients where id = ${body.clientId} and tenant_id = ${tenant.id} and (${t.isOwner} or owner_user_id = ${t.userId})`
      : [];
    if (ok[0]) clientId = body.clientId;
  }

  const name = (body.name ?? '').trim().slice(0, 80) || 'Workout';
  const exercises = Array.isArray(body.exercises) ? body.exercises.slice(0, 30) : [];
  if (exercises.length === 0) return NextResponse.json({ error: 'No exercises to share.' }, { status: 400 });
  const params = body.params;
  if (!params || typeof params.sets !== 'number') {
    return NextResponse.json({ error: 'Missing workout params.' }, { status: 400 });
  }

  const token = await createShare(
    tenant.id,
    name,
    {
      name,
      exercises: exercises.map((e) => ({
        name: String(e.name ?? '').slice(0, 80),
        equipment: e.equipment ?? null,
        image_url: e.image_url ?? null,
        notes: e.notes ? String(e.notes).slice(0, 160) : undefined,
      })),
      params,
    },
    clientId,
    t.userId,
  );

  return NextResponse.json({ token, url: `/s/${token}` }, { status: 201 });
}
