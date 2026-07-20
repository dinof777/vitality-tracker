'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SAMPLE_EXERCISES } from '@/lib/exercises';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import ExerciseFilterPicker, { type PickerItem } from '@/components/workout/ExerciseFilterPicker';
import { familyOf } from '@/lib/movement-families';
import { loadProfile } from '@/lib/profile';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import type { Equipment } from '@/lib/database.types';

// Build your own session: search the whole library, filter by goal/stage/movement
// or gear, order the moves, then run it. Same session engine as a generated
// workout — /workout/active takes the exercise ids.
export default function BuildYourOwn() {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  // Default to the gear in your profile — with a way out, since you might be
  // somewhere with different equipment today.
  const [myGear, setMyGear] = useState<Equipment[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setMyGear(p?.equipment?.length ? p.equipment : null);
  }, []);

  const byId = useMemo(() => new Map(SAMPLE_EXERCISES.map((e) => [e.id, e])), []);
  const pickedIds = useMemo(() => new Set(picked), [picked]);

  const source = useMemo(
    () =>
      myGear && !showAll
        ? SAMPLE_EXERCISES.filter((e) => e.equipment && myGear.includes(e.equipment))
        : SAMPLE_EXERCISES,
    [myGear, showAll],
  );

  const items: PickerItem[] = useMemo(
    () =>
      source.map((e) => ({
        id: e.id,
        name: e.name,
        muscle_group: e.muscle_group,
        equipment: e.equipment,
        image_url: e.image_url,
        tags: e.tags,
        ...familyOf(e.name),
      })),
    [source],
  );

  const toggle = (id: string) => setPicked(pickedIds.has(id) ? picked.filter((p) => p !== id) : [...picked, id]);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...picked];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setPicked(next);
  };

  const start = () => {
    if (picked.length === 0) return;
    router.push(`/workout/active?ex=${picked.join(',')}`);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-32 pt-8">
      <Link href="/" className="text-caption text-text-muted">
        ← Home
      </Link>
      <header className="mb-5 mt-2">
        <p className="text-label text-accent">BUILD YOUR OWN</p>
        <h1 className="text-h1 text-text-primary">Pick your moves</h1>
        <p className="text-body text-text-muted">
          Search the full library, filter by what you&rsquo;re working on, and run it.
        </p>
      </header>

      {/* Your session so far */}
      <section className="mb-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-label text-accent">YOUR SESSION</p>
          <span className="text-caption text-text-faint nums">
            {picked.length} move{picked.length === 1 ? '' : 's'}
          </span>
        </div>

        {picked.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-body text-text-muted">
            Nothing added yet — search below and tap ✚.
          </p>
        ) : (
          <ul className="space-y-2">
            {picked.map((id, i) => {
              const e = byId.get(id);
              if (!e) return null;
              return (
                <li key={id} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2.5">
                  <span className="w-4 shrink-0 text-center text-caption font-semibold text-text-faint nums">{i + 1}</span>
                  <ExerciseThumb equipment={e.equipment} imageUrl={e.image_url} name={e.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-text-primary">{e.name}</span>
                    <span className="block truncate text-caption text-text-muted">{e.muscle_group}</span>
                  </span>
                  <span className="flex shrink-0 flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-text-faint active:text-accent disabled:opacity-30" aria-label="Move up">▲</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} className="px-1 text-text-faint active:text-accent disabled:opacity-30" aria-label="Move down">▼</button>
                  </span>
                  <button type="button" onClick={() => toggle(id)} className="shrink-0 px-1 text-caption text-destructive" aria-label={`Remove ${e.name}`}>✕</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Find moves */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-label text-accent">ADD EXERCISES</p>
          {myGear && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="text-caption text-accent">
              {showAll ? 'Just my equipment' : 'Show everything'}
            </button>
          )}
        </div>
        {myGear && (
          <p className="mb-2 text-caption text-text-faint">
            {showAll
              ? `Showing the full library — your kit is ${myGear.map((e) => EQUIPMENT_LABEL[e]).join(', ')}.`
              : `Your equipment: ${myGear.map((e) => EQUIPMENT_LABEL[e]).join(', ')}.`}
          </p>
        )}
        <ExerciseFilterPicker items={items} pickedIds={pickedIds} onToggle={toggle} />
      </section>

      {/* Sticky start bar */}
      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button type="button" onClick={() => setPicked([])} className="shrink-0 text-caption text-text-faint">
              Clear
            </button>
            <button
              type="button"
              onClick={start}
              className="flex h-13 flex-1 items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.98]"
            >
              START — {picked.length} MOVE{picked.length === 1 ? '' : 'S'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
