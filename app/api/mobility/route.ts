import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/mobility?date=YYYY-MM-DD — today's mobility log (if any).
export async function GET(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured', log: null }, { status: 503 });
  }
  const date = new URL(req.url).searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date query param required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mobility_logs')
    .select('*')
    .eq('logged_date', date)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data });
}

// POST /api/mobility — upsert today's checklist completion + streak.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { date?: string; completedItems?: string[]; streakCount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mobility_logs')
    .upsert(
      {
        logged_date: body.date,
        completed_items: body.completedItems ?? [],
        streak_count: body.streakCount ?? 0,
      },
      { onConflict: 'logged_date' },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data });
}
