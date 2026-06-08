import type { Exercise } from './database.types';
import { exerciseTier, intensityPreferredTier } from './exercise-intensity';
import { SAMPLE_EXERCISES } from './exercises';
import { DAY_KIND, hasPillar, weekTemplate, type DayKind, type Goal } from './pillars';
import { workoutParams, type Profile } from './profile';
import { packToTime } from './workout-timing';

export interface DayPlan {
  day: number; // 1 = Mon … 7 = Sun
  kind: DayKind;
  exercises: Exercise[];
}

// Generate one day's session for a given day-kind: pull from the kind's pillars,
// bias toward the profile's intensity tier, keep variety, and pack to the kind's
// target length. Rest days return [].
export function generateDay(profile: Profile, kind: DayKind): Exercise[] {
  const meta = DAY_KIND[kind];
  if (meta.pillars.length === 0) return [];

  const eq = new Set(profile.equipment);
  const pool = SAMPLE_EXERCISES.filter(
    (e) => e.equipment && eq.has(e.equipment) && meta.pillars.some((p) => hasPillar(e, p)),
  );
  if (pool.length === 0) return [];

  const prefer = intensityPreferredTier(profile.intensity);
  const shuffled = [...pool]
    .map((e) => ({ e, key: Math.abs(exerciseTier(e) - prefer) + Math.random() * 0.85 }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.e);

  // Variety: one per muscle group first, then fill.
  const ordered: Exercise[] = [];
  const used = new Set<string>();
  for (const e of shuffled) {
    const g = e.muscle_group ?? '';
    if (used.has(g)) continue;
    ordered.push(e);
    used.add(g);
  }
  for (const e of shuffled) if (!ordered.includes(e)) ordered.push(e);

  return packToTime(ordered, workoutParams(profile), meta.lengthMin * 60);
}

// Generate a full balanced week from the profile + plan options.
export function generateWeek(profile: Profile, opts: { daysPerWeek: number; goal: Goal }): DayPlan[] {
  return weekTemplate(opts.daysPerWeek, opts.goal).map((kind, i) => ({
    day: i + 1,
    kind,
    exercises: generateDay(profile, kind),
  }));
}
