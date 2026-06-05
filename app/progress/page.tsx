'use client';

import { useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import OverloadSparkline from '@/components/workout/OverloadSparkline';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';
import { SAMPLE_EXERCISES } from '@/lib/exercises';

// Progress overview — progressive-overload sparkline per exercise. Tap an
// exercise to open its detail.
export default function ProgressPage() {
  const [detail, setDetail] = useState<Exercise | null>(null);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-label text-accent">PROGRESSIVE OVERLOAD</p>
        <h1 className="text-h1 text-text-primary">Progress</h1>
        <p className="text-body text-text-muted">Your weight trend per movement.</p>
      </header>

      <div className="space-y-3">
        {SAMPLE_EXERCISES.map((ex) => (
          <section key={ex.id} className="rounded-lg border border-border bg-surface p-4">
            <button
              type="button"
              onClick={() => setDetail(ex)}
              className="mb-2 flex w-full items-center gap-3 text-left active:opacity-70"
            >
              <ExerciseThumb
                equipment={ex.equipment}
                imageUrl={ex.image_url}
                name={ex.name}
                size={40}
              />
              <span className="flex-1 text-h3 text-text-primary">{ex.name}</span>
              {ex.muscle_group && (
                <span className="rounded-sm bg-surface-raised px-2 py-0.5 text-caption text-text-muted">
                  {ex.muscle_group}
                </span>
              )}
              <span className="text-text-faint">ⓘ</span>
            </button>
            <OverloadSparkline exerciseId={ex.id} />
          </section>
        ))}
      </div>

      {detail && <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
