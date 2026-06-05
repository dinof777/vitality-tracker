'use client';

import { useEffect, useState } from 'react';
import ChecklistItem from '@/components/daily5/ChecklistItem';
import StreakBadge from '@/components/daily5/StreakBadge';
import {
  DAILY_5,
  computeStreak,
  isDayComplete,
  loadDay,
  saveDay,
  todayKey,
} from '@/lib/daily5';

export default function Daily5Page() {
  const [checked, setChecked] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [celebrated, setCelebrated] = useState(false);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setChecked(loadDay(todayKey()));
    setStreak(computeStreak());
    setReady(true);
  }, []);

  // Persist + sync whenever the checklist changes (functional toggle below keeps
  // rapid taps correct; this effect handles the side effects once per commit).
  useEffect(() => {
    if (!ready) return;
    const today = todayKey();
    saveDay(today, checked); // localStorage first (offline-safe)
    const s = computeStreak();
    setStreak(s);
    if (!isDayComplete(checked)) setCelebrated(false);

    // Fire-and-forget cloud sync (no-op 503 until Supabase is wired).
    void fetch('/api/mobility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, completedItems: checked, streakCount: s }),
    }).catch(() => {});
  }, [checked, ready]);

  const toggle = (key: string) => {
    setChecked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const complete = isDayComplete(checked);

  const completeDay = () => {
    setCelebrated(true);
    setStreak(computeStreak());
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">DAILY 5</p>
          <h1 className="text-h1 text-text-primary">Live Elevated</h1>
        </div>
        <StreakBadge streak={streak} />
      </header>

      <div className="space-y-2">
        {DAILY_5.map((item) => (
          <ChecklistItem
            key={item.key}
            label={item.label}
            subtitle={item.subtitle}
            checked={ready && checked.includes(item.key)}
            onToggle={() => toggle(item.key)}
          />
        ))}
      </div>

      {complete && !celebrated && (
        <button
          type="button"
          onClick={completeDay}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          COMPLETE DAY
        </button>
      )}

      {complete && celebrated && (
        <p className="mt-6 rounded-md bg-energy/15 p-4 text-center text-h3 text-energy">
          Day complete! 🔥
        </p>
      )}
    </main>
  );
}
