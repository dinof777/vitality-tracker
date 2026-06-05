'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StreakBadge from '@/components/daily5/StreakBadge';
import { computeStreak } from '@/lib/daily5';
import { DAY_LABELS, loadRoutines, type LocalRoutine } from '@/lib/routine-store';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const [greet, setGreet] = useState('Welcome');
  const [streak, setStreak] = useState(0);
  const [todayRoutine, setTodayRoutine] = useState<LocalRoutine | null>(null);

  useEffect(() => {
    const now = new Date();
    setGreet(greeting(now.getHours()));
    setStreak(computeStreak());
    const isoDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun
    const routines = loadRoutines();
    setTodayRoutine(routines.find((r) => r.dayOfWeek === isoDay) ?? routines[0] ?? null);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-12">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-label text-accent">LIVE ELEVATED</p>
          <h1 className="text-h1 text-text-primary">{greet}</h1>
        </div>
        <StreakBadge streak={streak} />
      </header>

      <section className="mt-8 rounded-lg border border-border bg-surface p-4">
        <p className="text-caption text-text-muted">TODAY&apos;S ROUTINE</p>
        {todayRoutine ? (
          <>
            <p className="mt-1 text-h2 text-text-primary">{todayRoutine.name}</p>
            <p className="text-caption text-text-muted nums">
              {todayRoutine.exercises.length} exercise
              {todayRoutine.exercises.length === 1 ? '' : 's'}
              {todayRoutine.dayOfWeek ? ` · ${DAY_LABELS[todayRoutine.dayOfWeek]}` : ''}
            </p>
          </>
        ) : (
          <p className="mt-1 text-body text-text-muted">
            No routine yet —{' '}
            <Link href="/routines" className="text-accent">
              build your first blueprint
            </Link>
            .
          </p>
        )}
      </section>

      <div className="flex-1" />

      <div className="space-y-3">
        <Link
          href="/workout/active"
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          START TODAY&apos;S WORKOUT
        </Link>
        <Link
          href="/daily5"
          className="flex h-14 w-full items-center justify-center rounded-md border border-border text-label text-text-primary transition-all duration-150 active:scale-[0.97] active:bg-surface"
        >
          LOG DAILY 5
        </Link>
      </div>
    </main>
  );
}
