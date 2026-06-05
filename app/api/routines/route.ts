import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Routines with their ordered exercises (joined to the exercise library).
const ROUTINES_SELECT = (sql: NonNullable<ReturnType<typeof getSql>>) => sql`
  select r.id, r.name, r.day_of_week, r.sort_order,
    coalesce(
      json_agg(
        json_build_object(
          'id', re.id,
          'exercise_id', re.exercise_id,
          'sort_order', re.sort_order,
          'default_sets', re.default_sets,
          'default_reps', re.default_reps,
          'default_tempo', re.default_tempo,
          'name', e.name,
          'muscle_group', e.muscle_group,
          'equipment', e.equipment,
          'image_url', e.image_url,
          'default_cue', e.default_cue
        ) order by re.sort_order
      ) filter (where re.id is not null),
      '[]'
    ) as exercises
  from routines r
  left join routine_exercises re on re.routine_id = r.id
  left join exercises e on e.id = re.exercise_id
  group by r.id
  order by r.sort_order, r.name
`;

// GET /api/routines — all routines with nested exercises.
export async function GET() {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured', routines: [] }, { status: 503 });
  try {
    const routines = await ROUTINES_SELECT(sql);
    return NextResponse.json({ routines });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/routines — create an empty routine.
export async function POST(req: Request) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  let body: { name?: string; dayOfWeek?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  try {
    const rows = await sql`
      insert into routines (name, day_of_week)
      values (${body.name.trim()}, ${body.dayOfWeek ?? null})
      returning id, name, day_of_week, sort_order
    `;
    return NextResponse.json({ routine: { ...rows[0], exercises: [] } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
