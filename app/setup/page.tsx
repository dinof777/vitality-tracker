'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Equipment } from '@/lib/database.types';
import type { Goal, Pillar } from '@/lib/pillars';
import { DEFAULT_GOAL, GOAL_CHOICES, GOAL_PILLAR_SEED, PILLAR_LABEL } from '@/lib/pillars';
import { EQUIPMENT_CHOICES, INTENSITY_CHOICES, loadProfile, saveProfile, type Intensity } from '@/lib/profile';
import FocusPicker from '@/components/workout/FocusPicker';

const STEPS = 4;
const DEFAULT_MUSCLE_FOCUS = 'full';
const DEFAULT_REHAB_FOCUS = 'physical-therapy';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL);
  const [focus, setFocus] = useState(DEFAULT_MUSCLE_FOCUS);
  const [equipment, setEquipment] = useState<Equipment[]>([
    'dumbbell',
    'calisthenics',
    'tube_band',
    'loop_band',
    'stretch',
  ]);
  // (kettlebell / pull-up bar / medicine ball / jump rope start unchecked — opt in.)
  const [intensity, setIntensity] = useState<Intensity>('moderate');

  // Pre-fill from an existing profile (editing).
  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setGoal(p.goal ?? DEFAULT_GOAL);
      setEquipment(p.equipment);
      setFocus(p.focus);
      setIntensity(p.intensity);
    }
  }, []);

  const selectGoal = (g: Goal) => {
    setGoal(g);
    // The muscle tree and the rehab tree are unrelated shapes — a focus value
    // from one isn't valid in the other, so reset to that goal's default
    // rather than carrying over a value that could resolve to nothing.
    setFocus(g === 'recover_rehab' ? DEFAULT_REHAB_FOCUS : DEFAULT_MUSCLE_FOCUS);
  };

  const toggleEquip = (v: Equipment) =>
    setEquipment((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const finish = () => {
    saveProfile({ goal, equipment, focus, intensity });
    router.push('/');
  };

  const canNext = step === 2 ? equipment.length > 0 : true;
  const isRehab = goal === 'recover_rehab';
  // build_muscle/weight_loss seed step 2 straight past its own step 1 (via
  // GOAL_PILLAR_SEED → FocusPicker's initialPillar below) — so the user never
  // sees the Full Body tile this screen's default copy promises. general_health
  // has no seed and genuinely starts at step 1, so it keeps that copy.
  const seededPillar = !isRehab ? (GOAL_PILLAR_SEED[goal] as Pillar | undefined) : undefined;
  const seededPillarLabel = seededPillar ? PILLAR_LABEL[seededPillar] : undefined;

  return (
    <main className="shell-tight flex min-h-dvh flex-col px-4 pb-28 pt-10">
      {/* progress dots */}
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-raised'}`} />
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 1 OF {STEPS}</p>
            <h1 className="text-h1 text-text-primary">What&rsquo;s the goal?</h1>
            <p className="text-body text-text-muted">This shapes how your workouts &amp; weekly plan are weighted.</p>
          </div>
          <div className="space-y-2">
            {GOAL_CHOICES.map((g) => {
              const on = goal === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => selectGoal(g.value)}
                  className={`flex w-full items-center gap-3 rounded-md border p-4 text-left transition-colors ${
                    on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                  }`}
                >
                  <span className="text-h2">{g.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-body font-semibold text-text-primary">{g.label}</span>
                    <span className="block text-caption text-text-muted">{g.hint}</span>
                  </span>
                  {on && <span className="text-accent">●</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 2 OF {STEPS}</p>
            <h1 className="text-h1 text-text-primary">{isRehab ? 'Which area?' : 'Where do you want to focus?'}</h1>
            <p className="text-body text-text-muted">
              {isRehab
                ? 'Pick a joint to narrow, or leave it on Physical Therapy for every area.'
                : seededPillarLabel
                  ? `Pick a muscle to narrow further, or use every ${seededPillarLabel} exercise.`
                  : 'Pick a muscle group to narrow, or leave it on Full Body. You can refine any single workout later.'}
            </p>
          </div>
          <FocusPicker value={focus} onSelect={setFocus} initialPillar={GOAL_PILLAR_SEED[goal] ?? null} />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 3 OF {STEPS}</p>
            <h1 className="text-h1 text-text-primary">What do you have?</h1>
            <p className="text-body text-text-muted">Pick the equipment you train with.</p>
          </div>
          <div className="space-y-2">
            {EQUIPMENT_CHOICES.map((c) => {
              const on = equipment.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleEquip(c.value)}
                  className={`flex w-full items-center justify-between rounded-md border p-4 text-left transition-colors ${
                    on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-h2">{c.emoji}</span>
                    <span>
                      <span className="block text-body font-semibold text-text-primary">{c.label}</span>
                      <span className="block text-caption text-text-muted">{c.hint}</span>
                    </span>
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      on ? 'border-accent bg-accent text-on-accent' : 'border-border'
                    }`}
                  >
                    {on ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 4 OF {STEPS}</p>
            <h1 className="text-h1 text-text-primary">Intensity?</h1>
            <p className="text-body text-text-muted">Sets the volume of generated workouts.</p>
          </div>
          <div className="space-y-2">
            {INTENSITY_CHOICES.map((it) => (
              <button
                key={it.value}
                type="button"
                onClick={() => setIntensity(it.value)}
                className={`flex w-full items-center justify-between rounded-md border p-4 text-left transition-colors ${
                  intensity === it.value ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                }`}
              >
                <span>
                  <span className="block text-body font-semibold text-text-primary">{it.label}</span>
                  <span className="block text-caption text-text-muted">
                    {it.desc} · {it.count} exercises · {it.sets} × {it.reps}
                  </span>
                </span>
                {intensity === it.value && <span className="text-accent">●</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex-1" />

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="h-14 rounded-md border border-border px-6 text-label text-text-muted"
          >
            Back
          </button>
        )}
        {step < STEPS - 1 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="h-14 flex-1 rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] disabled:opacity-40"
          >
            NEXT
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="h-14 flex-1 rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97]"
          >
            SAVE &amp; BUILD
          </button>
        )}
      </div>
    </main>
  );
}
