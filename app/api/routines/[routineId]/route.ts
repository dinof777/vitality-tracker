import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/routines/[routineId] — one routine with its ordered exercises.
export async function GET(
  _req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured', routine: null }, { status: 503 });
  try {
    const rows = await sql`
      select r.id, r.name, r.day_of_week, r.sort_order, r.from_plan, r.favorite,
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
      where r.id = ${params.routineId}
      group by r.id
    `;
    return NextResponse.json({ routine: rows[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH /api/routines/[routineId] — update routine flags (currently `favorite`).
export async function PATCH(
  req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  let body: { favorite?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    const rows = await sql`
      update routines set favorite = ${body.favorite ?? false}
      where id = ${params.routineId}
      returning id, favorite
    `;
    return NextResponse.json({ routine: rows[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/routines/[routineId] — remove a routine (cascades its exercises).
export async function DELETE(
  _req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    await sql`delete from routines where id = ${params.routineId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
