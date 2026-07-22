import type { Equipment } from './database.types';
import { CANON_MUSCLE_GROUPS } from './taxonomy';
import { tagsInCategory } from './tags';

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
  /** Which group the focus picker renders it under. `region` is admin-managed
   *  (see regionFocus below) — never hand-authored like special/muscle. */
  section: 'special' | 'muscle' | 'region';
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
  // Clinical: Physical Therapy is the umbrella (every rehab area, unnarrowed).
  // The per-joint focuses that used to be hand-typed here are now generated —
  // see REHAB_AREA_FOCUSES below — so a new rehab area tag (lib/tags.ts)
  // reaches a focus automatically instead of needing a matching hand-authored
  // entry in this array.
  { value: 'physical-therapy', label: 'Physical Therapy', emoji: '🩹', desc: 'Rehab & recovery work', groups: null, tags: ['physical-therapy'], byStage: true, section: 'special' },
];

// Best-available emoji per rehab area (lib/tags#tagsInCategory('area')).
// Thin coverage for the same reason MUSCLE_GROUP_EMOJI below is — v1 is only
// knee/shoulder/ankle, each hand-picked; a future area falls back to 🩹.
const REHAB_AREA_EMOJI: Record<string, string> = {
  knee: '🦿',
  shoulder: '🫱',
  ankle: '🦶',
};

/**
 * One focus per rehab area tag (lib/tags.ts `category: 'area'`) — generated,
 * never hand-typed, the same reasoning as MUSCLE_GROUP_FOCUSES below: today
 * that's exactly knee/shoulder/ankle (v1 scope), and a future area tag reaches
 * a focus the moment it's added to the tag registry instead of needing a
 * second hand-authored entry to stay in sync.
 */
export const REHAB_AREA_FOCUSES: FocusChoice[] = tagsInCategory('area').map((tag) => ({
  value: tag.id,
  label: tag.label,
  emoji: REHAB_AREA_EMOJI[tag.id] ?? '🩹',
  desc: tag.description,
  groups: null,
  tags: ['physical-therapy'],
  areaTags: [tag.id],
  byStage: true,
  section: 'special' as const,
}));

// Muscle-group focuses that DON'T get a tile of their own, because a special
// focus above already owns that exercise pool:
//   Full Body    → the "Full Body" special (groups: null = everything); a
//                  groups: ['Full Body'] focus would wrongly mean "only
//                  exercises literally tagged Full Body".
//   Conditioning → the "Cardio" special, via pillar rather than muscle group.
const MUSCLE_GROUP_FOCUS_SKIP = new Set<string>(['Full Body', 'Conditioning']);

/** "Rear Delts" → "rear-delts". Exported so a region focus (below) can build a
 *  value in the same shape as the generated muscle-group focuses. */
