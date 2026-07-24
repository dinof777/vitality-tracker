import { NextResponse } from 'next/server';
import { currentTrainer } from '@/lib/current-tenant';
import { authorizeClient, insertMetric, fetchMetricHistory } from '@/lib/client-portal-db';
import { isMetricType, validateMetricValue, validateRecordedAt, clampNote, type MetricType } from '@/lib/client-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A client's weight_kg / hrv_ms readings. Trainer-entry-only in this pass
// (Elena §5) — recorded_by is always forced to 'trainer' server-side,
// regardless of what the request body sends. Same tenant/owner guard as
// every other clients route.

// GET .../metrics?type=weight_kg|hrv_ms -> { history: [{ value, recordedAt }, …] }
// oldest-first, feeds components/charts/Sparkline.tsx directly.
export async function GET(req: Request, { params }: { params: { clientId: string } }) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  const client = await authorizeClient(params.clientId, t.tenant.id, t.userId, t.isOwner);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const type = new URL(req.url).searchParams.get('type');
  if (!isMetricType(type)) {
    return NextResponse.json({ error: "type must be 'weight_kg' or 'hrv_ms'." }, { status: 400 });
  }

  const history = await fetchMetricHistory(params.clientId, type as MetricType);
  return NextResponse.json({ history });
}

// POST { metricType, value, recordedAt?, note? } -> { metric } (201)
export async function POST(req: Request, { params }: { params: { clientId: string } }) {
  const t = await currentTrainer();
  if (!t) return NextResponse.json({ error: 'No gym for this account.' }, { status: 403 });

  const client = await authorizeClient(params.clientId, t.tenant.id, t.userId, t.isOwner);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: { metricType?: unknown; value?: unknown; recordedAt?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isMetricType(body.metricType)) {
    return NextResponse.json({ error: "metricType must be 'weight_kg' or 'hrv_ms'." }, { status: 400 });
  }
  const valueCheck = validateMetricValue(body.metricType, body.value);
  if (!valueCheck.ok || valueCheck.value === undefined) {
    return NextResponse.json({ error: valueCheck.error }, { status: 400 });
  }
  const dateCheck = validateRecordedAt(body.recordedAt);
  if (!dateCheck.ok || !dateCheck.iso) {
    return NextResponse.json({ error: dateCheck.error }, { status: 400 });
  }
  const note = clampNote(body.note);

  const metric = await insertMetric(params.clientId, t.tenant.id, body.metricType, valueCheck.value, dateCheck.iso, note);

  return NextResponse.json(
    {
      metric: {
        id: metric.id,
        clientId: metric.client_id,
        metricType: metric.metric_type,
        value: Number(metric.value),
        recordedAt: metric.recorded_at,
        recordedBy: metric.recorded_by,
        note: metric.note,
        createdAt: metric.created_at,
      },
    },
    { status: 201 },
  );
}
