import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Always read live DB state — never serve a cached response.
export const dynamic = 'force-dynamic';

// GET /api/overload/[exerciseId] — max weight per the last 8 workout dates for
// an exercise, oldest-to-newest, for the progressive-overload sparkline.
export async function GET(
  _req: Request,
  { params }: { params: { exerciseId: string } },
) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured', history: [] }, { status: 503 });
  }

  try {
    // Max weight per calendar day, last 8 days, oldest -> newest.
    const rows = await sql`
      select day::text as date, max_weight from (
        select date_trunc('day', created_at) as day, max(weight) as max_weight
        from log_entries
        where exercise_id = ${params.exerciseId} and weight is not null
        group by day
        order by day desc
        limit 8
      ) t
      order by day asc
    `;
    const history = rows.map((r) => ({
      date: r.date as string,
      maxWeight: Number(r.max_weight),
    }));
    return NextResponse.json({ history });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
