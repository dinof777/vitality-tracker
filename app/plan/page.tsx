'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DAY_KIND,
  DAY_NAMES,
  DEFAULT_DAYS_PER_WEEK,
  DEFAULT_GOAL,
  GOAL_CHOICES,
  type Goal,
} from '@/lib/pillars';
import { generateWeek, type DayPlan } from '@/lib/plan-generator';
import { loadProfile, saveProfile, workoutParams, type Profile } from '@/lib/profile';
import { formatMinutes, totalSeconds } from '@/lib/workout-timing';
import { clearWeeklyPlan, createRoutine, saveRoutineExercises } from '@/lib/routines';

export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [days, setDays] = useState(DEFAULT_DAYS_PER_WEEK);
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);
  const [week, setWeek] = useState<DayPlan[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setReady(true);
    if (p) {
      const d = p.daysPerWeek ?? DEFAULT_DAYS_PER_WEEK;
      const g = p.goal ?? DEFAULT_GOAL;
      setDays(d);
      setGoal(g);
      setWeek(generateWeek(p, { daysPerWeek: d, goal: g }));
    }
  }, []);

  useEffect(() => {
    if (ready && !profile) router.replace('/setup');
  }, [ready, profile, router]);

  if (!profile) return null;

  const regen = (patch: Partial<Profile>, d = days, g = goal) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
    setWeek(generateWeek(next, { daysPerWeek: d, goal: g }));
    setSaved(false);
  };

  const params = workoutParams(profile);

  const savePlan = async () => {
    if (saving) return;
    setSaving(true);
    // Only one weekly plan at a time — replace any existing plan routines.
    await clearWeeklyPlan();
    const training = week.filter((d) => d.exercises.length > 0);
    for (const d of training) {
      const r = await createRoutine(`${DAY_NAMES[d.day]} · ${DAY_KIND[d.kind].label}`, d.day, true);
      if (r) {
        await saveRoutineExercises(
          r.id,
          d.exercises.map((e) => ({ exerciseId: e.id, sets: null, reps: null, tempo: null })),
        );
      }
    }
    setSaving(false);
    setSaved(true);
    router.push('/routines');
  };

  const trainingCount = week.filter((d) => d.exercises.length > 0).length;

  return (
    <main className="shell min-h-dvh px-4 pb-44 pt-8">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">4 PILLARS</p>
          <h1 className="text-h1 text-text-primary">Plan my week</h1>
          <p className="text-body text-text-muted">Strength · Cardio · Balance · Flexibility</p>
        </div>
        <Link href="/setup" className="mt-1 text-caption text-text-muted underline">
          Level &amp; equipment
        </Link>
      </header>

      {/* Days per week */}
      <p className="mb-2 text-caption text-text-muted">DAYS PER WEEK</p>
      <div className="mb-5 flex gap-2">
        {[3, 4, 5, 6].map((d) => {
          const on = days === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => { setDays(d); regen({ daysPerWeek: d }, d, goal); }}
              className={`h-12 flex-1 rounded-md border text-label transition-colors ${
                on ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Goal */}
      <p className="mb-2 text-caption text-text-muted">GOAL</p>
      <div className="mb-5 space-y-2">
        {GOAL_CHOICES.map((g) => {
          const on = goal === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => { setGoal(g.value); regen({ goal: g.value }, days, g.value); }}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
              }`}
            >
              <span className="text-h3">{g.emoji}</span>
              <span className="flex-1">
                <span className="block text-body font-semibold text-text-primary">{g.label}</span>
                <span className="block text-caption text-text-muted">{g.hint}</span>
              </span>
              {on && <span className="text-accent">●</span>}
            </button>
          );
        })}
      </div>

      {/* Week */}
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-caption text-text-muted">YOUR WEEK</p>
        <button type="button" onClick={() => regen({})} className="text-caption text-accent">↻ Regenerate</button>
      </div>
      <ul className="space-y-2">
        {week.map((d) => {
          const meta = DAY_KIND[d.kind];
          const isRest = d.exercises.length === 0;
          const est = totalSeconds(d.exercises, params);
          const expandable = !isRest;
          return (
            <li key={d.day} className="overflow-hidden rounded-lg border border-border bg-surface">
              <button
                type="button"
                disabled={!expandable}
                onClick={() => setOpen(open === d.day ? null : d.day)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <span className="w-9 shrink-0 text-caption font-semibold text-text-muted">{DAY_NAMES[d.day]}</span>
                <span className="text-h3">{meta.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-text-primary">{meta.label}</span>
                  <span className="block text-caption text-text-muted nums">
                    {isRest ? meta.blurb : `${d.exercises.length} exercises · ~${formatMinutes(est)}`}
                  </span>
                </span>
                {expandable && <span className="text-text-faint">{open === d.day ? '▾' : '›'}</span>}
              </button>
              {open === d.day && !isRest && (
                <ul className="border-t border-border px-3 py-2">
                  {d.exercises.map((ex) => (
                    <li key={ex.id} className="flex items-center justify-between py-1 text-caption">
                      <span className="text-text-primary">{ex.name}</span>
                      <span className="text-text-muted">{ex.muscle_group}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md px-4 pt-2">
        <button
          type="button"
          onClick={savePlan}
          disabled={saving || trainingCount === 0}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent shadow-lift transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : `SAVE PLAN · ${trainingCount} ROUTINES`}
        </button>
      </div>
    </main>
  );
}
