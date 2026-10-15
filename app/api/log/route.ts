import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { attachDeviceCookie, resolveDeviceId } from '@/lib/device';
import type { SetType } from '@/lib/database.types';

interface LogBody {
  workoutId?: string | null;
  routineId?: string | null;
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  tempo: string;
  setType: SetType;
  rpe?: number | null;
  side?: 'L' | 'R' | null;
}

// POST /api/log — persist one set. Creates the parent workout on the first set
// of a session, then inserts the log_entry. Returns the workoutId so the client
// can attach subsequent sets to the same session.
//
// This is where an anonymous visitor's identity is born: the first logged set
// mints the `vt_device` cookie (lib/device.ts) and stamps it on the workout and
// every entry under it. A client-supplied workoutId is only accepted if it
// already belongs to this device.
export async function POST(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json(
      { error: 'Database not configured. Sets are kept on-device until DATABASE_URL is set.' },
      { status: 503 },
    );
  }

  let body: LogBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.exerciseId || typeof body.setNumber !== 'number') {
    return NextResponse.json({ error: 'exerciseId and setNumber are required' }, { status: 400 });
  }

  const { deviceId, minted } = resolveDeviceId(req);

  try {
    let workoutId = body.workoutId ?? null;

    if (workoutId) {
      // Continuing a session: it has to be this device's, or the set would be
      // appended to a stranger's workout.
      const owned = await sql`
        select 1 from workouts where id = ${workoutId} and device_id = ${deviceId}
      `;
      if (!owned[0]) return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    } else {
      // Start a workout on the first logged set.
      const rows = await sql`
        insert into workouts (device_id, routine_id)
        values (${deviceId}, ${body.routineId ?? null})
        returning id
      `;
      workoutId = rows[0].id as string;
    }

    const entry = await sql`
      insert into log_entries
        (device_id, workout_id, exercise_id, set_number, weight, reps, tempo, set_type, rpe, side)
      values
        (${deviceId}, ${workoutId}, ${body.exerciseId}, ${body.setNumber}, ${body.weight},
         ${body.reps}, ${body.tempo}, ${body.setType}, ${body.rpe ?? null}, ${body.side ?? null})
      returning *
    `;

    const res = NextResponse.json({ workoutId, entry: entry[0] });
    return minted ? attachDeviceCookie(res, deviceId) : res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
