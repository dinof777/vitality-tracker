import type { SetType } from './database.types';

// Set-type options surfaced in the UI, mapped to the schema's set_type values.
export const SET_TYPES: { value: SetType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'dropset', label: 'Drop' },
  { value: 'half_rep', label: '1.5 Rep' },
];

export const TEMPO_PRESETS = ['2-0-1', '3-0-1', '3-1-1', '4-0-1'] as const;

// What SetLogRow hands back to its parent when a set is logged.
export interface LoggedSet {
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  tempo: string;
  setType: SetType;
}
