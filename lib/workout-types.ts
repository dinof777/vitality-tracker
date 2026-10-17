import type { SetType } from './database.types';

// Set-type options surfaced in the UI, mapped to the schema's set_type values.
export const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'dropset', label: 'Drop' },
  { value: 'half_rep', label: '1.5 Rep' },
];

export const TEMPO_PRESETS = ['2-0-1', '3-0-1', '3-1-1', '4-0-1'] as const;

// A tempo is exactly three single digits, hyphen-separated —
// eccentric–pause–concentric, each a whole second (docs/TEMPO_ACCEPTANCE.md §1;
// Dino settled three-digit notation on MC card cb0f0c75, 2026-10-08).
export const TEMPO_PATTERN = /^\d-\d-\d$/;

export const TEMPO_PLACEHOLDER = '3-1-1';

export function isValidTempo(tempo: string): boolean {
  return TEMPO_PATTERN.test(tempo);
}

// Timed modes (hold / cardio / carry) have no lowering-lifting tempo and log an
// empty string, so '' and null are legal at the storage boundary even though the
// Custom box in strength mode will not accept them.
export function isStorableTempo(tempo: string | null | undefined): boolean {
  return tempo == null || tempo === '' || isValidTempo(tempo);
}

// Hover/tap explanations for the numbers and toggles in the logger.
export const TEMPO_INFO =
  'Tempo = seconds per phase (eccentric–pause–concentric). e.g. 3-1-1 = 3s lowering · 1s pause · 1s lifting.';

export const SET_TYPE_INFO: Record<SetType, string> = {
  normal: 'Standard straight set.',
  amrap: 'AMRAP = As Many Reps As Possible — take the set to technical failure.',
  dropset: 'Drop set — at failure, lower the weight and keep going with no rest.',
  half_rep: '1.5 reps — one full rep + one half rep counts as a single rep. Extra time under tension.',
};

export const LAST_INFO = 'Your most recent logged set for this exercise — pre-filled below so you can beat it.';

// What SetLogRow hands back to its parent when a set is logged.
// For timed moves (hold/cardio/carry) the seconds are stored in `reps`.
export interface LoggedSet {
  id?: string; // set once the server round-trip resolves (see WorkoutSession.handleLogSet) — undefined for on-device-only / not-yet-persisted sets
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null; // reps, OR seconds held for timed moves
  tempo: string;
  setType: SetType;
  side?: 'L' | 'R' | null; // unilateral moves logged per side
}

// LOG SET is disabled until there's a real value to log (DESIGN.md §6,
// "Log-set validation"). `reps` is the shared field for both strength mode
// (reps) and timed mode (seconds) — weight is intentionally NOT required,
// since a valid bodyweight set logs with weight: null.
export function canLogSet(reps: string): boolean {
  return reps !== '' && Number(reps) >= 1;
}
