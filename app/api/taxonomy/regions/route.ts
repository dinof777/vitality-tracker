import { NextResponse } from 'next/server';
import { fetchRegionHierarchy } from '@/lib/taxonomy-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, no auth: the admin-managed muscle-group hierarchy, for the workout
// builder's REGION tiles ("Upper Body" → Chest / Back / Shoulders / …). Core
// muscle groups are global — every trainee-facing surface already reads them —
// so exposing the tree here is no different a trust boundary.
//
// The server-rendered gym build page reads the same lib/taxonomy-db helper
// directly rather than round-tripping through this route; this is for the
// client-side builder (personal app + gym builder's own controls).

export async function GET() {
  return NextResponse.json({ regions: await fetchRegionHierarchy() });
}
