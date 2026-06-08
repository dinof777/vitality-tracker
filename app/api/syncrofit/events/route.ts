import { NextResponse } from 'next/server';
import { recordSyncrofitEvent, type SyncrofitEventInput } from '@/lib/syncrofit-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Webhook SyncroFit POSTs to when a creator's circuit is imported or completed.
// Configure SyncroFit's partner URL to:
//   https://vitality-tracker-mauve.vercel.app/api/syncrofit/events
//
// Optional shared secret: set SYNCROFIT_WEBHOOK_SECRET in env (both sides) and
// SyncroFit sends `Authorization: Bearer <secret>`. Until set, the endpoint
// accepts unauthenticated posts so the loop works immediately.

const VALID_EVENTS = new Set(['circuit.imported', 'circuit.completed']);

export async function POST(req: Request) {
  const secret = process.env.SYNCROFIT_WEBHOOK_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SyncrofitEventInput;
  try {
    body = (await req.json()) as SyncrofitEventInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || !VALID_EVENTS.has(body.event)) {
    return NextResponse.json({ error: 'Unknown or missing event type' }, { status: 400 });
  }

  try {
    await recordSyncrofitEvent(body);
  } catch {
    return NextResponse.json({ error: 'Could not record event' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: body.event, circuitId: body.circuit?.id ?? null });
}

// Lightweight health check so you can confirm the URL is live in a browser.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'syncrofit events webhook', accepts: Array.from(VALID_EVENTS) });
}
