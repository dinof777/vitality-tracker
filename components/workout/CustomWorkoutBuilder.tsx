'use client';

import { useMemo, useState } from 'react';
import type { Equipment, Exercise } from '@/lib/database.types';
import type { LibraryExercise } from '@/lib/tenant-library';
import type { WorkoutParams } from '@/lib/profile';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import { TAG_BY_ID, tagsInCategory, type TagCategory } from '@/lib/tags';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import ExerciseThumb from './ExerciseThumb';
import ShareWorkoutButton from './ShareWorkoutButton';

interface Props {
  library: LibraryExercise[];
  workoutName: string;
  params: WorkoutParams;
  circuitId: string;
}

const CATEGORIES: Array<{ id: TagCategory; label: string }> = [
  { id: 'goal', label: 'Goal' },
  { id: 'stage', label: 'Stage' },
  { id: 'pattern', label: 'Movement' },
];

// Pick-your-own workout: search the gym's whole library, filter by tag or gear,
// add moves in the order you want, then share it exactly like a generated one.
export default function CustomWorkoutBuilder({ library, workoutName, params, circuitId }: Props) {
  const [picked, setPicked] = useState<LibraryExercise[]>([]);
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [equip, setEquip] = useState<string[]>([]);

  // Only offer tags/equipment this gym's library actually has.
  const tagGroups = useMemo(() => {
    const seen = new Set(library.flatMap((e) => e.tags ?? []));
    return CATEGORIES.map((c) => ({ ...c, items: tagsInCategory(c.id).filter((t) => seen.has(t.id)) })).filter(
      (g) => g.items.length > 0,
    );
  }, [library]);

  const equipments = useMemo(
    () => Array.from(new Set(library.map((e) => e.equipment).filter(Boolean))) as Equipment[],
    [library],
  );

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return library.filter((e) => {
      if (query && !e.name.toLowerCase().includes(query) && !(e.muscle_group ?? '').toLowerCase().includes(query))
        return false;
      if (tags.length && !tags.every((t) => (e.tags ?? []).includes(t))) return false;
      if (equip.length && !(e.equipment && equip.includes(e.equipment))) return false;
      return true;
    });
  }, [library, q, tags, equip]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

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

  const activeFilters = tags.length + equip.length;

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
                  <button type="button" onClick={() => setPicked(picked.filter((p) => p.id !== e.id))} className="shrink-0 px-1 text-caption text-destructive" aria-label={`Remove ${e.name}`}>✕</button>
                </li>
              ))}
            </ul>

            <a href={sfUrl} className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press">
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises or muscle group…"
          className="mb-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
        />

        {/* Tag filters — every tag the library actually uses */}
        {tagGroups.map((group) => (
          <div key={group.id} className="mb-2">
            <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">{group.label.toUpperCase()}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((t) => {
                const on = tags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(tags, setTags, t.id)}
                    title={t.description}
                    className={`rounded-full border px-2.5 py-1 text-caption transition ${on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Equipment filter */}
        <div className="mb-3">
          <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">EQUIPMENT</p>
          <div className="flex flex-wrap gap-1.5">
            {equipments.map((eq) => {
              const on = equip.includes(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggle(equip, setEquip, eq)}
                  className={`rounded-full border px-2.5 py-1 text-caption transition ${on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'}`}
                >
                  {EQUIPMENT_LABEL[eq]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption text-text-faint nums">
            {results.length} of {library.length}
          </span>
          {activeFilters > 0 && (
            <button type="button" onClick={() => { setTags([]); setEquip([]); }} className="text-caption text-accent">
              Clear filters
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-body text-text-muted">
            Nothing matches those filters.
          </p>
        ) : (
          <ul className="space-y-2">
            {results.slice(0, 80).map((e) => {
              const added = pickedIds.has(e.id);
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5">
                  <ExerciseThumb equipment={e.equipment} imageUrl={e.image_url} name={e.name} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-text-primary">{e.name}</span>
                    <span className="block truncate text-caption text-text-muted">
                      {[e.muscle_group, e.custom_equip_name ?? (e.equipment ? EQUIPMENT_LABEL[e.equipment] : null)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {(e.tags ?? []).length > 0 && (
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {(e.tags ?? []).slice(0, 3).map((t) => (
                          <span key={t} className="rounded bg-accent/10 px-1.5 py-0.5 text-[0.6rem] text-accent">
                            {TAG_BY_ID[t]?.label ?? t}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => (added ? setPicked(picked.filter((p) => p.id !== e.id)) : setPicked([...picked, e]))}
                    className={`h-9 w-9 shrink-0 rounded-full text-label ${added ? 'bg-surface-raised text-text-muted' : 'bg-accent text-on-accent'}`}
                    aria-label={added ? `Remove ${e.name}` : `Add ${e.name}`}
                  >
                    {added ? '✓' : '✚'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {results.length > 80 && (
          <p className="mt-2 text-center text-caption text-text-faint">
            Showing 80 of {results.length} — narrow it with search or filters.
          </p>
        )}
      </section>
    </div>
  );
}
