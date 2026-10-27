import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { readDeviceId } from '@/lib/device';

export const dynamic = 'force-dynamic';

// Every handler here takes a routineId straight off the URL, so the device
// filter (lib/device.ts) is the only thing standing between a guessed id and
// someone else's routine. All three fail closed: no cookie, no match.

// GET /api/routines/[routineId] — one of this device's routines, with its
// ordered exercises.
export async function GET(
  req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured', routine: null }, { status: 503 });
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ routine: null });
  try {
    const rows = await sql`
      select r.id, r.name, r.day_of_week, r.sort_order, r.from_plan, r.favorite,
        r.set_order, r.mode, r.amrap_minutes, r.emom_minutes,
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
      where r.id = ${params.routineId} and r.device_id = ${deviceId}
      group by r.id
    `;
    return NextResponse.json({ routine: rows[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH /api/routines/[routineId] — update routine flags: favorite, set_order
// (circuit/straightSets), and workout mode (intervals/forTime/amrap/emom) +
// its AMRAP/EMOM minute caps. Every field is optional and independently
// settable — unset fields are left untouched via coalesce, so e.g. flipping
// the workout style doesn't clobber `favorite`.
export async function PATCH(
  req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  let body: {
    favorite?: boolean;
    setOrder?: 'circuit' | 'straightSets';
    mode?: 'intervals' | 'forTime' | 'amrap' | 'emom';
    amrapMinutes?: number;
    emomMinutes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
  try {
    const rows = await sql`
      update routines set
        favorite = coalesce(${body.favorite ?? null}, favorite),
        set_order = coalesce(${body.setOrder ?? null}, set_order),
        mode = coalesce(${body.mode ?? null}, mode),
        amrap_minutes = coalesce(${body.amrapMinutes ?? null}, amrap_minutes),
        emom_minutes = coalesce(${body.emomMinutes ?? null}, emom_minutes)
      where id = ${params.routineId} and device_id = ${deviceId}
      returning id, favorite, set_order, mode, amrap_minutes, emom_minutes
    `;
    if (!rows[0]) return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    return NextResponse.json({ routine: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/routines/[routineId] — remove a routine (cascades its exercises).
export async function DELETE(
  req: Request,
  { params }: { params: { routineId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ ok: true });
  try {
    await sql`delete from routines where id = ${params.routineId} and device_id = ${deviceId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
