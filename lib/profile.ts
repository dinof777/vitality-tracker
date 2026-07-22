import type { Equipment } from './database.types';
import { CANON_MUSCLE_GROUPS } from './taxonomy';

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
// curated session preset. Most muscle-group focuses map 1:1 onto that same
// value (`groups: ['Chest']`), but the "special" focuses don't — they draw by
// pillar, tag or mode (`pillars`, `tags`, `mobility`) instead.
export interface FocusChoice {
  /** Draw only from exercises carrying one of these tags (see lib/tags). */
  tags?: string[];
  /** Narrow further to one body area (AND with `tags`) — rehab sub-focuses. */
  areaTags?: string[];
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
  /** Which group the focus picker renders it under. */
  section: 'special' | 'muscle';
}

// Hand-curated presets: whole-session shapes that aren't just "one muscle
// group" — pillar-based (Cardio, Balance), mode-based (Mobility) or tag-based
// (the Physical Therapy rehab pool and its per-joint sub-focuses).
export const SPECIAL_FOCUSES: FocusChoice[] = [
  { value: 'full', label: 'Full Body', emoji: '🔥', desc: 'Hit everything in one session', groups: null, section: 'special' },
  { value: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'A bit of all 4 pillars', groups: null, pillars: ['strength', 'cardio', 'balance', 'flexibility'], balanced: true, section: 'special' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃', desc: 'Heart-rate & conditioning', groups: null, pillars: ['cardio'], section: 'special' },
  { value: 'balance', label: 'Balance', emoji: '🤸', desc: 'Single-leg & stability', groups: null, pillars: ['balance'], section: 'special' },
  { value: 'mobility', label: 'Mobility', emoji: '🧘', desc: 'Stretch, holds & flexibility', groups: null, mobility: true, section: 'special' },
  // Clinical focuses draw from the tagged rehab pool rather than muscle groups.
  // Physical Therapy is the umbrella (every rehab area); the per-joint focuses
  // below narrow to one. A future release nests these under PT properly instead
  // of listing them flat — see the taxonomy scoping note.
  { value: 'physical-therapy', label: 'Physical Therapy', emoji: '🩹', desc: 'Rehab & recovery work', groups: null, tags: ['physical-therapy'], byStage: true, section: 'special' },
  { value: 'knee', label: 'Knee', emoji: '🦿', desc: 'Bend, straighten & rebuild the knee', groups: null, tags: ['physical-therapy'], areaTags: ['knee'], byStage: true, section: 'special' },
  { value: 'shoulder', label: 'Shoulder', emoji: '🫱', desc: 'Rotator-cuff, scapular & impingement recovery', groups: null, tags: ['physical-therapy'], areaTags: ['shoulder'], byStage: true, section: 'special' },
  { value: 'ankle', label: 'Ankle', emoji: '🦶', desc: 'Post-sprain strength, balance & range', groups: null, tags: ['physical-therapy'], areaTags: ['ankle'], byStage: true, section: 'special' },
];

// Muscle-group focuses that DON'T get a tile of their own, because a special
// focus above already owns that exercise pool:
//   Full Body    → the "Full Body" special (groups: null = everything); a
//                  groups: ['Full Body'] focus would wrongly mean "only
//                  exercises literally tagged Full Body".
//   Conditioning → the "Cardio" special, via pillar rather than muscle group.
const MUSCLE_GROUP_FOCUS_SKIP = new Set<string>(['Full Body', 'Conditioning']);

/** "Rear Delts" → "rear-delts". Only used for the generated focus values below. */
function slugifyGroup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Best-available emoji per muscle group. Coverage is genuinely thin — the leg
// muscles share 🦵 because there isn't a distinct emoji for each — so this is a
// stopgap until lime-on-carbon muscle illustrations replace them (matching the
// exercise thumbnails). Unmapped groups fall back to 💪.
const MUSCLE_GROUP_EMOJI: Record<string, string> = {
  Chest: '🎽',
  Back: '🔙',
  Shoulders: '🤸',
  'Rear Delts': '🔙',
  Traps: '🤷',
  Arms: '💪',
  Grip: '✊',
  Core: '🎯',
  Spine: '🦴',
  'T-Spine': '🦴',
  Legs: '🦵',
  Quads: '🦵',
  Hamstrings: '🦵',
  Glutes: '🍑',
  Calves: '🦶',
  Hips: '🕺',
  'Hip Flexors': '🦵',
};

// One tile per canon muscle group (lib/taxonomy.ts) — generated, never hand-typed,
// so a new muscle group automatically gets a focus and can't be forgotten (see
// the guard test in profile.test.ts). Order follows CANON_MUSCLE_GROUPS itself
// rather than a hand-picked order, for the same reason.
export const MUSCLE_GROUP_FOCUSES: FocusChoice[] = (CANON_MUSCLE_GROUPS as readonly string[])
  .filter((group) => !MUSCLE_GROUP_FOCUS_SKIP.has(group))
  .map((group) => ({
    value: slugifyGroup(group),
    label: group,
    emoji: MUSCLE_GROUP_EMOJI[group] ?? '💪',
    desc: '',
    groups: [group],
    section: 'muscle' as const,
  }));

export const FOCUS_CHOICES: FocusChoice[] = [...SPECIAL_FOCUSES, ...MUSCLE_GROUP_FOCUSES];

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
  { value: 'light', label: 'Light', desc: 'Gentler exercises · fewer sets', count: 4, sets: 2, reps: '10-12', repsNum: 11, repSec: 3, restSec: 45, holdSec: 30, tempo: '2-0-1' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced mix · moderate volume', count: 5, sets: 3, reps: '8-12', repsNum: 10, repSec: 5, restSec: 60, holdSec: 40, tempo: '3-1-1' },
  { value: 'intense', label: 'Intense', desc: 'Explosive exercises · high volume', count: 6, sets: 4, reps: '6-10', repsNum: 8, repSec: 5, restSec: 75, holdSec: 50, tempo: '3-1-1' },
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
