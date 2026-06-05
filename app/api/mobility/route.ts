import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Always read live DB state — never serve a cached response.
export const dynamic = 'force-dynamic';

// GET /api/mobility?date=YYYY-MM-DD — today's mobility log (if any).
export async function GET(req: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured', log: null }, { status: 503 });
  }
  const date = new URL(req.url).searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date query param required' }, { status: 400 });
  }

  try {
    const rows = await sql`select * from mobility_logs where logged_date = ${date} limit 1`;
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

  try {
    const completed = JSON.stringify(body.completedItems ?? []);
    const rows = await sql`
      insert into mobility_logs (logged_date, completed_items, streak_count)
      values (${body.date}, ${completed}::jsonb, ${body.streakCount ?? 0})
      on conflict (logged_date) do update
        set completed_items = excluded.completed_items,
            streak_count = excluded.streak_count
      returning *
    `;
    return NextResponse.json({ log: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
