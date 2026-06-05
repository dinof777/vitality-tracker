import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Always read live DB state.
export const dynamic = 'force-dynamic';

// GET /api/exercises/[exerciseId]/last — the most recent logged set for an
// exercise, used to pre-fill the weight/reps inputs for progressive overload.
export async function GET(
  _req: Request,
  { params }: { params: { exerciseId: string } },
) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'Database not configured', last: null }, { status: 503 });
  }

  try {
    const rows = await sql`
      select weight, reps, tempo
      from log_entries
      where exercise_id = ${params.exerciseId}
      order by created_at desc
      limit 1
    `;
    if (rows.length === 0) return NextResponse.json({ last: null });
    const r = rows[0];
    return NextResponse.json({
      last: {
        weight: r.weight === null ? null : Number(r.weight),
        reps: r.reps === null ? null : Number(r.reps),
        tempo: r.tempo as string,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
