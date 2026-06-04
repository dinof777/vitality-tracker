import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
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
}

// POST /api/log — persist one set. Creates the parent workout on the first set
// of a session, then inserts the log_entry. Returns the workoutId so the client
// can attach subsequent sets to the same session.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured. Sets are kept on-device until .env.local is set.' },
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

  let workoutId = body.workoutId ?? null;

  // Start a workout on the first logged set.
  if (!workoutId) {
    const { data: workout, error: workoutErr } = await supabase
      .from('workouts')
      .insert({ routine_id: body.routineId ?? null })
      .select('id')
      .single();
    if (workoutErr) {
      return NextResponse.json({ error: workoutErr.message }, { status: 500 });
    }
    workoutId = workout.id as string;
  }

  const { data: entry, error: entryErr } = await supabase
    .from('log_entries')
    .insert({
      workout_id: workoutId,
      exercise_id: body.exerciseId,
      set_number: body.setNumber,
      weight: body.weight,
      reps: body.reps,
      tempo: body.tempo,
      set_type: body.setType,
      rpe: body.rpe ?? null,
    })
    .select()
    .single();

  if (entryErr) {
    return NextResponse.json({ error: entryErr.message }, { status: 500 });
  }

  return NextResponse.json({ workoutId, entry });
}
