import type { Equipment } from './database.types';
import type { Pillar } from './pillars';
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
  { value: 'stationary_bike', label: 'Stationary Bike', hint: 'Spin bike or upright — steady rides & intervals', emoji: '🚴' },
  { value: 'treadmill', label: 'Treadmill', hint: 'Walk, jog, run, or hill intervals', emoji: '🏃' },
  { value: 'stair_climber', label: 'Stair Climber', hint: 'Stepmill or stair machine — sustained climbs', emoji: '🪜' },
  { value: 'rowing_machine', label: 'Rowing Machine', hint: 'Ergometer — full-body pulling cardio', emoji: '🚣' },
  { value: 'elliptical', label: 'Elliptical', hint: 'Low-impact cross-trainer intervals', emoji: '🌀' },
  { value: 'barbell', label: 'Barbell', hint: 'Bar + plates — squat, hinge, press, row', emoji: '🔩' },
  { value: 'cable_machine', label: 'Cable Machine', hint: 'Adjustable pulley — presses, pulls, rotation', emoji: '🪝' },
  { value: 'leg_press_machine', label: 'Leg Press', hint: 'Seated sled — quad/glute/hamstring drive', emoji: '🛝' },
  { value: 'lat_pulldown_machine', label: 'Lat Pulldown', hint: 'Seated vertical pull for the back', emoji: '⬇️' },
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
  // Pillar tiles (step 1 of the pillar-first focus picker — see
  // focusPillarNodes below). strength/flexibility are new; cardio/balance
  // already existed and are reused as-is (same value, same semantics).
  { value: 'strength', label: 'Strength', emoji: '💪', desc: 'Resistance & core work', groups: null, pillars: ['strength'], section: 'special' },
  { value: 'cardio', label: 'Cardio', emoji: '🏃', desc: 'Heart-rate & conditioning', groups: null, pillars: ['cardio'], section: 'special' },
  { value: 'balance', label: 'Balance', emoji: '🤸', desc: 'Single-leg & stability', groups: null, pillars: ['balance'], section: 'special' },
  // NOTE: `flexibility` (pillar = equipment==='stretch') is NARROWER than the
  // legacy `mobility` preset below (exerciseMode==='hold', also catches
  // bodyweight holds). `mobility` stays resolvable forever for backward
  // compat, but the new pillar-first picker never produces it.
  { value: 'flexibility', label: 'Flexibility', emoji: '🧘', desc: 'Stretch equipment work', groups: null, pillars: ['flexibility'], section: 'special' },
  { value: 'mobility', label: 'Mobility', emoji: '🧘', desc: 'Stretch, holds & flexibility', groups: null, mobility: true, section: 'special' },
  // Clinical: Physical Therapy is the umbrella (every rehab area, unnarrowed).
  // The per-joint focuses that used to be hand-typed here are now generated —
  // see REHAB_AREA_FOCUSES below — so a new rehab area tag (lib/tags.ts)
  // reaches a focus automatically instead of needing a matching hand-authored
  // entry in this array.
  { value: 'physical-therapy', label: 'Physical Therapy', emoji: '🩹', desc: 'Rehab & recovery work', groups: null, tags: ['physical-therapy'], byStage: true, section: 'special' },
];

// Best-available emoji per rehab area (lib/tags#tagsInCategory('area')).
// Thin coverage for the same reason MUSCLE_GROUP_EMOJI below is — each area is
// hand-picked and deliberately distinct from the muscle-tree emoji above it;
// a future area falls back to 🩹.
const REHAB_AREA_EMOJI: Record<string, string> = {
  knee: '🦿',
  shoulder: '🫱',
  ankle: '🦶',
  hip: '🚶',
  'low-back': '🧎',
  'upper-back': '🦅',
};