export function slugifyGroup(name: string): string {
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

export const FOCUS_CHOICES: FocusChoice[] = [...SPECIAL_FOCUSES, ...REHAB_AREA_FOCUSES, ...MUSCLE_GROUP_FOCUSES];

/**
 * Turn one admin-managed region (GET /api/taxonomy/regions — a muscle_group
 * taxonomy_terms row with children) into a FocusChoice the builder and
 * generator can treat exactly like any other focus. `groups` is the region's
 * children by name; the generator already handles a multi-group focus
 * (varietyOrdered picks one exercise per muscle group before repeating), so
 * no generator change was needed for this to work.
 *
 * Regions are DB data, not a curated preset, so they're never folded into the
 * static FOCUS_CHOICES above — every caller that resolves a focus VALUE (the
 * generator, the builder's own display) merges the fetched list in alongside
 * FOCUS_CHOICES instead. See BuilderControls.tsx and
 * app/g/[slug]/build/page.tsx.
 *
 * `region.groups` is parent-inclusive (`[region_name, ...children]` — see
 * fetchRegionHierarchy) so the generated workout draws from the parent's own
 * tagged exercises too, not just its children. The description only lists the
 * children, since the region name is already the tile's own label.
 */
export function regionFocus(region: { region: string; groups: string[] }): FocusChoice {
  return {
    value: `region-${slugifyGroup(region.region)}`,
    label: region.region,
    emoji: '🧭',
    desc: region.groups.slice(1).join(', '),
    groups: region.groups,
    section: 'region',
  };
}

// ── Drill-down tree builders (lib/profile) ──────────────────────────────────
// Both the trees a MuscleDrillDown instance can show — the muscle-group tree
// (onboarding goals 1-3 + BuilderControls) and the rehab-area tree (onboarding
// goal 4). Building them here, once, is what lets onboarding and the
// per-workout builder share the identical component over the identical data
// instead of each hand-rolling its own view of the tree.

export interface DrillDownNode {
  value: string;
  label: string;
  emoji: string;
  children?: { value: string; label: string; emoji: string }[];
}

/**
 * Muscle-group tree for MuscleDrillDown: a "Full Body" leaf (the same whole-
 * session preset as the Full Body special focus), one parent node per
 * admin-managed region (drilling to its children), then a leaf tile for every
 * remaining muscle group that isn't part of a region. `regions` is DB state —
 * pass [] before it's loaded and every muscle group renders flat, which is
 * the correct fallback (no worse than the old flat picker), not a broken tree.
 */
export function muscleDrillDownNodes(regions: { region: string; groups: string[] }[]): DrillDownNode[] {
  const parentNames = new Set(regions.map((r) => r.region));
  // A muscle group already nested under a region (Quads/Biceps/…) must NOT
  // also surface as its own top-level leaf, or the drill-down collapses back
  // into the flat wall of tiles it was built to replace — every group would
  // render twice: once correctly nested, once leaked flat alongside its
  // parent.
  const childNames = new Set(regions.flatMap((r) => r.groups.filter((g) => g !== r.region)));
  const byLabel = new Map(MUSCLE_GROUP_FOCUSES.map((f) => [f.label, f]));
  const full = SPECIAL_FOCUSES.find((f) => f.value === 'full');

  const parents: DrillDownNode[] = regions.map((r) => ({
    value: `region-${slugifyGroup(r.region)}`,
    label: r.region,
    emoji: byLabel.get(r.region)?.emoji ?? '🧭',
    children: r.groups
      .filter((name) => name !== r.region)
      .map((name) => {
        const f = byLabel.get(name);
        return f ? { value: f.value, label: f.label, emoji: f.emoji } : { value: slugifyGroup(name), label: name, emoji: '💪' };
      }),
  }));

  const leaves: DrillDownNode[] = MUSCLE_GROUP_FOCUSES.filter(
    (f) => !parentNames.has(f.label) && !childNames.has(f.label),
  ).map((f) => ({
    value: f.value,
    label: f.label,
    emoji: f.emoji,
  }));

  return [...(full ? [{ value: full.value, label: full.label, emoji: full.emoji }] : []), ...parents, ...leaves];
}

/**
 * Rehab-area tree for MuscleDrillDown: the Physical Therapy umbrella as the
 * single "whole area" parent, drilling to the specific joint focuses
 * (knee/shoulder/ankle in v1, from REHAB_AREA_FOCUSES). Tapping the umbrella
 * tile alone selects every rehab area; tapping a revealed child narrows to one.
 */
export function rehabDrillDownNodes(): DrillDownNode[] {
  const umbrella = SPECIAL_FOCUSES.find((f) => f.value === 'physical-therapy');
  const children = REHAB_AREA_FOCUSES.map((f) => ({ value: f.value, label: f.label, emoji: f.emoji }));
  if (!umbrella) return children;
  return [{ value: umbrella.value, label: umbrella.label, emoji: umbrella.emoji, children }];
}

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

/**
 * Same lookup as focusChoice, but checked against admin-managed regions first —
 * every caller that has fetched regions (BuilderControls, the personal Home
 * page, the gym build page) should resolve through this rather than the bare
 * focusChoice, or a region focus value silently resolves to Full Body.
 */
export function resolveFocus(value: string, regions: FocusChoice[]): FocusChoice {
  return regions.find((f) => f.value === value) ?? focusChoice(value);
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
