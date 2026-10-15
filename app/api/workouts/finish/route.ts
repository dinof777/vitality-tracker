import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { readDeviceId } from '@/lib/device';

// POST /api/workouts/finish — stamp finished_at on a workout. The workoutId
// comes from the client, so the device filter is what stops one visitor
// closing out another's live session.
export async function POST(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  let workoutId: string | undefined;
  try {
    ({ workoutId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!workoutId) {
    return NextResponse.json({ error: 'workoutId is required' }, { status: 400 });
  }

  // No device cookie means this browser cannot own any workout.
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ error: 'Workout not found' }, { status: 404 });

  try {
    const rows = await sql`
      update workouts set finished_at = now()
      where id = ${workoutId} and device_id = ${deviceId}
      returning *
    `;
    if (!rows[0]) return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    return NextResponse.json({ workout: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
