import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// DELETE /api/log/[entryId] — remove one logged set. Backs the "Undo" control
// on the most-recent set in ExerciseCard (components/workout/ExerciseCard.tsx)
// — only called when the set actually made it to the DB (it carries an id).
export async function DELETE(
  _req: Request,
  { params }: { params: { entryId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    await sql`delete from log_entries where id = ${params.entryId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
