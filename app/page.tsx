'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StreakBadge from '@/components/daily5/StreakBadge';
import LengthDial from '@/components/home/LengthDial';
import { computeStreak } from '@/lib/daily5';
import {
  DEFAULT_LENGTH,
  FOCUS_CHOICES,
  INTENSITY_CHOICES,
  focusChoice,
  intensityParams,
  loadProfile,
  saveProfile,
  workoutParams,
  type Intensity,
  type Profile,
} from '@/lib/profile';
import { generateWorkout } from '@/lib/workout-generator';
import { plannedCount } from '@/lib/workout-timing';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
  const [sheet, setSheet] = useState<null | 'focus' | 'intensity'>(null);

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
    }
  }, []);

  const persist = (patch: Partial<Profile>) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
  };

  const start = () => {
    if (!profile) {
      router.push('/setup');
      return;
    }
    const ex = generateWorkout(profile, { focus, intensity, targetSeconds: length * 60 });
    if (ex.length) router.push(`/workout/active?ex=${ex.map((e) => e.id).join(',')}`);
  };

  const fc = focusChoice(focus);
  const ip = intensityParams(intensity);
  const params = profile ? workoutParams({ ...profile, intensity }) : null;
  const estCount = params ? plannedCount(params, length * 60) : 0;

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
              Pick your equipment, focus & intensity so the app can build workouts on the fly.
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
          <div className="my-4">
            <LengthDial minutes={length} onChange={(m) => { setLength(m); persist({ length: m }); }} />
          </div>

          {/* Tappable workout-feature cards */}
          <button
            type="button"
            onClick={() => setSheet('focus')}
            className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
          >
            <span>
              <span className="block text-caption text-text-muted">FOCUS</span>
              <span className="block text-h3 text-text-primary">
                {fc.emoji} {fc.label}
              </span>
            </span>
            <span className="text-text-faint">Change ›</span>
          </button>

          <button
            type="button"
            onClick={() => setSheet('intensity')}
            className="mb-4 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
          >
            <span>
              <span className="block text-caption text-text-muted">INTENSITY</span>
              <span className="block text-h3 text-text-primary">{ip.label}</span>
              <span className="block text-caption text-text-muted nums">
                ≈ {estCount} exercises · {params?.sets ?? ip.sets} × {params?.reps ?? ip.repsNum} · {params?.restSec ?? ip.restSec}s rest
              </span>
            </span>
            <span className="text-text-faint">Change ›</span>
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={start}
            className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
          >
            START WORKOUT
          </button>
          <div className="mt-3 flex gap-3">
            <Link href="/routines" className="flex h-12 flex-1 items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface">
              ROUTINES
            </Link>
            <Link href="/daily5" className="flex h-12 flex-1 items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface">
              DAILY 5
            </Link>
          </div>
        </>
      )}

      {/* Change sheets */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/60" onClick={() => setSheet(null)} aria-label="Close" />
          <div className="relative z-10 max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-h3 text-text-primary">
              {sheet === 'focus' ? 'Choose a focus' : 'Choose intensity'}
            </p>
            {sheet === 'focus' && (
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_CHOICES.map((f) => {
                  const on = focus === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => { setFocus(f.value); persist({ focus: f.value }); setSheet(null); }}
                      className={`rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
                    >
                      <span className="text-h3">{f.emoji}</span>
                      <span className="mt-1 block text-body font-semibold text-text-primary">{f.label}</span>
                      <span className="block text-caption text-text-muted">{f.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {sheet === 'intensity' && (
              <div className="space-y-2">
                {INTENSITY_CHOICES.map((it) => {
                  const on = intensity === it.value;
                  return (
                    <button
                      key={it.value}
                      type="button"
                      onClick={() => { setIntensity(it.value); persist({ intensity: it.value }); setSheet(null); }}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
                    >
                      <span>
                        <span className="block text-body font-semibold text-text-primary">{it.label}</span>
                        <span className="block text-caption text-text-muted nums">{it.desc} · {it.sets} × {it.reps}</span>
                      </span>
                      {on && <span className="text-accent">●</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
