import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { attachDeviceCookie, readDeviceId, resolveDeviceId } from '@/lib/device';
import { LOOKBACK_DAYS } from '@/lib/daily5-sync';

// Always read live DB state — never serve a cached response.
export const dynamic = 'force-dynamic';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DayInput {
  date: string;
  completedItems: string[];
  streakCount: number;
}

/** Validate + cap a bulk day payload. Returns null if the shape is wrong. */
export function parseDays(input: unknown): DayInput[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > LOOKBACK_DAYS) return null;
  const out: DayInput[] = [];
  for (const raw of input) {
    const d = raw as Partial<DayInput>;
    if (typeof d?.date !== 'string' || !ISO_DATE.test(d.date)) return null;
    const items = Array.isArray(d.completedItems)
      ? d.completedItems.filter((x): x is string => typeof x === 'string')
      : [];
    const streak = Number.isFinite(d.streakCount)
      ? Math.max(0, Math.trunc(d.streakCount as number))
      : 0;
    out.push({ date: d.date, completedItems: items, streakCount: streak });
  }
  return out;
}

// GET /api/mobility?date=YYYY-MM-DD — one day for this device.
// GET /api/mobility                 — this device's logged days, newest first.
//
// Before 0014, mobility_logs had a table-wide UNIQUE on logged_date, so there
// was exactly one Daily 5 row per calendar day for every visitor at once —
// whoever ticked last overwrote the rest, streak and all.
//
// The range read is the half that was missing: every tick was already being
// written and nothing ever read it back, so a reinstall or a cleared store
// showed a streak of 0 while the rows sat there intact. app/daily5/page.tsx
// calls this on mount.
//
// NEVER MINT A COOKIE ON A READ. lib/device.ts mints only in write routes,
// deliberately, to keep Set-Cookie off responses that may be cached. A browser
// with no cookie owns nothing, so empty is the honest answer, not an error.
export async function GET(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json(
      { error: 'Database not configured', log: null, logs: [], count: 0 },
      { status: 503 },
    );
  }

  const date = new URL(req.url).searchParams.get('date');
  const deviceId = readDeviceId(req);

  if (date) {
    if (!ISO_DATE.test(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
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

  if (!deviceId) return NextResponse.json({ logs: [], count: 0 });

  try {
    const rows = await sql`
      select logged_date, completed_items, streak_count
      from mobility_logs
      where device_id = ${deviceId}
      order by logged_date desc
      limit ${LOOKBACK_DAYS}
    `;
    // `count` is what the client's one-time history push keys on. It is
    // deliberately a count rather than the device id: vt_device is httpOnly so
    // page JavaScript cannot read it, and echoing it through a JSON body would
    // hand it to any XSS and throw that property away.
    return NextResponse.json({ logs: rows, count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/mobility — upsert today's checklist completion + streak, or a
// whole history in one call (`{ days: [...] }`, the one-time push a device
// makes so its existing streak exists in the cloud at all).
export async function POST(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: { date?: string; completedItems?: string[]; streakCount?: number; days?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let days: DayInput[] | null;
  if (body.days !== undefined) {
    days = parseDays(body.days);
    if (!days) {
      return NextResponse.json(
        {
          error: `days must be 1–${LOOKBACK_DAYS} entries of { date, completedItems, streakCount }`,
        },
        { status: 400 },
      );
    }
  } else {
    if (!body.date || !ISO_DATE.test(body.date)) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
    }
    days = parseDays([body]);
    if (!days) return NextResponse.json({ error: 'Invalid day payload' }, { status: 400 });
  }

  const { deviceId, minted } = resolveDeviceId(req);

  // One statement for one day or four hundred: the rows are expanded from a
  // single jsonb parameter, so nothing is interpolated and a history push is
  // not 400 round trips. Conflict target is the (device_id, logged_date)
  // partial unique index from 0014 — one row per device per day, not one row
  // per day.
  const payload = JSON.stringify(
    days.map((d) => ({ date: d.date, items: d.completedItems, streak: d.streakCount })),
  );

  try {
    const rows = await sql`
      insert into mobility_logs (device_id, logged_date, completed_items, streak_count)
      select ${deviceId}, d.date::date, d.items, d.streak
      from jsonb_to_recordset(${payload}::jsonb) as d(date text, items jsonb, streak int)
      on conflict (device_id, logged_date) where device_id is not null do update
        set completed_items = excluded.completed_items,
            streak_count = excluded.streak_count
      returning logged_date, completed_items, streak_count
    `;
    const res = NextResponse.json({ saved: rows.length, log: rows[0] ?? null });
    return minted ? attachDeviceCookie(res, deviceId) : res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
