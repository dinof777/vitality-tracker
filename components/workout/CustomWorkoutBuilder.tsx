'use client';

import { useMemo, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import type { LibraryExercise } from '@/lib/tenant-library';
import type { WorkoutParams } from '@/lib/profile';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import ExerciseThumb from './ExerciseThumb';
import ShareWorkoutButton from './ShareWorkoutButton';
import ExerciseFilterPicker, { type PickerItem } from './ExerciseFilterPicker';
import { familyOf } from '@/lib/movement-families';

interface Props {
  library: LibraryExercise[];
  workoutName: string;
  params: WorkoutParams;
  circuitId: string;
}

// Pick-your-own workout: search the gym's whole library, filter by tag or gear,
// add moves in the order you want, then share it exactly like a generated one.
export default function CustomWorkoutBuilder({ library, workoutName, params, circuitId }: Props) {
  const [picked, setPicked] = useState<LibraryExercise[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; name: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

  const items: PickerItem[] = useMemo(
    () =>
      library.map((e) => ({
        id: e.id,
        name: e.name,
        muscle_group: e.muscle_group,
        equipment: e.equipment,
        image_url: e.image_url,
        tags: e.tags,
        subtitle: e.custom_equip_name,
        ...familyOf(e.real_name),
      })),
    [library],
  );

  const togglePick = (id: string) => {
    if (pickedIds.has(id)) {
      setPicked(picked.filter((p) => p.id !== id));
      return;
    }
    const found = library.find((e) => e.id === id);
    if (found) setPicked([...picked, found]);
  };

  // Classify on the REAL name so timing is right; show the gym's alias.
  const toExercise = (e: LibraryExercise): Exercise => ({
    id: e.id,
    name: e.real_name,
    muscle_group: e.muscle_group,
    default_cue: e.default_cue,
    equipment: e.equipment,
    image_url: e.image_url,
    created_at: '',
  });

  const prescription = (e: LibraryExercise) => {
    const ex = toExercise(e);
    return isTimed(ex)
      ? `${params.sets} × ${params.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
      : `${params.sets} × ${params.reps} @ ${params.tempo}`;
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...picked];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setPicked(next);
  };

  const displayExercises = picked.map((e) => ({ ...toExercise(e), name: e.name }));
  const sfUrl = picked.length ? syncrofitRunUrl(workoutName, displayExercises, params, '', circuitId) : '#';
  const shareExercises = picked.map((e) => ({
    name: e.name,
    equipment: e.equipment,
    image_url: e.image_url,
    notes: prescription(e),
  }));

  return (
    <div>
      {/* ── Your workout so far ─────────────────────────────────────────── */}
      <section className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-label text-accent">YOUR WORKOUT</p>
          <span className="text-caption text-text-faint nums">
            {picked.length} move{picked.length === 1 ? '' : 's'}
          </span>
        </div>

        {picked.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-body text-text-muted">
            Nothing added yet — search below and tap ✚ to build your workout.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {picked.map((e, i) => (
                <li key={e.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <span className="w-4 shrink-0 text-center text-caption font-semibold text-text-faint nums">{i + 1}</span>
                  <ExerciseThumb equipment={e.equipment} imageUrl={e.image_url} name={e.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-text-primary">{e.name}</span>
                    <span className="block text-caption text-text-muted nums">{prescription(e)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-text-faint active:text-accent disabled:opacity-30" aria-label="Move up">▲</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} className="px-1 text-text-faint active:text-accent disabled:opacity-30" aria-label="Move down">▼</button>
                  </span>
                  <button type="button" onClick={() => togglePick(e.id)} className="shrink-0 px-1 text-caption text-destructive" aria-label={`Remove ${e.name}`}>✕</button>
                </li>
              ))}
            </ul>

            {/* Save it to the gym's library so it's reusable, not one-off */}
            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              {saved ? (
                <p className="text-center text-caption text-text-muted">
                  Saved as <span className="text-text-primary">{saved.name}</span> ·{' '}
                  <a href={`/dashboard/workouts/${saved.id}`} className="text-accent">
                    Open it ›
                  </a>
                </p>
              ) : (
                <>
                  <p className="mb-2 text-caption text-text-muted">Save this circuit to your library to reuse it</p>
                  <div className="flex gap-2">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Name this circuit"
                      className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-body text-text-primary placeholder:text-text-faint"
                    />
                    <button
                      type="button"
                      disabled={saving || !saveName.trim()}
                      onClick={async () => {
                        setSaving(true);
                        setSaveError(null);
                        try {
                          const r = await fetch('/api/tenant/workouts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: saveName.trim(), exercises: shareExercises, params }),
                          });
                          const j = await r.json();
                          if (!r.ok) setSaveError(j.error ?? 'Could not save.');
                          else setSaved({ id: j.workout.id, name: j.workout.name });
                        } catch {
                          setSaveError('Network error.');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="h-10 shrink-0 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'SAVE'}
                    </button>
                  </div>
                  {saveError && <p className="mt-1 text-caption text-text-faint">{saveError}</p>}
                </>
              )}
            </div>

            <a href={sfUrl} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press">
              ⏱ SEND TO SYNCROFIT
            </a>
            <ShareWorkoutButton name={workoutName} exercises={shareExercises} params={params} />
            <button type="button" onClick={() => setPicked([])} className="mt-2 w-full text-center text-caption text-text-faint">
              Clear all
            </button>
          </>
        )}
      </section>

      {/* ── Find moves ──────────────────────────────────────────────────── */}
      <section>
        <p className="mb-2 text-label text-accent">ADD FROM YOUR LIBRARY</p>
        <ExerciseFilterPicker items={items} pickedIds={pickedIds} onToggle={togglePick} />
      </section>
    </div>
  );
}
