import OverloadSparkline from '@/components/workout/OverloadSparkline';
import { SAMPLE_EXERCISES } from '@/lib/exercises';

// Progress overview — progressive-overload sparkline per exercise.
export default function ProgressPage() {
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
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-h3 text-text-primary">{ex.name}</h3>
              {ex.muscle_group && (
                <span className="rounded-sm bg-surface-raised px-2 py-0.5 text-caption text-text-muted">
                  {ex.muscle_group}
                </span>
              )}
            </div>
            <OverloadSparkline exerciseId={ex.id} />
          </section>
        ))}
      </div>
    </main>
  );
}
