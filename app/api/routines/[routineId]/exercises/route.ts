import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface ExerciseInput {
  exerciseId: string;
  sets: number | null;
  reps: string | null;
  tempo: string | null;
}

// PUT /api/routines/[routineId]/exercises — replace the routine's full exercise
// list, in order. Handles add / remove / reorder in one call.
export async function PUT(
  req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let body: { exercises?: ExerciseInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const exercises = body.exercises ?? [];

  try {
    // Replace the set: clear then re-insert in order.
    await sql`delete from routine_exercises where routine_id = ${params.routineId}`;
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      await sql`
        insert into routine_exercises
          (routine_id, exercise_id, sort_order, default_sets, default_reps, default_tempo)
        values
          (${params.routineId}, ${ex.exerciseId}, ${i}, ${ex.sets}, ${ex.reps}, ${ex.tempo})
      `;
    }
    return NextResponse.json({ ok: true, count: exercises.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
