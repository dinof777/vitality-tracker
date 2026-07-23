import { NextResponse } from 'next/server';
import { circuitEngagement, recentCircuitEvents } from '@/lib/syncrofit-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SyncroFit engagement for this routine. circuit_id on the events equals the
// routine id (see lib/syncrofit.ts → syncrofitRunUrlFromRoutine), so we key on it.
export async function GET(_req: Request, { params }: { params: { routineId: string } }) {
  const [summary, recent] = await Promise.all([
    circuitEngagement(params.routineId),
    recentCircuitEvents(params.routineId, 12),
  ]);
  return NextResponse.json({
    summary: {
      imports: Number(summary?.imports ?? 0),
      completions: Number(summary?.completions ?? 0),
      uniqueUsers: Number(summary?.unique_users ?? 0),
      lastActivity: summary?.last_activity ?? null,
    },
    recent,
  });
}
