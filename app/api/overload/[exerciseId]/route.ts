import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/overload/[exerciseId] — max weight per the last 8 workout dates for
// an exercise, oldest-to-newest, for the progressive-overload sparkline.
export async function GET(
  _req: Request,
  { params }: { params: { exerciseId: string } },
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase not configured', history: [] },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from('log_entries')
    .select('weight, created_at')
    .eq('exercise_id', params.exerciseId)
    .not('weight', 'is', null)
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reduce to max weight per calendar day.
  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const day = (row.created_at as string).slice(0, 10);
    const w = Number(row.weight);
    byDay.set(day, Math.max(byDay.get(day) ?? 0, w));
  }

  const history = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1)) // oldest -> newest
    .slice(-8)
    .map(([date, maxWeight]) => ({ date, maxWeight }));

  return NextResponse.json({ history });
}