/**
 * One focus per rehab area tag (lib/tags.ts `category: 'area'`) — generated,
 * never hand-typed, the same reasoning as MUSCLE_GROUP_FOCUSES below: today
 * that's knee/shoulder/ankle/hip/low-back/upper-back, and a future area tag
 * reaches a focus the moment it's added to the tag registry instead of
 * needing a second hand-authored entry to stay in sync.
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

// ── Pillar-first focus picker (composite grammar) ───────────────────────────
// The per-workout focus sheet (BuilderControls) drills Pillar → Muscle group →
// Deep. `Profile.focus` stays a single string; a composite value is just
// `<pillarToken>[:<groupSlug>[:<deepSlug>]]`. The grammar activates ONLY when
// the string contains a `:` — no legacy value (full, balanced, cardio,
// region-legs, quads, physical-therapy, knee, mobility, …) has ever contained
// a colon, so this is purely additive, never a migration.

/** The 5 tokens a picker "pillar" tile can advance into. */
export type PillarToken = Pillar | 'physical-therapy';
const PILLAR_TOKENS: PillarToken[] = ['strength', 'cardio', 'balance', 'flexibility', 'physical-therapy'];

export function isPillarToken(value: string): value is PillarToken {
  return (PILLAR_TOKENS as string[]).includes(value);
}

/**
 * Muscle-group tree for the training pillars, hardcoded (not DB-dependent —
 * regions don't factor into the pillar-first picker). Parent-inclusive:
 * a group's training filter set is `[group, ...muscles]`.
 */
