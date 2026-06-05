'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StreakBadge from '@/components/daily5/StreakBadge';
import { computeStreak } from '@/lib/daily5';
import { DAY_LABELS, fetchRoutines, type RoutineWithExercises } from '@/lib/routines';
import { loadProfile } from '@/lib/profile';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const [greet, setGreet] = useState('Welcome');
  const [streak, setStreak] = useState(0);
  const [todayRoutine, setTodayRoutine] = useState<RoutineWithExercises | null>(null);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    const now = new Date();
    setGreet(greeting(now.getHours()));
    setStreak(computeStreak());
    setHasProfile(Boolean(loadProfile()));
    const isoDay = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun
    fetchRoutines().then((routines) => {
      setTodayRoutine(routines.find((r) => r.day_of_week === isoDay) ?? routines[0] ?? null);
    });
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
          <Link href={`/routines/${todayRoutine.id}`} className="mt-1 block">
            <p className="text-h2 text-text-primary">{todayRoutine.name}</p>
            <p className="text-caption text-text-muted nums">
              {todayRoutine.exercises.length} exercise
              {todayRoutine.exercises.length === 1 ? '' : 's'}
              {todayRoutine.day_of_week ? ` · ${DAY_LABELS[todayRoutine.day_of_week]}` : ''}
            </p>
          </Link>
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

      {/* First-run nudge to set up the profile */}
      {!hasProfile && (
        <Link
          href="/setup"
          className="mt-4 block rounded-lg border border-accent/40 bg-accent/10 p-4"
        >
          <p className="text-body font-semibold text-text-primary">⚡ Set up your training profile</p>
          <p className="text-caption text-text-muted">
            Pick your equipment, focus & intensity so the app can build workouts on the fly.
          </p>
        </Link>
      )}

      <div className="flex-1" />

      <div className="space-y-3">
        <Link
          href="/build"
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          ⚡ BUILD A WORKOUT
        </Link>
        <Link
          href={todayRoutine ? `/workout/active?routine=${todayRoutine.id}` : '/workout/active'}
          className="flex h-14 w-full items-center justify-center rounded-md border border-border text-label text-text-primary transition-all duration-150 active:scale-[0.97] active:bg-surface"
        >
          {todayRoutine ? "START TODAY'S ROUTINE" : 'START A WORKOUT'}
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
