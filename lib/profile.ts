import type { Equipment } from './database.types';

// User training profile — saved once in the setup wizard, then used to generate
// workouts on the fly. Stored in localStorage (per-device; sync to DB later).
export type Intensity = 'light' | 'moderate' | 'intense';

export interface Profile {
  equipment: Equipment[];
  focus: string; // one of FOCUS_CHOICES value
  intensity: Intensity;
}

export const EQUIPMENT_CHOICES: { value: Equipment; label: string; hint: string }[] = [
  { value: 'dumbbell', label: 'Dumbbells', hint: 'Adjustable or fixed' },
  { value: 'band', label: 'Resistance Bands', hint: 'Loop or handled' },
  { value: 'isometric', label: 'Bodyweight Holds', hint: 'Planks, wall sits, holds' },
  { value: 'stretch', label: 'Stretching', hint: 'Mobility & recovery' },
];

export interface FocusChoice {
  value: string;
  label: string;
  groups: string[] | null; // null = all muscle groups
  mobility?: boolean; // match stretch/isometric instead of muscle group
}

export const FOCUS_CHOICES: FocusChoice[] = [
  { value: 'full', label: 'Full Body', groups: null },
  { value: 'upper', label: 'Upper Body', groups: ['Chest', 'Back', 'Shoulders', 'Arms', 'Rear Delts', 'Traps'] },
  { value: 'lower', label: 'Lower Body', groups: ['Legs', 'Hamstrings', 'Glutes', 'Calves'] },
  { value: 'core', label: 'Core & Abs', groups: ['Core'] },
  { value: 'mobility', label: 'Mobility & Recovery', groups: null, mobility: true },
];

export interface IntensityChoice {
  value: Intensity;
  label: string;
  desc: string;
  count: number; // exercises per workout
  sets: number;
  reps: string;
  tempo: string;
}

export const INTENSITY_CHOICES: IntensityChoice[] = [
  { value: 'light', label: 'Light', desc: 'Easy pace · fewer sets', count: 4, sets: 2, reps: '10-12', tempo: '2-0-1' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced training', count: 5, sets: 3, reps: '8-12', tempo: '3-1-1' },
  { value: 'intense', label: 'Intense', desc: 'High volume · push hard', count: 6, sets: 4, reps: '6-10', tempo: '3-1-1' },
];

export function intensityParams(i: Intensity): IntensityChoice {
  return INTENSITY_CHOICES.find((x) => x.value === i) ?? INTENSITY_CHOICES[1];
}

export function focusChoice(value: string): FocusChoice {
  return FOCUS_CHOICES.find((f) => f.value === value) ?? FOCUS_CHOICES[0];
}

const KEY = 'vitality_profile';

export function loadProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}
