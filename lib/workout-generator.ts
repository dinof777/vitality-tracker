import type { Exercise } from './database.types';
import { SAMPLE_EXERCISES } from './exercises';
import { focusChoice, workoutParams, type Intensity, type Profile } from './profile';
import { packToTime } from './workout-timing';

interface GenerateOpts {
  focus?: string;
  intensity?: Intensity;
  targetSeconds?: number; // fit the workout to this much time
  count?: number; // or just take this many exercises
}

// Order the focus/equipment pool for variety: one exercise per muscle group
// first, then the remainder — so packing/slicing favors a balanced workout.
function varietyOrdered(profile: Profile, focusValue: string): Exercise[] {
  const focus = focusChoice(focusValue);
  const eq = new Set(profile.equipment);
  let pool = SAMPLE_EXERCISES.filter((e) => e.equipment && eq.has(e.equipment));
  if (focus.mobility) {
    pool = pool.filter((e) => e.equipment === 'stretch' || e.equipment === 'isometric');
  } else if (focus.groups) {
    pool = pool.filter((e) => focus.groups!.includes(e.muscle_group ?? ''));
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
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
  const ordered = varietyOrdered(profile, opts.focus ?? profile.focus);
  if (ordered.length === 0) return [];

  const overridden = { ...profile, intensity: opts.intensity ?? profile.intensity };
  const params = workoutParams(overridden);

  if (opts.targetSeconds && opts.targetSeconds > 0) {
    return packToTime(ordered, params, opts.targetSeconds);
  }
  const count = opts.count ?? 5;
  return ordered.slice(0, count);
}
