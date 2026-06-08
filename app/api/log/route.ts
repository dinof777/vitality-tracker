import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
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

  try {
    let workoutId = body.workoutId ?? null;

    // Start a workout on the first logged set.
    if (!workoutId) {
      const rows = await sql`
        insert into workouts (routine_id) values (${body.routineId ?? null}) returning id
      `;
      workoutId = rows[0].id as string;
    }

    const entry = await sql`
      insert into log_entries
        (workout_id, exercise_id, set_number, weight, reps, tempo, set_type, rpe, side)
      values
        (${workoutId}, ${body.exerciseId}, ${body.setNumber}, ${body.weight},
         ${body.reps}, ${body.tempo}, ${body.setType}, ${body.rpe ?? null}, ${body.side ?? null})
      returning *
    `;

    return NextResponse.json({ workoutId, entry: entry[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
