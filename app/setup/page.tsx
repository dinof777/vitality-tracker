'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Equipment } from '@/lib/database.types';
import {
  EQUIPMENT_CHOICES,
  FOCUS_CHOICES,
  INTENSITY_CHOICES,
  loadProfile,
  saveProfile,
  type Intensity,
} from '@/lib/profile';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [equipment, setEquipment] = useState<Equipment[]>([
    'dumbbell',
    'tube_band',
    'loop_band',
    'isometric',
    'stretch',
  ]);
  const [focus, setFocus] = useState('full');
  const [intensity, setIntensity] = useState<Intensity>('moderate');

  // Pre-fill from an existing profile (editing).
  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setEquipment(p.equipment);
      setFocus(p.focus);
      setIntensity(p.intensity);
    }
  }, []);

  const toggleEquip = (v: Equipment) =>
    setEquipment((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const finish = () => {
    saveProfile({ equipment, focus, intensity });
    router.push('/build');
  };

  const canNext = step === 0 ? equipment.length > 0 : true;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-10">
      {/* progress dots */}
      <div className="mb-6 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-raised'}`}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 1 OF 3</p>
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
                  <span>
                    <span className="block text-body font-semibold text-text-primary">{c.label}</span>
                    <span className="block text-caption text-text-muted">{c.hint}</span>
                  </span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${
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

      {step === 1 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 2 OF 3</p>
            <h1 className="text-h1 text-text-primary">Default focus?</h1>
            <p className="text-body text-text-muted">You can change this any time you build.</p>
          </div>
          <div className="space-y-2">
            {FOCUS_CHOICES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFocus(f.value)}
                className={`flex w-full items-center justify-between rounded-md border p-4 text-left transition-colors ${
                  focus === f.value ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                }`}
              >
                <span className="text-body font-semibold text-text-primary">{f.label}</span>
                {focus === f.value && <span className="text-accent">●</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div>
            <p className="text-label text-accent">STEP 3 OF 3</p>
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
        {step < 2 ? (
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
            SAVE & BUILD
          </button>
        )}
      </div>
    </main>
  );
}
