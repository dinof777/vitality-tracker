'use client';

import { useState } from 'react';
import type { ShareExercise, ShareParams } from '@/lib/share';

// Name a workout and keep it in the gym's saved-workout library. Used by both
// builder modes — generated and pick-your-own.
export default function SaveCircuitBox({
  exercises,
  params,
  defaultName = '',
}: {
  exercises: ShareExercise[];
  params: ShareParams;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/tenant/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), exercises, params }),
      });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? 'Could not save.');
      else setSaved({ id: j.workout.id, name: j.workout.name });
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-background p-3 print:hidden">
        <p className="text-center text-caption text-text-muted">
          Saved as <span className="text-text-primary">{saved.name}</span> ·{' '}
          <a href={`/dashboard/workouts/${saved.id}`} className="text-accent">
            Open it ›
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3 print:hidden">
      <p className="mb-2 text-caption text-text-muted">Save this workout to your library to reuse it</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this workout"
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-body text-text-primary placeholder:text-text-faint"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="h-10 shrink-0 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'SAVE'}
        </button>
      </div>
      {error && <p className="mt-1 text-caption text-text-faint">{error}</p>}
    </div>
  );
}
