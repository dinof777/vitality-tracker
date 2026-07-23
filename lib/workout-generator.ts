import type { Exercise } from './database.types';
import { SAMPLE_EXERCISES } from './exercises';
import { exerciseTier, intensityPreferredTier } from './exercise-intensity';
import { exerciseMode } from './exercise-mode';
import { hasPillar, type Pillar } from './pillars';
import { focusChoice, parseFocusValue, workoutParams, type FocusChoice, type Intensity, type Profile } from './profile';
import { packToTime } from './workout-timing';

const ALL_PILLARS: Pillar[] = ['strength', 'cardio', 'balance', 'flexibility'];

// Interleave a list so each pillar appears in rotation (strength, cardio,
// balance, flexibility, …) — used for the "Balanced" focus so packing draws
// from every pillar.
function balancedOrder(list: Exercise[]): Exercise[] {
  const ordered: Exercise[] = [];
  const used = new Set<string>();
  let added = true;
  while (added && ordered.length < list.length) {
    added = false;
    for (const p of ALL_PILLARS) {
      const e = list.find((x) => !used.has(x.id) && hasPillar(x, p));
      if (e) {
        ordered.push(e);
        used.add(e.id);
        added = true;
      }
    }
  }
  for (const e of list) if (!used.has(e.id)) ordered.push(e);
  return ordered;
}

interface GenerateOpts {
  focus?: string;
  intensity?: Intensity;
  targetSeconds?: number; // fit the workout to this much time
  count?: number; // or just take this many exercises
  pool?: Exercise[]; // draw from this library instead of the global one (e.g. a gym's)
  rng?: () => number; // seeded RNG for reproducible (shareable / QR-able) workouts
  /** Admin-managed regions (lib/profile#regionFocus), or any other focus not
   *  in the static FOCUS_CHOICES — checked before falling back to the static
   *  lookup, so a region focus value resolves to its actual muscle groups
   *  instead of silently defaulting to the first static focus. */
  focusChoices?: FocusChoice[];
  /**
   * Fired (synchronously, before generateWorkout returns) with the focus
   * VALUE actually used to fill the pool — the requested focus, or a coarser
   * rung of it if the relaxation ladder in varietyOrdered had to broaden past
   * an empty narrow tier. A caller that labels the workout by its requested
   * focus (e.g. StartSheet's `name`) should read this instead, or the label
   * can claim a narrower focus than what was actually generated. Doesn't
   * change generateWorkout's Exercise[] return or fire when there's nothing
   * to relax (colon-free legacy focus, or the ladder wasn't needed).
   */
  onResolvedFocus?: (focusValue: string) => void;
}

// Apply one focus's tag/area/mode/pillar/group filters to an already
// equipment-filtered pool. Pulled out of varietyOrdered so the relaxation
// ladder below can re-apply it against coarser rungs of the same composite
// focus without re-deriving the equipment filter each time.
function focusFilteredPool(equipmentPool: Exercise[], focus: FocusChoice): Exercise[] {
  let pool = equipmentPool;
  // Clinical focuses select by tag instead of muscle group: the goal tag
  // (physical-therapy) ORs in the rehab pool, then an optional area (knee /
  // shoulder / ankle) ANDs it down to one body region.
  if (focus.tags?.length) {
    const want = focus.tags;
    pool = pool.filter((e) => (e.tags ?? []).some((t) => want.includes(t)));
  }
  if (focus.areaTags?.length) {
    const area = focus.areaTags;
    pool = pool.filter((e) => (e.tags ?? []).some((t) => area.includes(t)));
  }
  if (focus.mobility) {
    // Mobility = stretches + holds (any bodyweight hold), by tracking mode.
    pool = pool.filter((e) => exerciseMode(e) === 'hold');
  } else {
    // Pillar AND muscle group (a composite focus, e.g. strength:legs:quads,
    // sets both) — sequential-AND, not else-if. Safe for every legacy focus:
    // none of them set both `pillars` and `groups`, so this is a no-op there.
    if (focus.pillars && !focus.balanced) pool = pool.filter((e) => focus.pillars!.some((p) => hasPillar(e, p)));
    if (focus.groups) pool = pool.filter((e) => focus.groups!.includes(e.muscle_group ?? ''));
  }
  return pool;
}

