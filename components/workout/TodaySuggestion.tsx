'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Exercise } from '@/lib/database.types';
import { generateWorkout } from '@/lib/workout-generator';
import { hashString, seededRng } from '@/lib/seed';
import { workoutParams, type Profile } from '@/lib/profile';
import { isTimed, exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { syncrofitRunUrl } from '@/lib/syncrofit';
import ExerciseRow from './ExerciseRow';
import SyncroFitButton from './SyncroFitButton';
import SaveCircuitBox from './SaveCircuitBox';

// The tenant/equipment-filtered pool, trimmed to only the fields the pure
// generator + this UI actually read (see DECISION.md's payload-audit note) —
// default_cue/created_at are reconstructed as constants below rather than
// shipped over the wire.
export type PoolExercise = Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'equipment' | 'image_url' | 'tags'>;

function toExercise(e: PoolExercise): Exercise {
  return { ...e, default_cue: null, created_at: '' };
}

function parseSwapsParam(sw: string | null): Map<number, number> {
  const swaps = new Map<number, number>();
  for (const part of (sw ?? '').split(',').filter(Boolean)) {
    const [i, k] = part.split(':').map(Number);
    if (Number.isInteger(i) && i >= 0) swaps.set(i, Math.max(1, Math.min(50, k || 1)));
  }
  return swaps;
}

// Straight port of the pre-refactor Server Component's generation logic
// (app/g/[slug]/page.tsx, before this change) — same seed format
// (`${slug}|${today}|${variant}`), same swap-apply loop — so a given
// (slug, today, variant, swaps) input reproduces byte-identical output
// whether it ran on the server (legacy) or here in the browser (now).
function computeWorkout(
  slug: string,
  today: string,
  variant: number,
  swaps: Map<number, number>,
  pool: Exercise[],
  profile: Profile,
): Exercise[] {
  const rng = seededRng(hashString(`${slug}|${today}|${variant}`));
  const generated = generateWorkout(profile, { focus: 'full', count: 5, pool, rng });
  return generated.map((ex, i) => {
    const bumps = swaps.get(i);
    if (!bumps) return ex;
    const used = new Set(generated.map((g) => g.id));
    const alts = pool.filter((c) => !used.has(c.id));
    if (alts.length === 0) return ex;
    const pick = seededRng(hashString(`${slug}|today-swap|${i}|${bumps}|${variant}`));
    return alts[Math.floor(pick() * alts.length)] ?? ex;
  });
}

// Today's suggestion, lifted out of the Server Component so the page it lives
// on never reads searchParams (see DECISION.md) — this is the only piece that
// varies by `?v=`/`?sw=`, and it now varies entirely client-side: the initial
// render (first paint / no-JS / SEO) is the server's cached default (variant
// 1, no swaps); refresh/swap recompute in-browser from the `pool` payload
// already delivered in the page, with zero network calls, and sync the
// address bar via `window.history.replaceState` — deliberately NOT
// `next/navigation`'s router, which would re-run the Server Component and
// defeat the whole point of caching the base page.
export default function TodaySuggestion({
  slug,
  name,
  today,
  pool: poolSlim,
  libraryById,
  initialWorkout: initialWorkoutSlim,
  profile,
}: {
  slug: string;
  name: string;
  today: string;
  pool: PoolExercise[];
  libraryById: Record<string, { name: string }>;
  initialWorkout: PoolExercise[];
  profile: Profile;
}) {
  const pool = useMemo(() => poolSlim.map(toExercise), [poolSlim]);
  const initialWorkout = useMemo(() => initialWorkoutSlim.map(toExercise), [initialWorkoutSlim]);

  const [variant, setVariant] = useState(1);
  const [swaps, setSwaps] = useState<Map<number, number>>(new Map());
  const [workout, setWorkout] = useState<Exercise[]>(initialWorkout);
  // Guards the one-time "adopt whatever ?v=/&sw= is already in the URL"
  // check so it runs exactly once, on first client render, without pulling
  // in next/navigation's useSearchParams (which would require a Suspense
  // boundary to keep this route statically generated) — plain
  // window.location.search reads the same information with zero risk of
  // opting the route out of static rendering.
  const [adopted, setAdopted] = useState(false);
  if (!adopted && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const vRaw = params.get('v');
    const swRaw = params.get('sw');
    const v = Math.max(1, Math.min(999, Number(vRaw) || 1));
    const sw = parseSwapsParam(swRaw);
    if (v !== 1 || sw.size !== 0) {
      const recomputed = computeWorkout(slug, today, v, sw, pool, profile);
      setVariant(v);
      setSwaps(sw);
      setWorkout(recomputed);
    }
    setAdopted(true);
  }

  const syncUrl = useCallback(
    (v: number, sw: Map<number, number>) => {
      const swParam = sw.size ? `&sw=${Array.from(sw).map(([i, k]) => `${i}:${k}`).join(',')}` : '';
      window.history.replaceState(null, '', `/g/${slug}?v=${v}${swParam}`);
    },
    [slug],
  );

  const refreshAllHref = `/g/${slug}?v=${variant + 1}`;
  const refreshAll = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const next = variant + 1;
      const nextSwaps = new Map<number, number>();
      setVariant(next);
      setSwaps(nextSwaps);
      setWorkout(computeWorkout(slug, today, next, nextSwaps, pool, profile));
      syncUrl(next, nextSwaps);
    },
    [variant, slug, today, pool, profile, syncUrl],
  );

  const rerollHref = (i: number) => {
    const next = new Map(swaps);
    next.set(i, (next.get(i) ?? 0) + 1);
    return `/g/${slug}?v=${variant}&sw=${Array.from(next).map(([idx, k]) => `${idx}:${k}`).join(',')}`;
  };
  const swap = useCallback(
    (i: number, e: React.MouseEvent) => {
      e.preventDefault();
      const next = new Map(swaps);
      next.set(i, (next.get(i) ?? 0) + 1);
      setSwaps(next);
      setWorkout(computeWorkout(slug, today, variant, next, pool, profile));
      syncUrl(variant, next);
    },
    [swaps, variant, slug, today, pool, profile, syncUrl],
  );

  if (workout.length === 0) return null;

  const wp = workoutParams(profile);
  const presc = (ex: Exercise) =>
    isTimed(ex)
      ? `${wp.sets} × ${wp.holdSec}s ${modeWorkLabel(exerciseMode(ex))}`
      : `${wp.sets} × ${wp.reps} @ ${wp.tempo}`;

  const todayName = `${name} — Today`;
  const displayName = (ex: Exercise) => libraryById[ex.id]?.name ?? ex.name;
  const displayToday = workout.map((ex) => ({ ...ex, name: displayName(ex) }));
  const sfUrl = syncrofitRunUrl(todayName, displayToday, wp, '', `${slug}-today`, {
    name,
    organization: 'Live Elevated',
  });
  const todaySnapshot = workout.map((ex) => ({
    name: displayName(ex),
    equipment: ex.equipment,
    image_url: ex.image_url,
    notes: presc(ex),
  }));

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-label text-accent">TODAY’S SUGGESTION</p>
        <a
          href={refreshAllHref}
          onClick={refreshAll}
          className="flex h-9 items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-3 text-caption font-semibold text-accent active:scale-[0.97]"
        >
          🔀 Refresh all
        </a>
      </div>
      <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
        {workout.map((ex, i) => (
          <ExerciseRow
            key={ex.id}
            index={i + 1}
            name={displayName(ex)}
            equipment={ex.equipment}
            imageUrl={ex.image_url}
            detail={presc(ex)}
            trailing={
              <a
                href={rerollHref(i)}
                onClick={(e) => swap(i, e)}
                aria-label={`Swap ${displayName(ex)}`}
                className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-caption text-text-muted active:scale-95 active:text-accent"
              >
                ↻ <span className="hidden sm:inline">Swap</span>
              </a>
            }
          />
        ))}
      </ul>
      <div className="mt-4">
        <SyncroFitButton url={sfUrl} />
      </div>
      <SaveCircuitBox exercises={todaySnapshot} params={wp} defaultName={todayName} />
      <Link
        href={`/g/${slug}/build`}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
      >
        BUILD A DIFFERENT ONE
      </Link>
    </>
  );
}
