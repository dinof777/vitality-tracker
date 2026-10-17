import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { pickPrefillSet, type PrefillCandidate } from '@/lib/prefill';

// Always read live DB state.
export const dynamic = 'force-dynamic';

// How far back to look for a straight set before giving up and falling back to
// the newest row of any type. 20 covers a few sessions of any realistic set
// count without reading an exercise's whole history on every card mount.
const WINDOW = 20;

// GET /api/exercises/[exerciseId]/last — the working set the next set's inputs
// pre-fill from, for progressive overload. NOT simply the most recent row:
// amrap / dropset / half_rep sets log numbers that are not a target to beat,
// so pickPrefillSet skips them. See lib/prefill.ts and DESIGN.md
// §"AMRAP toggle" → "Behaviour contract".
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
      select weight, reps, tempo, set_type
      from log_entries
      where exercise_id = ${params.exerciseId}
      order by created_at desc
      limit ${WINDOW}
    `;
    const r = pickPrefillSet(rows as unknown as PrefillCandidate[]);
    if (!r) return NextResponse.json({ last: null });
    return NextResponse.json({
      last: {
        weight: r.weight === null ? null : Number(r.weight),
        reps: r.reps === null ? null : Number(r.reps),
        tempo: r.tempo as string,
        setType: r.set_type,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
