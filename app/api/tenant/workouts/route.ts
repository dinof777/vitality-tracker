import { NextResponse } from 'next/server';
import { currentTrainer } from '@/lib/current-tenant';
import { listWorkouts, createWorkout, deleteWorkout } from '@/lib/tenant-workouts';
import type { ShareExercise, ShareParams } from '@/lib/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The gym's saved workouts. Scoped per-trainer: you see your own, the gym
// owner sees every trainer's.

export async function GET() {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const workouts = await listWorkouts(t.tenant.id, t.userId, t.isOwner);
  return NextResponse.json({ workouts });
}

export async function POST(req: Request) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  let body: { name?: string; exercises?: ShareExercise[]; params?: ShareParams };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'Give the workout a name.' }, { status: 400 });
  const exercises = Array.isArray(body.exercises) ? body.exercises.slice(0, 30) : [];
  if (exercises.length === 0) return NextResponse.json({ error: 'No moves to save.' }, { status: 400 });
  if (!body.params || typeof body.params.sets !== 'number') {
    return NextResponse.json({ error: 'Missing workout params.' }, { status: 400 });
  }

  const workout = await createWorkout(t.tenant.id, t.userId, name, {
    name,
    exercises: exercises.map((e) => ({
      name: String(e.name ?? '').slice(0, 80),
      equipment: e.equipment ?? null,
      image_url: e.image_url ?? null,
      notes: e.notes ? String(e.notes).slice(0, 160) : undefined,
    })),
    params: body.params,
  });

  return NextResponse.json({ workout }, { status: 201 });
}

export async function DELETE(req: Request) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteWorkout(id, t.tenant.id, t.userId, t.isOwner);
  return NextResponse.json({ ok: true });
}
