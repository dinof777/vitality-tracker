import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Always read fresh — Neon's fetch driver would otherwise be cached by Next.
export const dynamic = 'force-dynamic';

// GET /api/workouts — recent workout sessions for the history list. Each row
// carries the routine name (if any), set + exercise counts, and timestamps so
// the client can show duration. Only sessions with at least one logged set.
export async function GET() {
  const sql = getSql();
  if (!sql) return NextResponse.json({ workouts: [] });
  try {
    const rows = await sql`
      select
        w.id,
        w.started_at,
        w.finished_at,
        r.name as routine_name,
        count(l.id)::int as set_count,
        count(distinct l.exercise_id)::int as exercise_count
      from workouts w
      left join routines r on r.id = w.routine_id
      left join log_entries l on l.workout_id = w.id
      group by w.id, r.name
      having count(l.id) > 0
      order by w.started_at desc
      limit 50
    `;
    return NextResponse.json({ workouts: rows });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, workouts: [] }, { status: 500 });
  }
}
