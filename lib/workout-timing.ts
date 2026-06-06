import type { Exercise } from './database.types';
import type { WorkoutParams } from './profile';

const TIMED = new Set(['isometric', 'stretch', 'jump_rope']);

export function isTimed(ex: Exercise): boolean {
  return ex.equipment != null && TIMED.has(ex.equipment);
}

// Estimated seconds to complete one exercise: setup + work across all sets +
// rest between sets. Timed moves (holds / conditioning) use holdSec per set;
// strength uses reps × seconds-per-rep.
export function estimateSeconds(ex: Exercise, p: WorkoutParams): number {
  const workPerSet = isTimed(ex) ? p.holdSec : p.reps * p.repSec;
  return p.setupSec + p.sets * workPerSet + Math.max(0, p.sets - 1) * p.restSec;
}

export function totalSeconds(exercises: Exercise[], p: WorkoutParams): number {
  return exercises.reduce((sum, ex) => sum + estimateSeconds(ex, p), 0);
}

// Rough planned count for a target time, using an average strength exercise —
// for showing "≈ N exercises" before the actual pack runs.
export function plannedCount(p: WorkoutParams, targetSeconds: number): number {
  const avg = p.setupSec + p.sets * (p.reps * p.repSec) + Math.max(0, p.sets - 1) * p.restSec;
  return Math.min(12, Math.max(2, Math.round(targetSeconds / avg)));
}

// Pack a variety-ordered pool into the time budget. Always keeps at least 2,
// allows the last one to slightly overshoot (≤8%), caps at 12.
export function packToTime(
  pool: Exercise[],
  p: WorkoutParams,
  targetSeconds: number,
): Exercise[] {
  const picked: Exercise[] = [];
  let total = 0;
  for (const ex of pool) {
    if (picked.length >= 12) break;
    const d = estimateSeconds(ex, p);
    if (picked.length >= 2 && total + d > targetSeconds * 1.08) break;
    picked.push(ex);
    total += d;
  }
  return picked;
}

export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m} min`;
}