// A composite focus value (pillar[:group[:deep]]) walked from most to least
// specific — the rungs the relaxation ladder falls back through when the
// narrowest one comes up empty. A non-composite (legacy) value has nowhere to
// relax to, so its ladder is just itself.
function relaxationLadder(focusValue: string): string[] {
  const parts = parseFocusValue(focusValue);
  if (!parts) return [focusValue];
  const ladder = [focusValue];
  if (parts.deepSlug) ladder.push(`${parts.pillarToken}:${parts.groupSlug}`);
  if (parts.groupSlug) ladder.push(parts.pillarToken);
  return ladder;
}

// Order the focus/equipment pool for variety AND intensity-type: bias toward the
// intensity's preferred difficulty tier (soft — a weighted shuffle, never a hard
// filter, so the pool can't empty), then take one exercise per muscle group
// first and the remainder after — so packing favors a balanced, tier-appropriate
// workout.
function varietyOrdered(
  profile: Profile,
  focusValue: string,
  preferTier: number,
  source: Exercise[] = SAMPLE_EXERCISES,
  rng: () => number = Math.random,
  extraFocuses: FocusChoice[] = [],
  onResolvedFocus?: (focusValue: string) => void,
): Exercise[] {
  const resolve = (v: string) => extraFocuses.find((f) => f.value === v) ?? focusChoice(v);
  let focus = resolve(focusValue);
  const eq = new Set(profile.equipment);
  const equipmentPool = source.filter((e) => e.equipment && eq.has(e.equipment));
  let pool = focusFilteredPool(equipmentPool, focus);

  // A too-narrow composite (e.g. a pillar+group+deep combo the equipment/tag
  // filters leave empty) must never yield an empty workout — walk the
  // ladder's coarser rungs and take the first one that isn't empty.
  if (pool.length === 0) {
    for (const rung of relaxationLadder(focusValue).slice(1)) {
      const rungFocus = resolve(rung);
      const rungPool = focusFilteredPool(equipmentPool, rungFocus);
      if (rungPool.length > 0) {
        focus = rungFocus;
        pool = rungPool;
        break;
      }
    }
  }
  // Even the bare pillar can be empty (equipment excludes it entirely) — a
  // pre-existing edge case. Fall through to the full equipment-filtered pool,
  // matching today's worst case rather than regressing to [].
  if (pool.length === 0) pool = equipmentPool;

  // Report the rung actually used — the original focusValue unless the ladder
  // above had to relax to a coarser one. A caller that labels the workout by
  // the requested focus (StartSheet) needs this or the label can claim a
  // narrower focus than what was actually generated.
  onResolvedFocus?.(focus.value);

  // Lower key = earlier. Distance from the preferred tier dominates; a random
  // term keeps each generation varied within a tier.
  const shuffled = [...pool]
    .map((e) => ({ e, key: Math.abs(exerciseTier(e) - preferTier) + rng() * 0.85 }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.e);
  // Balanced focus: rotate through pillars instead of muscle-group variety.
  if (focus.balanced) return balancedOrder(shuffled);
  const ordered: Exercise[] = [];
  const usedGroups = new Set<string>();
  for (const e of shuffled) {
    const g = e.muscle_group ?? '';
    if (usedGroups.has(g)) continue;
    ordered.push(e);
    usedGroups.add(g);
  }
  for (const e of shuffled) if (!ordered.includes(e)) ordered.push(e);
  return ordered;
}

// Build a workout from the profile. Prefers fitting `targetSeconds` using the
// resolved sets/reps/rest/hold timing; falls back to a fixed `count`.
export function generateWorkout(profile: Profile, opts: GenerateOpts = {}): Exercise[] {
  const intensity = opts.intensity ?? profile.intensity;
  const ordered = varietyOrdered(
    profile,
    opts.focus ?? profile.focus,
    intensityPreferredTier(intensity),
    opts.pool,
    opts.rng,
    opts.focusChoices,
    opts.onResolvedFocus,
  );
  if (ordered.length === 0) return [];

  const overridden = { ...profile, intensity };
  const params = workoutParams(overridden);

  if (opts.targetSeconds && opts.targetSeconds > 0) {
    return packToTime(ordered, params, opts.targetSeconds);
  }
  const count = opts.count ?? 5;
  return ordered.slice(0, count);
}
