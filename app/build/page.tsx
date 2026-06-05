'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import {
  FOCUS_CHOICES,
  INTENSITY_CHOICES,
  loadProfile,
  type Intensity,
  type Profile,
} from '@/lib/profile';
import { generateWorkout } from '@/lib/workout-generator';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';

export default function BuildPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState('full');
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [workout, setWorkout] = useState<Exercise[]>([]);
  const [detail, setDetail] = useState<Exercise | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setReady(true);
    if (p) {
      setFocus(p.focus);
      setIntensity(p.intensity);
      setWorkout(generateWorkout(p, { focus: p.focus, intensity: p.intensity }));
    }
  }, []);

  // No profile yet → send to setup.
  useEffect(() => {
    if (ready && !profile) router.replace('/setup');
  }, [ready, profile, router]);

  if (!profile) return null;

  const regenerate = (f = focus, i = intensity) =>
    setWorkout(generateWorkout(profile, { focus: f, intensity: i }));

  const start = () => {
    if (workout.length === 0) return;
    router.push(`/workout/active?ex=${workout.map((e) => e.id).join(',')}`);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40 pt-8">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">ON THE FLY</p>
          <h1 className="text-h1 text-text-primary">Build a Workout</h1>
        </div>
        <Link href="/setup" className="mt-1 text-caption text-text-muted underline">
          Edit profile
        </Link>
      </header>

      {/* Focus selector */}
      <p className="mb-2 text-caption text-text-muted">FOCUS</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {FOCUS_CHOICES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setFocus(f.value);
              regenerate(f.value, intensity);
            }}
            className={`h-9 rounded-full px-3 text-caption font-semibold transition-colors ${
              focus === f.value ? 'bg-accent text-on-accent' : 'bg-surface-raised text-text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Intensity selector */}
      <p className="mb-2 text-caption text-text-muted">INTENSITY</p>
      <div className="mb-5 flex gap-2">
        {INTENSITY_CHOICES.map((it) => (
          <button
            key={it.value}
            type="button"
            onClick={() => {
              setIntensity(it.value);
              regenerate(focus, it.value);
            }}
            className={`h-9 flex-1 rounded-full text-caption font-semibold transition-colors ${
              intensity === it.value ? 'bg-accent text-on-accent' : 'bg-surface-raised text-text-muted'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* Generated list */}
      {workout.length > 0 ? (
        <ul className="space-y-2">
          {workout.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => setDetail(ex)}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-surface p-3 text-left active:bg-surface-raised"
              >
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

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md space-y-2 px-4 pt-2">
        <button
          type="button"
          onClick={() => regenerate()}
          className="flex h-12 w-full items-center justify-center rounded-md border border-border bg-surface text-label text-text-primary shadow-lift active:scale-[0.97]"
        >
          ↻ REGENERATE
        </button>
        <button
          type="button"
          onClick={start}
          disabled={workout.length === 0}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent shadow-lift transition-all active:scale-[0.97] active:bg-accent-press disabled:opacity-40"
        >
          START WORKOUT
        </button>
      </div>

      {detail && <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
