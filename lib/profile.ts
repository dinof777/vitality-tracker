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
  // Weekly-plan preferences.
  goal?: import('./pillars').Goal;
  daysPerWeek?: number;
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
  { value: 'calisthenics', label: 'Calisthenics', hint: 'Bodyweight — reps, holds & planks', emoji: '💪' },
  { value: 'tube_band', label: 'Tube Bands', hint: 'Long bands with handles', emoji: '🎗️' },
  { value: 'loop_band', label: 'Loop Bands', hint: 'Mini / booty bands', emoji: '⭕' },
  { value: 'pullup_bar', label: 'Pull-up Bar', hint: 'Doorway or mounted', emoji: '🤸' },
  { value: 'medicine_ball', label: 'Medicine Ball', hint: 'Slams, throws, twists', emoji: '🏐' },
  { value: 'jump_rope', label: 'Jump Rope', hint: 'Conditioning & cardio', emoji: '🪢' },
  { value: 'stretch', label: 'Stretching', hint: 'Mobility & recovery', emoji: '🧘' },
];

// Focus vs Muscle group: deliberately two different words for two different
// things (not drift) — see FOCUS_VS_MUSCLE_GROUP_NOTE in lib/vocabulary.ts.
// A muscle group is a single move's taxonomy value ("Chest"); a Focus is a
// curated session preset that sometimes maps onto muscle groups (`groups`
// below) and sometimes doesn't (`pillars`, `tags`, `mobility` instead).
export interface FocusChoice {
  /** Draw only from exercises carrying one of these tags (see lib/tags). */
  tags?: string[];
  /** Order the result by recovery stage — early work first. */
  byStage?: boolean;
  value: string;
  label: string;
  emoji: string;
  desc: string;
  groups: string[] | null; // null = all muscle groups
  mobility?: boolean; // match stretch/isometric instead of muscle group
  pillars?: import('./pillars').Pillar[]; // pillar-based focus (overrides groups)
  balanced?: boolean; // round-robin one exercise per pillar
}

export const FOCUS_CHOICES: FocusChoice[] = [
  { value: 'full', label: 'Full Body', emoji: '🔥', desc: 'Hit everything in one session', groups: null },
  { value: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'A bit of all 4 pillars', groups: null, pillars: ['strength', 'cardio', 'balance', 'flexibility'], balanced: true },
  { value: 'upper', label: 'Upper Body', emoji: '💪', desc: 'Chest, back, shoulders & arms', groups: ['Chest', 'Back', 'Shoulders', 'Arms', 'Rear Delts', 'Traps'] },
  { value: 'lower', label: 'Lower Body', emoji: '🦵', desc: 'Legs, glutes & hamstrings', groups: ['Legs', 'Hamstrings', 'Glutes', 'Calves'] },
  { value: 'core', label: 'Core & Abs', emoji: '🎯', desc: 'Midsection & stability', groups: ['Core'] },
  { value: 'cardio', label: 'Cardio', emoji: '🏃', desc: 'Heart-rate & conditioning', groups: null, pillars: ['cardio'] },
  { value: 'balance', label: 'Balance', emoji: '🤸', desc: 'Single-leg & stability', groups: null, pillars: ['balance'] },
  { value: 'mobility', label: 'Mobility', emoji: '🧘', desc: 'Stretch, holds & flexibility', groups: null, mobility: true },
  // Clinical focuses draw from the tagged rehab pool rather than muscle groups.
  // Physical Therapy is the umbrella (every rehab area); the per-joint focuses
  // below narrow to one. A future release nests these under PT properly instead
  // of listing them flat — see the taxonomy scoping note.
  { value: 'physical-therapy', label: 'Physical Therapy', emoji: '🩹', desc: 'Rehab & recovery work', groups: null, tags: ['knee-pt', 'shoulder-pt', 'ankle-pt'], byStage: true },
  { value: 'knee', label: 'Knee', emoji: '🦿', desc: 'Bend, straighten & rebuild the knee', groups: null, tags: ['knee-pt'], byStage: true },
  { value: 'shoulder', label: 'Shoulder', emoji: '🫱', desc: 'Rotator-cuff, scapular & impingement recovery', groups: null, tags: ['shoulder-pt'], byStage: true },
  { value: 'ankle', label: 'Ankle', emoji: '🦶', desc: 'Post-sprain strength, balance & range', groups: null, tags: ['ankle-pt'], byStage: true },
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
  { value: 'light', label: 'Light', desc: 'Gentler moves · fewer sets', count: 4, sets: 2, reps: '10-12', repsNum: 11, repSec: 3, restSec: 45, holdSec: 30, tempo: '2-0-1' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced mix · moderate volume', count: 5, sets: 3, reps: '8-12', repsNum: 10, repSec: 5, restSec: 60, holdSec: 40, tempo: '3-1-1' },
  { value: 'intense', label: 'Intense', desc: 'Explosive moves · high volume', count: 6, sets: 4, reps: '6-10', repsNum: 8, repSec: 5, restSec: 75, holdSec: 50, tempo: '3-1-1' },
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
    let eq = (p.equipment ?? []) as string[];
    // Legacy 'band' → tube + loop; 'isometric' merged into 'calisthenics'.
    if (eq.includes('band') || eq.includes('isometric')) {
      eq = eq.flatMap((e) =>
        e === 'band' ? ['tube_band', 'loop_band'] : e === 'isometric' ? ['calisthenics'] : [e],
      );
      p.equipment = Array.from(new Set(eq)) as Equipment[];
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
