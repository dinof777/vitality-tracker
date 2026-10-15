import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { attachDeviceCookie, readDeviceId, resolveDeviceId } from '@/lib/device';

export const dynamic = 'force-dynamic';

// Routines with their ordered exercises (joined to the exercise library), for
// one device only (lib/device.ts). The exercises themselves are the shared
// library and are not device-scoped — only the routine that composes them is.
const ROUTINES_SELECT = (sql: NonNullable<ReturnType<typeof getSql>>, deviceId: string) => sql`
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
  where r.device_id = ${deviceId}
  group by r.id
  order by r.sort_order, r.name
`;

// GET /api/routines — this device's routines with nested exercises.
export async function GET(req: Request) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured', routines: [] }, { status: 503 });
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ routines: [] });
  try {
    const routines = await ROUTINES_SELECT(sql, deviceId);
    return NextResponse.json({ routines });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/routines — create an empty routine.
export async function POST(req: Request) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  let body: { name?: string; dayOfWeek?: number | null; fromPlan?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const { deviceId, minted } = resolveDeviceId(req);

  try {
    const rows = await sql`
      insert into routines (device_id, name, day_of_week, from_plan)
      values (${deviceId}, ${body.name.trim()}, ${body.dayOfWeek ?? null}, ${body.fromPlan ?? false})
      returning id, name, day_of_week, sort_order, from_plan,
        set_order, mode, amrap_minutes, emom_minutes
    `;
    const res = NextResponse.json({ routine: { ...rows[0], exercises: [] } });
    return minted ? attachDeviceCookie(res, deviceId) : res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/routines — clear THIS DEVICE's weekly plan (its from_plan
// routines). Used to overwrite the plan: there is only ever one plan at a time.
// Unscoped, this was an unauthenticated endpoint that wiped the weekly plan of
// every visitor on the site — the single worst finding in SECURITY.md.
export async function DELETE(req: Request) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ ok: true });
  try {
    await sql`delete from routines where from_plan = true and device_id = ${deviceId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
