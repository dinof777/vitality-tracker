import type { TagCategory } from './tags';

// The words the product uses, in one place.
//
// The same concept was being named differently depending on which screen you
// were on: the workout builder says "MOVES", the admin said "exercises"; the tag
// category stored as `pattern` rendered as "MOVEMENT" on the builder and the
// trainer dashboard but as the raw "pattern" in admin. A trainer and an admin
// talking about the same thing had no shared word for it.
//
// Round two (M2) swept the rest of the app for the same disease and picked
// "move" as the canonical noun. Round three reversed that call — the canonical
// noun is "exercise" again — but the underlying discipline (one word, used
// everywhere, imported rather than retyped) stands. Two more synonym pairs
// turned out to be pure drift and got collapsed to one word along the way:
//   - "gear" / "kit"  → always "equipment" now (FIELD_LABEL.equipment).
//   - "circuit" (for a trainer's saved, shareable session) → always "workout"
//     (WORKOUT below). "Circuit" survives ONLY where the copy is specifically
//     describing SyncroFit's side of a hand-off (e.g. "send as a timed circuit
//     to SyncroFit") — that's SyncroFit's word for its own concept, not ours,
//     and collapsing it would blur two genuinely different things.
// One pair turned out to be a real distinction, not drift, and was left alone
// on purpose — see the FOCUS vs MUSCLE GROUP note below.
//
// Import from here rather than typing a label. lib/vocabulary.test.ts fails the
// build if a surface hardcodes one of these instead.

/** A single exercise, as the product says it out loud. Never "move" or
 *  "movement" in user-facing copy — "move" was the M2 synonym, now retired. */
export const EXERCISE = { one: 'exercise', many: 'exercises' } as const;

/**
 * A trainer's saved, shareable session (`tenant_workouts` / `/api/tenant/workouts`) —
 * the thing SaveCircuitBox creates and `/dashboard/workouts` lists, tracked with
 * shares/opens/completions. Distinct from a Routine (see below) and from
 * SyncroFit's "circuit" (see the file header note) — say "workout" on every
 * Vitality-native surface.
 */
export const WORKOUT = { one: 'workout', many: 'workouts' } as const;

/**
 * A named, reusable, day-of-week-assignable, favoritable exercise list
 * (`routines` table, `/routines`) — the weekly-plan blueprint. Already said the
 * same way everywhere it appears, so there's no drift to guard here; noted for
 * contrast with WORKOUT and SyncroFit's "circuit."
 */
export const ROUTINE = { one: 'routine', many: 'routines' } as const;

/**
 * "Focus" (lib/profile.ts FOCUS_CHOICES) and "Muscle group" (FIELD_LABEL.muscle_group,
 * below) are two different things wearing similar clothes — deliberately NOT
 * unified:
 *   - Muscle group is a single exercise's taxonomy value ("Chest", "Legs"),
 *     governed in admin/taxonomy and shown under every exercise.
 *   - Focus is a curated session preset a trainee picks on Home / Build. Some
 *     focuses map 1:1 onto a set of muscle groups ("Upper Body"), but others
 *     draw from pillars ("Cardio", "Balance") or a tagged rehab pool ("Physical
 *     Therapy", "Knee") instead — a focus is not always reducible to muscle
 *     groups at all. Renaming one to the other would erase that.
 */
export const FOCUS_VS_MUSCLE_GROUP_NOTE =
  'Focus is a curated session preset; Muscle group is a single exercise’s taxonomy value. Not the same thing — see lib/vocabulary.ts.';

/** Everything on offer, as the product says it out loud. */
export const LIBRARY = 'library';

/**
 * Tag category labels. `pattern` is shown as "Movement" everywhere — the stored
 * value is the internal name, never the label.
 */
export const TAG_CATEGORY_LABEL: Record<TagCategory, string> = {
  goal: 'Goal',
  stage: 'Stage',
  pattern: 'Movement',
  area: 'Area',
};

/** What each tag category is for — used as the hint under a category picker. */
export const TAG_CATEGORY_HINT: Record<TagCategory, string> = {
  goal: 'What program it serves',
  stage: 'Where it sits in a progression',
  pattern: 'What the movement does',
  area: 'Which body area it is for',
};

// Trainer-pickable tag categories for a custom exercise. `area` is intentionally not
// here — body-area tags belong to curated rehab content, not free trainer entry.
export const TAG_CATEGORIES: TagCategory[] = ['goal', 'stage', 'pattern'];

export function tagCategoryLabel(category: string | null | undefined): string {
  if (!category) return '';
  return TAG_CATEGORY_LABEL[category as TagCategory] ?? category;
}

/** What a vocabulary field is called. Admin and trainer use the same words. */
export const FIELD_LABEL = {
  muscle_group: 'Muscle group',
  tag: 'Tag',
  equipment: 'Equipment',
} as const;

export const FIELD_LABEL_PLURAL = {
  muscle_group: 'Muscle groups',
  tag: 'Tags',
  equipment: 'Equipment',
} as const;

/**
 * Scope, said the same way on every surface. "Shared" is the badge; the longer
 * forms are for the selector, where the reader needs to know what it means.
 */
export const SCOPE = {
  global: { badge: 'Shared', long: 'Shared library — every gym' },
  tenant: { badge: 'Gym only', long: (gym: string) => `Only ${gym}` },
} as const;

/** "112 logged sets", "3 routines" — one place, so counts read alike everywhere. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
