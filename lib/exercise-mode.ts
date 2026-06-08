import type { Equipment } from './database.types';

// How an exercise is measured — drives the recommended prescription, the
// logging hint, the time estimate, and the SyncroFit circuit shape.
//   reps   — weight × reps (most strength moves)
//   hold   — seconds held (planks, wall sits, hangs, stretches, poses)
//   cardio — seconds of work (jump rope / conditioning)
//   carry  — seconds carried (loaded carries)
export type ExerciseMode = 'reps' | 'hold' | 'cardio' | 'carry';

type ExerciseLike = { name: string; equipment: Equipment | null };

// `\bhang\b` matches "Dead Hang" / "Active Hang" but NOT "Hanging Knee Raise"
// (where "hang" is not a standalone word) — those stay rep-based.
const HOLD_NAME = /\bhold\b|\bhang\b|plank|wall sit|\bpose\b/;

export function exerciseMode(ex: ExerciseLike): ExerciseMode {
  const n = ex.name.toLowerCase();
  if (n.includes('carry')) return 'carry';
  if (ex.equipment === 'jump_rope') return 'cardio';
  if (ex.equipment === 'isometric' || ex.equipment === 'stretch') return 'hold';
  if (HOLD_NAME.test(n)) return 'hold';
  return 'reps';
}

// True for anything measured by time rather than reps.
export function isTimed(ex: ExerciseLike): boolean {
  return exerciseMode(ex) !== 'reps';
}

// Verb shown in the time-based prescription ("40s hold" / "40s work" / "40s carry").
export function modeWorkLabel(mode: ExerciseMode): string {
  return mode === 'cardio' ? 'work' : mode === 'carry' ? 'carry' : 'hold';
}

// Unilateral moves where you train one side then switch — logged per side (L/R).
const PER_SIDE =
  /single-leg|single arm|single-arm|one-arm|side plank|windmill|hip flexor|pigeon|90\/90|clamshell|fire hydrant|donkey|standing hip abduction|seated hip abduction|curtsy|split squat|cossack|suitcase/;

export function isPerSide(ex: ExerciseLike): boolean {
  return PER_SIDE.test(ex.name.toLowerCase());
}
