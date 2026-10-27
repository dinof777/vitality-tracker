import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { attachDeviceCookie, readDeviceId, resolveDeviceId } from '@/lib/device';

// Always read live DB state — never serve a cached response.
export const dynamic = 'force-dynamic';

// GET /api/mobility?date=YYYY-MM-DD — today's mobility log for this device.
// Before 0014, mobility_logs had a table-wide UNIQUE on logged_date, so there
// was exactly one Daily 5 row per calendar day for every visitor at once —
// whoever ticked last overwrote the rest, streak and all.
export async function GET(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured', log: null }, { status: 503 });
  }
  const date = new URL(req.url).searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date query param required' }, { status: 400 });
  }

  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ log: null });

  try {
    const rows = await sql`
      select * from mobility_logs
      where device_id = ${deviceId} and logged_date = ${date}
      limit 1
    `;
    return NextResponse.json({ log: rows[0] ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/mobility — upsert today's checklist completion + streak.
export async function POST(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { date?: string; completedItems?: string[]; streakCount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  const { deviceId, minted } = resolveDeviceId(req);

  try {
    const completed = JSON.stringify(body.completedItems ?? []);
    // Conflict target is the (device_id, logged_date) partial unique index from
    // 0014 — one row per device per day, not one row per day.
    const rows = await sql`
      insert into mobility_logs (device_id, logged_date, completed_items, streak_count)
      values (${deviceId}, ${body.date}, ${completed}::jsonb, ${body.streakCount ?? 0})
      on conflict (device_id, logged_date) where device_id is not null do update
        set completed_items = excluded.completed_items,
            streak_count = excluded.streak_count
      returning *
    `;
    const res = NextResponse.json({ log: rows[0] });
    return minted ? attachDeviceCookie(res, deviceId) : res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
