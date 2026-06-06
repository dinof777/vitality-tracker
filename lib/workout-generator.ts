import type { Exercise } from './database.types';
import { SAMPLE_EXERCISES } from './exercises';
import { focusChoice, intensityParams, type Intensity, type Profile } from './profile';

interface GenerateOpts {
  focus?: string;
  intensity?: Intensity;
  count?: number; // override the exercise count (e.g. from workout length)
}

// Build a workout from the profile: filter the library to the user's equipment
// + chosen focus, then pick exercises favoring muscle-group variety.
export function generateWorkout(profile: Profile, opts: GenerateOpts = {}): Exercise[] {
  const focus = focusChoice(opts.focus ?? profile.focus);
  const intensity = intensityParams(opts.intensity ?? profile.intensity);
  const count = opts.count ?? intensity.count;
  const eq = new Set(profile.equipment);

  let pool = SAMPLE_EXERCISES.filter((e) => e.equipment && eq.has(e.equipment));
  if (focus.mobility) {
    pool = pool.filter((e) => e.equipment === 'stretch' || e.equipment === 'isometric');
  } else if (focus.groups) {
    pool = pool.filter((e) => focus.groups!.includes(e.muscle_group ?? ''));
  }

  if (pool.length === 0) return [];

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked: Exercise[] = [];
  const usedGroups = new Set<string>();

  // First pass: one per muscle group for variety.
  for (const e of shuffled) {
    if (picked.length >= count) break;
    const g = e.muscle_group ?? '';
    if (usedGroups.has(g)) continue;
    picked.push(e);
    usedGroups.add(g);
  }
  // Second pass: fill the remaining slots with anything left.
  for (const e of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(e)) picked.push(e);
  }

  return picked.slice(0, count);
}
