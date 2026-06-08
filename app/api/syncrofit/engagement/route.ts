import { NextResponse } from 'next/server';
import { allCircuitEngagement } from '@/lib/syncrofit-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Compact engagement for every circuit → { [circuitId]: { imports, completions } }.
// The routines list maps routine.id → counts for its badges.
export async function GET() {
  return NextResponse.json(await allCircuitEngagement());
}
