'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StreakBadge from '@/components/daily5/StreakBadge';
import LengthDial from '@/components/home/LengthDial';
import StartSheet from '@/components/workout/StartSheet';
import type { Equipment, Exercise } from '@/lib/database.types';
import { computeStreak } from '@/lib/daily5';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import {
  DEFAULT_LENGTH,
  EQUIPMENT_CHOICES,
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
import { DAY_LABELS, fetchRoutines, type RoutineWithExercises } from '@/lib/routines';
import { generateWorkout } from '@/lib/workout-generator';
import { plannedCount } from '@/lib/workout-timing';

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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Home() {
  const router = useRouter();
  const [greet, setGreet] = useState('Welcome');
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [focus, setFocus] = useState('full');
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [sheet, setSheet] = useState<null | 'focus' | 'intensity' | 'equipment'>(null);
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
        .then((rs) => setToday(rs.filter((r) => r.day_of_week === dow && r.exercises.length > 0)))
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
  const ip = intensityParams(intensity);
  const params = profile ? workoutParams({ ...profile, intensity }) : null;
  const estCount = params ? plannedCount(params, length * 60) : 0;

  const toggleEquipment = (val: Equipment) => {
    if (!profile) return;
    const has = profile.equipment.includes(val);
    const next = has ? profile.equipment.filter((e) => e !== val) : [...profile.equipment, val];
    if (next.length === 0) return;
    persist({ equipment: next });
  };
  const eqLabels = profile?.equipment.map((e) => EQUIPMENT_LABEL[e]) ?? [];
  const eqSummary = eqLabels.length
    ? `${eqLabels.slice(0, 2).join(', ')}${eqLabels.length > 2 ? ` +${eqLabels.length - 2}` : ''}`
    : 'None selected';

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
              <div className="my-2">
                <LengthDial minutes={length} onChange={(m) => { setLength(m); persist({ length: m }); }} />
              </div>

              <button type="button" onClick={() => setSheet('focus')}
                className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised">
                <span>
                  <span className="block text-caption text-text-muted">FOCUS</span>
                  <span className="block text-h3 text-text-primary">{fc.emoji} {fc.label}</span>
                </span>
                <span className="text-text-faint">Change ›</span>
              </button>

              <button type="button" onClick={() => setSheet('intensity')}
                className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised">
                <span>
                  <span className="block text-caption text-text-muted">INTENSITY</span>
                  <span className="block text-h3 text-text-primary">{ip.label}</span>
                  <span className="block text-caption text-text-muted nums">
                    ≈ {estCount} exercises · {params?.sets ?? ip.sets} × {params?.reps ?? ip.repsNum} · {params?.restSec ?? ip.restSec}s rest
                  </span>
                </span>
                <span className="text-text-faint">Change ›</span>
              </button>

              <button type="button" onClick={() => setSheet('equipment')}
                className="mb-4 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised">
                <span>
                  <span className="block text-caption text-text-muted">EQUIPMENT</span>
                  <span className="block text-h3 text-text-primary">{eqSummary}</span>
                </span>
                <span className="text-text-faint">Change ›</span>
              </button>

              <button type="button" onClick={start}
                className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press">
                BUILD MY WORKOUT
              </button>
            </>
          )}

          <Link
            href="/plan"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
          >
            📅 PLAN MY WEEK
          </Link>
        </>
      )}

      {/* Change sheets */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/60" onClick={() => setSheet(null)} aria-label="Close" />
          <div className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-h3 text-text-primary">
              {sheet === 'focus' ? 'Choose a focus' : sheet === 'intensity' ? 'Intensity & volume' : 'Your equipment'}
            </p>

            {sheet === 'focus' && (
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_CHOICES.map((f) => {
                  const on = focus === f.value;
                  return (
                    <button key={f.value} type="button"
                      onClick={() => { setFocus(f.value); persist({ focus: f.value }); setSheet(null); }}
                      className={`rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
                      <span className="text-h3">{f.emoji}</span>
                      <span className="mt-1 block text-body font-semibold text-text-primary">{f.label}</span>
                      <span className="block text-caption text-text-muted">{f.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {sheet === 'intensity' && (
              <>
                <div className="space-y-2">
                  {INTENSITY_CHOICES.map((it) => {
                    const on = intensity === it.value;
                    return (
                      <button key={it.value} type="button"
                        onClick={() => { setIntensity(it.value); persist({ intensity: it.value, sets: it.sets, reps: it.repsNum, restSec: it.restSec }); }}
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
                        <span>
                          <span className="block text-body font-semibold text-text-primary">{it.label}</span>
                          <span className="block text-caption text-text-muted">{it.desc}</span>
                        </span>
                        {on && <span className="text-accent">●</span>}
                      </button>
                    );
                  })}
                </div>
                {/* Fine-tune sets / reps / rest */}
                <p className="mb-2 mt-4 text-caption text-text-muted">FINE-TUNE</p>
                <div className="space-y-2">
                  {([
                    { label: 'Sets', val: params?.sets ?? ip.sets, lo: 1, hi: 6, step: 1, key: 'sets' as const, unit: '' },
                    { label: 'Reps', val: params?.reps ?? ip.repsNum, lo: 5, hi: 20, step: 1, key: 'reps' as const, unit: '' },
                    { label: 'Rest', val: params?.restSec ?? ip.restSec, lo: 15, hi: 150, step: 15, key: 'restSec' as const, unit: 's' },
                  ]).map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                      <span className="text-body text-text-primary">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => persist({ [row.key]: clamp(row.val - row.step, row.lo, row.hi) } as Partial<Profile>)}
                          className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95">−</button>
                        <span className="w-12 text-center text-body font-semibold text-text-primary nums">{row.val}{row.unit}</span>
                        <button type="button" onClick={() => persist({ [row.key]: clamp(row.val + row.step, row.lo, row.hi) } as Partial<Profile>)}
                          className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setSheet(null)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]">
                  DONE
                </button>
              </>
            )}

            {sheet === 'equipment' && (
              <>
                <div className="space-y-2">
                  {EQUIPMENT_CHOICES.map((c) => {
                    const on = profile?.equipment.includes(c.value) ?? false;
                    return (
                      <button key={c.value} type="button" onClick={() => toggleEquipment(c.value)}
                        className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
                        <span className="flex items-center gap-3">
                          <span className="text-h3">{c.emoji}</span>
                          <span>
                            <span className="block text-body font-semibold text-text-primary">{c.label}</span>
                            <span className="block text-caption text-text-muted">{c.hint}</span>
                          </span>
                        </span>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent bg-accent text-on-accent' : 'border-border'}`}>
                          {on ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setSheet(null)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]">
                  DONE
                </button>
              </>
            )}
          </div>
        </div>
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
