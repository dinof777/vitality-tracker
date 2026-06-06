'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import {
  DEFAULT_LENGTH,
  FOCUS_CHOICES,
  INTENSITY_CHOICES,
  loadProfile,
  saveProfile,
  workoutParams,
  type Intensity,
  type Profile,
} from '@/lib/profile';
import { generateWorkout } from '@/lib/workout-generator';
import { formatMinutes, totalSeconds } from '@/lib/workout-timing';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';
import StartSheet from '@/components/workout/StartSheet';

// Clamp helper for the prescription steppers.
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function BuildPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState('full');
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [restSec, setRestSec] = useState(60);
  const [workout, setWorkout] = useState<Exercise[]>([]);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [showStart, setShowStart] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setReady(true);
    if (p) {
      const wp = workoutParams(p);
      setFocus(p.focus);
      setIntensity(p.intensity);
      setLength(p.length ?? DEFAULT_LENGTH);
      setSets(wp.sets);
      setReps(wp.reps);
      setRestSec(wp.restSec);
      setWorkout(generateWorkout(p, { targetSeconds: (p.length ?? DEFAULT_LENGTH) * 60 }));
    }
  }, []);

  useEffect(() => {
    if (ready && !profile) router.replace('/setup');
  }, [ready, profile, router]);

  if (!profile) return null;

  // Effective profile reflecting the current controls (also what we persist).
  const eff: Profile = { ...profile, focus, intensity, length, sets, reps, restSec };
  const params = workoutParams(eff);

  const apply = (patch: Partial<Profile>, nextWorkout = true) => {
    const next = { ...eff, ...patch };
    setProfile(next);
    saveProfile(next);
    if (nextWorkout) setWorkout(generateWorkout(next, { targetSeconds: (next.length ?? DEFAULT_LENGTH) * 60 }));
  };

  const start = () => {
    if (workout.length > 0) setShowStart(true);
  };
  const logInApp = () => {
    router.push(`/workout/active?ex=${workout.map((e) => e.id).join(',')}`);
  };
  const focusLabel = FOCUS_CHOICES.find((f) => f.value === focus)?.label ?? 'Vitality';

  const est = totalSeconds(workout, params);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-44 pt-8">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">ON THE FLY</p>
          <h1 className="text-h1 text-text-primary">Build a Workout</h1>
        </div>
        <Link href="/setup" className="mt-1 text-caption text-text-muted underline">
          Edit profile
        </Link>
      </header>

      {/* Length */}
      <div className="mb-5 flex items-center justify-between rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-caption text-text-muted">LENGTH</p>
          <p className="text-h2 text-text-primary nums">{length} min</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => apply({ length: clamp(length - 5, 10, 60) })} className="h-11 w-11 rounded-full border border-border text-h3 text-text-primary active:scale-95">−</button>
          <button type="button" onClick={() => apply({ length: clamp(length + 5, 10, 60) })} className="h-11 w-11 rounded-full border border-border text-h3 text-text-primary active:scale-95">+</button>
        </div>
      </div>

      {/* Focus */}
      <p className="mb-2 text-caption text-text-muted">FOCUS</p>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {FOCUS_CHOICES.map((f) => {
          const on = focus === f.value;
          return (
            <button key={f.value} type="button" onClick={() => { setFocus(f.value); apply({ focus: f.value }); }}
              className={`rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
              <span className="text-h3">{f.emoji}</span>
              <span className="mt-1 block text-body font-semibold text-text-primary">{f.label}</span>
              <span className="block text-caption text-text-muted">{f.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Intensity */}
      <p className="mb-2 text-caption text-text-muted">INTENSITY</p>
      <div className="mb-5 space-y-2">
        {INTENSITY_CHOICES.map((it) => {
          const on = intensity === it.value;
          return (
            <button key={it.value} type="button"
              onClick={() => { setIntensity(it.value); setSets(it.sets); setReps(it.repsNum); setRestSec(it.restSec); apply({ intensity: it.value, sets: it.sets, reps: it.repsNum, restSec: it.restSec }); }}
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

      {/* Prescription — sets / reps / rest */}
      <p className="mb-2 text-caption text-text-muted">SETS · REPS · REST</p>
      <div className="mb-5 space-y-2">
        {([
          { label: 'Sets', val: sets, set: setSets, lo: 1, hi: 6, step: 1, key: 'sets' as const, unit: '' },
          { label: 'Reps', val: reps, set: setReps, lo: 5, hi: 20, step: 1, key: 'reps' as const, unit: '' },
          { label: 'Rest between sets', val: restSec, set: setRestSec, lo: 15, hi: 150, step: 15, key: 'restSec' as const, unit: 's' },
        ]).map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
            <span className="text-body text-text-primary">{row.label}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => { const v = clamp(row.val - row.step, row.lo, row.hi); row.set(v); apply({ [row.key]: v } as Partial<Profile>); }}
                className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95">−</button>
              <span className="w-12 text-center text-body font-semibold text-text-primary nums">{row.val}{row.unit}</span>
              <button type="button" onClick={() => { const v = clamp(row.val + row.step, row.lo, row.hi); row.set(v); apply({ [row.key]: v } as Partial<Profile>); }}
                className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95">+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Generated workout */}
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-caption text-text-muted">YOUR WORKOUT</p>
        <p className="text-caption text-accent nums">{workout.length} moves · ~{formatMinutes(est)}</p>
      </div>
      {workout.length > 0 ? (
        <ul className="space-y-2">
          {workout.map((ex) => (
            <li key={ex.id}>
              <button type="button" onClick={() => setDetail(ex)}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-surface p-3 text-left active:bg-surface-raised">
                <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-text-primary">{ex.name}</span>
                  <span className="block text-caption text-text-muted">{ex.muscle_group}</span>
                </span>
                <span className="text-text-faint">ⓘ</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-body text-text-muted">
          No matching exercises for this focus + your equipment. Try another focus or add equipment in your profile.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md space-y-2 px-4 pt-2">
        <button type="button" onClick={() => apply({})} className="flex h-12 w-full items-center justify-center rounded-md border border-border bg-surface text-label text-text-primary shadow-lift active:scale-[0.97]">
          ↻ REGENERATE
        </button>
        <button type="button" onClick={start} disabled={workout.length === 0}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent shadow-lift transition-all active:scale-[0.97] active:bg-accent-press disabled:opacity-40">
          START WORKOUT
        </button>
      </div>

      {detail && <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />}
      {showStart && (
        <StartSheet
          exercises={workout}
          params={params}
          name={`${focusLabel} · ${length} min`}
          onLogInApp={logInApp}
          onClose={() => setShowStart(false)}
        />
      )}
    </main>
  );
}
