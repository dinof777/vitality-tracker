'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StreakBadge from '@/components/daily5/StreakBadge';
import StartSheet from '@/components/workout/StartSheet';
import BuilderControls from '@/components/workout/BuilderControls';
import type { Exercise } from '@/lib/database.types';
import { computeStreak } from '@/lib/daily5';
import {
  DEFAULT_LENGTH,
  focusChoice,
  loadProfile,
  saveProfile,
  workoutParams,
  type Intensity,
  type Profile,
} from '@/lib/profile';
import { DAY_LABELS, fetchRoutines, type RoutineWithExercises } from '@/lib/routines';
import { generateWorkout } from '@/lib/workout-generator';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// JS getDay() is 0=Sun…6=Sat; our day_of_week is 1=Mon…7=Sun.
function todayDow(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}


export default function Home() {
  const router = useRouter();
  const [greet, setGreet] = useState('Welcome');
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [focus, setFocus] = useState('full');
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [pending, setPending] = useState<Exercise[] | null>(null);
  const [today, setToday] = useState<RoutineWithExercises[]>([]);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    const now = new Date();
    setGreet(greeting(now.getHours()));
    setStreak(computeStreak());
    const p = loadProfile();
    setProfile(p);
    setReady(true);
    if (p) {
      setFocus(p.focus);
      setIntensity(p.intensity);
      setLength(p.length ?? DEFAULT_LENGTH);
      const dow = todayDow();
      fetchRoutines()
        .then((rs) => setToday(rs.filter((r) => r.from_plan && r.day_of_week === dow && r.exercises.length > 0)))
        .catch(() => setToday([]));
    }
  }, []);

  const persist = (patch: Partial<Profile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  };

  const start = () => {
    if (!profile) {
      router.push('/setup');
      return;
    }
    const ex = generateWorkout(profile, { focus, intensity, targetSeconds: length * 60 });
    if (ex.length) setPending(ex);
  };

  const logInApp = () => {
    if (pending) router.push(`/workout/active?ex=${pending.map((e) => e.id).join(',')}`);
  };

  const fc = focusChoice(focus);
  const params = profile ? workoutParams({ ...profile, intensity }) : null;


  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-10">
      <header className="mb-4 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-label text-accent">LIVE ELEVATED</p>
          <h1 className="text-h1 text-text-primary">{greet}</h1>
        </div>
        <StreakBadge streak={streak} />
      </header>

      {!ready ? (
        <div className="flex-1" />
      ) : !profile ? (
        <>
          <Link href="/setup" className="mt-2 block rounded-lg border border-accent/40 bg-accent/10 p-5">
            <p className="text-h3 text-text-primary">⚡ Set up your profile</p>
            <p className="mt-1 text-body text-text-muted">
              Pick your equipment, focus &amp; intensity so the app can build workouts on the fly.
            </p>
          </Link>
          <div className="flex-1" />
          <Link
            href="/setup"
            className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
          >
            GET STARTED
          </Link>
        </>
      ) : (
        <>
          {/* Today's plan — start the scheduled routine in one tap */}
          {today.length > 0 && (
            <section className="mb-5">
              <p className="mb-2 text-caption text-text-muted">TODAY · {DAY_LABELS[todayDow()]}</p>
              {today.map((r) => (
                <div key={r.id} className="mb-2 rounded-lg border border-accent/40 bg-accent/10 p-4">
                  <p className="text-h3 text-text-primary">{r.name}</p>
                  <p className="mb-3 text-caption text-text-muted">
                    {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'} · from your weekly plan
                  </p>
                  <Link
                    href={`/workout/active?routine=${r.id}`}
                    className="flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
                  >
                    ▶ START TODAY&apos;S WORKOUT
                  </Link>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBuilding((b) => !b)}
                className="mt-1 w-full text-center text-caption text-text-muted underline"
              >
                {building ? 'Hide builder' : 'or build a different workout'}
              </button>
            </section>
          )}

          {/* Quick builder — always shown when no plan today, else toggled */}
          {(today.length === 0 || building) && (
            <>
              <BuilderControls
                value={{
                  focus,
                  intensity,
                  minutes: length,
                  equipment: profile?.equipment ?? [],
                  sets: params?.sets,
                  reps: params?.reps,
                  restSec: params?.restSec,
                }}
                onChange={(patch) => {
                  if (patch.minutes !== undefined) { setLength(patch.minutes); persist({ length: patch.minutes }); }
                  if (patch.focus !== undefined) { setFocus(patch.focus); persist({ focus: patch.focus }); }
                  if (patch.intensity !== undefined) setIntensity(patch.intensity);
                  const rest: Partial<Profile> = {};
                  for (const k of ['intensity', 'equipment', 'sets', 'reps', 'restSec'] as const) {
                    if (patch[k] !== undefined) (rest as Record<string, unknown>)[k] = patch[k];
                  }
                  if (Object.keys(rest).length) persist(rest);
                }}
              />

              <button type="button" onClick={start}
                className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press">
                BUILD MY WORKOUT
              </button>
            </>
          )}

          {/* Always available — the manual alternative to letting it generate. */}
          <Link
            href="/build"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
          >
            ✚ PICK MY OWN MOVES
          </Link>

          <Link
            href="/plan"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
          >
            📅 PLAN MY WEEK
          </Link>
        </>
      )}

      {pending && params && (
        <StartSheet
          exercises={pending}
          params={params}
          name={`${fc.label} · ${length} min`}
          onLogInApp={logInApp}
          onClose={() => setPending(null)}
        />
      )}
    </main>
  );
}
