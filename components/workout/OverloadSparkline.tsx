'use client';

import { useEffect, useState } from 'react';
import Sparkline from '@/components/charts/Sparkline';
import { SAMPLE_HISTORY } from '@/lib/sample-history';

interface OverloadSparklineProps {
  exerciseId: string;
}

// "Last: X" + trend arrow + sparkline. Fetches real history from
// /api/overload; if the DB isn't wired yet (503) it falls back to sample data
// so the feature is visible today.
export default function OverloadSparkline({ exerciseId }: OverloadSparklineProps) {
  const [data, setData] = useState<number[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/overload/${exerciseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        const live = (json.history ?? []).map((h: { maxWeight: number }) => h.maxWeight);
        setData(live.length >= 2 ? live : SAMPLE_HISTORY[exerciseId] ?? []);
      })
      .catch(() => active && setData(SAMPLE_HISTORY[exerciseId] ?? []));
    return () => {
      active = false;
    };
  }, [exerciseId]);

  if (data === null) {
    return <div className="h-12 animate-pulse rounded-md bg-surface-raised/50" />;
  }

  const last = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : undefined;
  const up = prev !== undefined && last > prev;
  const down = prev !== undefined && last < prev;

  return (
    <div className="rounded-md bg-surface-raised/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-muted">
          LAST{' '}
          <span className="nums font-semibold text-text-primary">
            {data.length ? `${last} lb` : '—'}
          </span>
        </span>
        {up && <span className="text-caption font-bold text-accent">↑ up</span>}
        {down && <span className="text-caption font-bold text-text-faint">↓</span>}
      </div>
      <div className="mt-1">
        <Sparkline data={data} />
      </div>
    </div>
  );
}
