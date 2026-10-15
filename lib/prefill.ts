import type { SetType } from './database.types';

// Which previously-logged set the logger pre-fills the next set's inputs from
// (DESIGN.md §"AMRAP toggle" → "Behaviour contract").
//
// The pre-fill is a TARGET TO BEAT, not simply "the last thing you did", so
// only a straight set qualifies. The other three set types all log numbers
// that mean something other than a working set:
//   amrap    — reps are a to-failure count, usually at a lighter weight
//   dropset  — weight is deliberately BELOW the working weight
//   half_rep — a 1.5-rep count is not comparable to a straight-set rep count
// Seeding the next session from any of those tells you to "beat" a number that
// was never a working set — logging a drop set at 95 lb off a 135 lb working
// set used to make 95 the next session's starting weight.

export interface PrefillCandidate {
  weight: number | null;
  reps: number | null;
  tempo: string | null;
  set_type: SetType;
}

// The one set type whose logged weight × reps is a working-set target.
export const TARGET_SET_TYPE: SetType = 'normal';

// `rows` must be NEWEST-FIRST. Returns the most recent straight set; if the
// exercise has only ever been logged as amrap/dropset/half_rep, falls back to
// the newest row of any type rather than showing nothing — some pre-fill beats
// an empty input, and the alternative would silently hide history from anyone
// who only ever logs AMRAP on an exercise. Returns null for no history at all.
export function pickPrefillSet<T extends PrefillCandidate>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  return rows.find((r) => r.set_type === TARGET_SET_TYPE) ?? rows[0];
}