export const FOCUS_MUSCLE_GROUPS: { group: string; muscles: string[] }[] = [
  { group: 'Legs', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Hips'] },
  { group: 'Back', muscles: ['Traps', 'Spine', 'T-Spine'] }, // Spine included → low-back Spine exercises resolve
  { group: 'Chest', muscles: [] },
  { group: 'Shoulders', muscles: ['Rear Delts'] },
  { group: 'Arms', muscles: ['Biceps', 'Triceps', 'Grip'] },
  { group: 'Core', muscles: ['Obliques'] },
];

// PT-CONFIRMED mapping (low-back → Back, per the physical therapist):
const AREA_TO_GROUP: Record<string, string> = {
  knee: 'Legs',
  hip: 'Legs',
  ankle: 'Legs',
  shoulder: 'Shoulders',
  'upper-back': 'Back',
  'low-back': 'Back',
};

interface ParsedFocus {
  pillarToken: string;
  groupSlug?: string;
  deepSlug?: string;
}

/** Split a composite value on ':'. Returns null for any colon-free (legacy) value. */
export function parseFocusValue(value: string): ParsedFocus | null {
  if (!value.includes(':')) return null;
  const [pillarToken, groupSlug, deepSlug] = value.split(':');
  if (!pillarToken) return null;
  return { pillarToken, groupSlug: groupSlug || undefined, deepSlug: deepSlug || undefined };
}

/**
 * Build a FocusChoice from parsed composite parts. `parts.pillarToken` is
 * assumed already validated by the caller (parseCompositeFocus). A stale or
 * malformed group/deep slug degrades to the next coarser level — this never
 * throws and never returns an empty/unrecognized focus.
 */
function compositeFocusChoice(parts: ParsedFocus): FocusChoice {
  const { pillarToken, groupSlug, deepSlug } = parts;
  const pillarBase = SPECIAL_FOCUSES.find((f) => f.value === pillarToken);
  if (!pillarBase) return FOCUS_CHOICES[0]; // defensive; callers only pass a validated pillar token

  if (!groupSlug) return pillarBase;

  const group = FOCUS_MUSCLE_GROUPS.find((g) => slugifyGroup(g.group) === groupSlug);
  if (!group) return pillarBase; // stale group slug degrades to the bare pillar

  const groupValue = `${pillarToken}:${groupSlug}`;
  const isPT = pillarToken === 'physical-therapy';

  if (isPT) {
    const areas = tagsInCategory('area').filter((t) => AREA_TO_GROUP[t.id] === group.group);
    if (!deepSlug) {
      return {
        value: groupValue,
        label: `Physical Therapy · ${group.group}`,
        emoji: pillarBase.emoji,
        desc: `Rehab & recovery work for ${group.group}`,
        groups: null,
        tags: ['physical-therapy'],
        areaTags: areas.map((a) => a.id), // empty for Chest/Core/Arms — falls back to the full PT pool, not zero results
        byStage: true,
        section: 'special',
      };
    }
    const area = areas.find((a) => a.id === deepSlug);
    if (!area) return compositeFocusChoice({ pillarToken, groupSlug }); // stale deep slug degrades to group-level
    return {
      value: `${groupValue}:${deepSlug}`,
      label: area.label,
      emoji: REHAB_AREA_EMOJI[area.id] ?? '🩹',
      desc: area.description,
      groups: null,
      tags: ['physical-therapy'],
      areaTags: [area.id],
      byStage: true,
      section: 'special',
    };
  }

  // Training pillar: the group's parent-inclusive muscle set, AND-ed with the pillar.
  const pillar = pillarToken as Pillar;
  const parentInclusive = [group.group, ...group.muscles];
  if (!deepSlug) {
    return {
      value: groupValue,
      label: `${pillarBase.label} · ${group.group}`,
      emoji: pillarBase.emoji,
      desc: `${pillarBase.label} work for ${group.group}`,
      groups: parentInclusive,
      pillars: [pillar],
      section: 'special',
    };
  }
  const muscle = group.muscles.find((m) => slugifyGroup(m) === deepSlug);
  if (!muscle) return compositeFocusChoice({ pillarToken, groupSlug }); // stale deep slug degrades to group-level
  return {
    value: `${groupValue}:${deepSlug}`,
    label: `${pillarBase.label} · ${muscle}`,
    emoji: MUSCLE_GROUP_EMOJI[muscle] ?? pillarBase.emoji,
    desc: `${pillarBase.label} work for ${muscle}`,
    groups: [muscle],
    pillars: [pillar],
    section: 'special',
  };
}

/**
 * The single choke point composite values pass through — see focusChoice
 * below. Exported so a host that gates a raw focus VALUE before it ever
 * reaches focusChoice (e.g. the gym build page's URL-param allowlist) can
 * accept a well-formed composite instead of only the static FOCUS_CHOICES.
 */
export function parseCompositeFocus(value: string): FocusChoice | null {
  if (!value.includes(':')) return null; // legacy path, byte-identical to today
  const parts = parseFocusValue(value);
  if (!parts || !isPillarToken(parts.pillarToken)) return null; // foreign token → fall through to legacy lookup
  return compositeFocusChoice(parts);
}

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
 *
 * No longer called from any host — onboarding step 2 switched to the shared
 * FocusPicker (components/workout/FocusPicker.tsx). Left in place (still
 * covered by lib/profile-drilldown.test.ts) rather than deleted; a future
 * cleanup pass can remove it if nothing else ever needs the region-driven tree.
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
 *
 * No longer called from any host — onboarding step 2 switched to the shared
 * FocusPicker (components/workout/FocusPicker.tsx). Left in place (still
 * covered by lib/profile-drilldown.test.ts) rather than deleted.
 */
export function rehabDrillDownNodes(): DrillDownNode[] {
  const umbrella = SPECIAL_FOCUSES.find((f) => f.value === 'physical-therapy');
  const children = REHAB_AREA_FOCUSES.map((f) => ({ value: f.value, label: f.label, emoji: f.emoji }));
  if (!umbrella) return children;
  return [{ value: umbrella.value, label: umbrella.label, emoji: umbrella.emoji, children }];
}

// ── Pillar-first focus picker tree builders ─────────────────────────────────
// BuilderControls' `sheet === 'focus'` is a two-step drill: pick a pillar
// (step 1), then optionally a muscle group / deep muscle-or-joint (step 2,
// reusing the SAME MuscleDrillDown component + its parent/child expand
// behavior). Onboarding keeps using muscleDrillDownNodes/rehabDrillDownNodes
// above, untouched — these are additive, not a replacement.

/** Step 1: Full Body + Balanced (select-and-close) plus the 5 pillar tiles
 *  (each advances to step 2 instead of selecting). Flat leaves — no children —
 *  so MuscleDrillDown never auto-expands them; BuilderControls owns the
 *  advance-vs-select decision per tile. */
const FOCUS_PILLAR_STEP1_VALUES = ['full', 'balanced', 'strength', 'cardio', 'balance', 'flexibility', 'physical-therapy'];

export function focusPillarNodes(): DrillDownNode[] {
  return FOCUS_PILLAR_STEP1_VALUES.map((v) => {
    const f = SPECIAL_FOCUSES.find((sf) => sf.value === v);
    return f
      ? { value: f.value, label: f.label, emoji: f.emoji }
      : { value: v, label: v, emoji: '💪' }; // defensive; every value above has a SPECIAL_FOCUSES entry
  });
}

/**
 * Step 2 (+3) for a chosen pillar: one tile per FOCUS_MUSCLE_GROUPS group,
 * each carrying children to drill deeper — muscles for a training pillar,
 * rehab areas (via AREA_TO_GROUP) for physical-therapy. A group with no
 * children (Chest under a training pillar; Chest/Core/Arms under PT, which
 * have no mapped rehab area) is a leaf, same as MuscleDrillDown already
 * handles for any childless node.
 */
export function focusGroupNodes(pillarToken: string): DrillDownNode[] {
  const isPT = pillarToken === 'physical-therapy';
  return FOCUS_MUSCLE_GROUPS.map((g) => {
    const groupSlug = slugifyGroup(g.group);
    const groupValue = `${pillarToken}:${groupSlug}`;
    const groupEmoji = MUSCLE_GROUP_EMOJI[g.group] ?? '💪';

    if (isPT) {
      const areas = tagsInCategory('area').filter((t) => AREA_TO_GROUP[t.id] === g.group);
      return {
        value: groupValue,
        label: g.group,
        emoji: groupEmoji,
        children: areas.length
          ? areas.map((a) => ({ value: `${groupValue}:${a.id}`, label: a.label, emoji: REHAB_AREA_EMOJI[a.id] ?? '🩹' }))
          : undefined,
      };
    }

    return {
      value: groupValue,
      label: g.group,
      emoji: groupEmoji,
      children: g.muscles.length
        ? g.muscles.map((m) => ({ value: `${groupValue}:${slugifyGroup(m)}`, label: m, emoji: MUSCLE_GROUP_EMOJI[m] ?? '💪' }))
        : undefined,
    };
  });
}

/**
 * Reopen-state: which pillar (step-1 token) the current focus value belongs
 * to, so reopening the sheet lands where the focus already lives instead of
 * always resetting to step 1. `regions` kept in the signature for parity with
 * resolveFocus/focusKind (an admin-managed region focus is exactly the kind
 * of legacy value that correctly falls through to 'full' below).
 */
export function focusPillarToken(value: string, regions: FocusChoice[]): string {
  void regions;
  const parts = parseFocusValue(value);
  if (parts && isPillarToken(parts.pillarToken)) return parts.pillarToken;
  if (FOCUS_PILLAR_STEP1_VALUES.includes(value)) return value;
  return 'full'; // legacy bare muscle-group slug / region / bare rehab-area / 'mobility'
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
  const composite = parseCompositeFocus(value);
  if (composite) return composite;
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

/** Focus values that live in the "Style" lens of the focus picker's segmented
 *  control — pillar/mode-based whole-session presets, as opposed to a single
 *  muscle group or a rehab area. Physical Therapy and Full Body are
 *  deliberately excluded: PT belongs to the Rehab lens (below) and Full Body
 *  belongs to the Muscle lens (it's the drill-down's own first node). */
const STYLE_FOCUS_VALUES = new Set(['balanced', 'cardio', 'balance', 'mobility']);

/**
 * Which lens of the focus picker's segmented control (Muscle · Style · Rehab)
 * a resolved focus value belongs to — drives the sheet's default tab so
 * reopening it lands where the current focus already lives, instead of always
 * resetting to the first tab.
 *
 * Not currently called from any host UI (still covered by
 * lib/profile-drilldown.test.ts) — left in place rather than deleted.
 */
export function focusKind(value: string, regions: FocusChoice[]): 'muscle' | 'style' | 'rehab' {
  const fc = resolveFocus(value, regions);
  if (fc.tags?.includes('physical-therapy') || (fc.areaTags && fc.areaTags.length > 0)) return 'rehab';
  if (STYLE_FOCUS_VALUES.has(fc.value)) return 'style';
  return 'muscle';
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
