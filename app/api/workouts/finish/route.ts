import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// POST /api/workouts/finish — stamp finished_at on a workout.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 503 });
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

  const { data, error } = await supabase
    .from('workouts')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', workoutId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workout: data });
}
