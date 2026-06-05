import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// POST /api/workouts/finish — stamp finished_at on a workout.
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

  try {
    const rows = await sql`
      update workouts set finished_at = now() where id = ${workoutId} returning *
    `;
    return NextResponse.json({ workout: rows[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
