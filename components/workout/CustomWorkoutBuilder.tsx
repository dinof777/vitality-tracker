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
import SaveCircuitBox from './SaveCircuitBox';
import SyncroFitButton from './SyncroFitButton';
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
            {picked.length} exercise{picked.length === 1 ? '' : 's'}
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

            <SaveCircuitBox exercises={shareExercises} params={params} defaultName={workoutName} />

            <div className="mt-3"><SyncroFitButton url={sfUrl} /></div>
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
