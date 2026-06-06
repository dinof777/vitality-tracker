import type { Equipment } from './database.types';

// User training profile — saved once in the setup wizard, then used to generate
// workouts on the fly. Stored in localStorage (per-device; sync to DB later).
export type Intensity = 'light' | 'moderate' | 'intense';

export interface Profile {
  equipment: Equipment[];
  focus: string; // one of FOCUS_CHOICES value
  intensity: Intensity;
  length?: number; // target workout length in minutes
  // Optional manual overrides of the intensity preset (the "set up sets & reps").
  sets?: number;
  reps?: number;
  restSec?: number; // rest between sets, seconds
}

// Resolved per-set prescription + timing inputs used to fit a workout to time.
export interface WorkoutParams {
  sets: number;
  reps: number; // reps per set (strength)
  restSec: number; // rest between sets
  repSec: number; // seconds per rep (from tempo)
  holdSec: number; // seconds per set for timed moves (isometric/stretch/jump rope)
  setupSec: number; // transition time before each exercise
  tempo: string;
}

export function workoutParams(profile: Profile): WorkoutParams {
  const ip = intensityParams(profile.intensity);
  return {
    sets: profile.sets ?? ip.sets,
    reps: profile.reps ?? ip.repsNum,
    restSec: profile.restSec ?? ip.restSec,
    repSec: ip.repSec,
    holdSec: ip.holdSec,
    setupSec: 25,
    tempo: ip.tempo,
  };
}

// Map a target length (minutes) to a number of exercises (~6 min each).
export function lengthToCount(minutes: number): number {
  return Math.min(10, Math.max(3, Math.round(minutes / 6)));
}

export const LENGTH_MIN = 10;
export const LENGTH_MAX = 60;
export const LENGTH_STEP = 5;
export const DEFAULT_LENGTH = 30;

export const EQUIPMENT_CHOICES: { value: Equipment; label: string; hint: string; emoji: string }[] = [
  { value: 'dumbbell', label: 'Dumbbells', hint: 'Adjustable or fixed', emoji: '🏋️' },
  { value: 'kettlebell', label: 'Kettlebell', hint: 'Swings, cleans, get-ups', emoji: '🔔' },
  { value: 'tube_band', label: 'Tube Bands', hint: 'Long bands with handles', emoji: '🎗️' },
  { value: 'loop_band', label: 'Loop Bands', hint: 'Mini / booty bands', emoji: '⭕' },
  { value: 'pullup_bar', label: 'Pull-up Bar', hint: 'Doorway or mounted', emoji: '🤸' },
  { value: 'medicine_ball', label: 'Medicine Ball', hint: 'Slams, throws, twists', emoji: '🏐' },
  { value: 'jump_rope', label: 'Jump Rope', hint: 'Conditioning & cardio', emoji: '🪢' },
  { value: 'isometric', label: 'Bodyweight Holds', hint: 'Planks, wall sits, holds', emoji: '⏱️' },
  { value: 'stretch', label: 'Stretching', hint: 'Mobility & recovery', emoji: '🧘' },
];

export interface FocusChoice {
  value: string;
  label: string;
  emoji: string;
  desc: string;
  groups: string[] | null; // null = all muscle groups
  mobility?: boolean; // match stretch/isometric instead of muscle group
}

export const FOCUS_CHOICES: FocusChoice[] = [
  { value: 'full', label: 'Full Body', emoji: '🔥', desc: 'Hit everything in one session', groups: null },
  { value: 'upper', label: 'Upper Body', emoji: '💪', desc: 'Chest, back, shoulders & arms', groups: ['Chest', 'Back', 'Shoulders', 'Arms', 'Rear Delts', 'Traps'] },
  { value: 'lower', label: 'Lower Body', emoji: '🦵', desc: 'Legs, glutes & hamstrings', groups: ['Legs', 'Hamstrings', 'Glutes', 'Calves'] },
  { value: 'core', label: 'Core & Abs', emoji: '🎯', desc: 'Midsection & stability', groups: ['Core'] },
  { value: 'mobility', label: 'Mobility & Recovery', emoji: '🧘', desc: 'Stretch, holds & flexibility', groups: null, mobility: true },
];

export interface IntensityChoice {
  value: Intensity;
  label: string;
  desc: string;
  count: number; // fallback exercise count when no time budget
  sets: number;
  reps: string; // display range
  repsNum: number; // reps used for timing math
  repSec: number; // seconds per rep (≈ tempo)
  restSec: number; // rest between sets
  holdSec: number; // seconds per set for timed moves
  tempo: string;
}

export const INTENSITY_CHOICES: IntensityChoice[] = [
  { value: 'light', label: 'Light', desc: 'Easy pace · fewer sets', count: 4, sets: 2, reps: '10-12', repsNum: 11, repSec: 3, restSec: 45, holdSec: 30, tempo: '2-0-1' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced training', count: 5, sets: 3, reps: '8-12', repsNum: 10, repSec: 5, restSec: 60, holdSec: 40, tempo: '3-1-1' },
  { value: 'intense', label: 'Intense', desc: 'High volume · push hard', count: 6, sets: 4, reps: '6-10', repsNum: 8, repSec: 5, restSec: 75, holdSec: 50, tempo: '3-1-1' },
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
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    // Migrate the old single 'band' category → tube_band + loop_band.
    const eq = (p.equipment ?? []) as string[];
    if (eq.includes('band')) {
      p.equipment = Array.from(
        new Set(eq.flatMap((e) => (e === 'band' ? ['tube_band', 'loop_band'] : [e]))),
      ) as Equipment[];
    }
    return p;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(p));
}
