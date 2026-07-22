import type { Exercise } from './database.types';
import { SAMPLE_EXERCISES } from './exercises';
import { exerciseTier, intensityPreferredTier } from './exercise-intensity';
import { exerciseMode } from './exercise-mode';
import { hasPillar, type Pillar } from './pillars';
import { focusChoice, workoutParams, type Intensity, type Profile } from './profile';
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
): Exercise[] {
  const focus = focusChoice(focusValue);
  const eq = new Set(profile.equipment);
  let pool = source.filter((e) => e.equipment && eq.has(e.equipment));
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
  } else if (focus.pillars && !focus.balanced) {
    pool = pool.filter((e) => focus.pillars!.some((p) => hasPillar(e, p)));
  } else if (focus.groups) {
    pool = pool.filter((e) => focus.groups!.includes(e.muscle_group ?? ''));
  }
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
  const ordered = varietyOrdered(profile, opts.focus ?? profile.focus, intensityPreferredTier(intensity), opts.pool, opts.rng);
  if (ordered.length === 0) return [];

  const overridden = { ...profile, intensity };
  const params = workoutParams(overridden);

  if (opts.targetSeconds && opts.targetSeconds > 0) {
    return packToTime(ordered, params, opts.targetSeconds);
  }
  const count = opts.count ?? 5;
  return ordered.slice(0, count);
}
