import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { readDeviceId } from '@/lib/device';

// DELETE /api/log/[entryId] — remove one logged set. Backs the "Undo" control
// on the most-recent set in ExerciseCard (components/workout/ExerciseCard.tsx)
// — only called when the set actually made it to the DB (it carries an id).
// The device filter is what stops an entryId from someone else's session being
// deletable: before 0014 this was an unauthenticated delete-any-set endpoint.
export async function DELETE(
  req: Request,
  { params }: { params: { entryId: string } },
) {
  const sql = getSql();
  if (!sql) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const deviceId = readDeviceId(req);
  if (!deviceId) return NextResponse.json({ error: 'Set not found' }, { status: 404 });
  try {
    await sql`delete from log_entries where id = ${params.entryId} and device_id = ${deviceId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
