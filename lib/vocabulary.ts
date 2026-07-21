import type { TagCategory } from './tags';

// The words the product uses, in one place.
//
// The same concept was being named differently depending on which screen you
// were on: the workout builder says "MOVES", the admin said "exercises"; the tag
// category stored as `pattern` rendered as "MOVEMENT" on the builder and the
// trainer dashboard but as the raw "pattern" in admin. A trainer and an admin
// talking about the same thing had no shared word for it.
//
// Import from here rather than typing a label. lib/vocabulary.test.ts fails the
// build if a surface hardcodes one of these instead.

/** A single exercise, as the product says it out loud. */
export const MOVE = { one: 'move', many: 'moves' } as const;

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
};

/** What each tag category is for — used as the hint under a category picker. */
export const TAG_CATEGORY_HINT: Record<TagCategory, string> = {
  goal: 'What program it serves',
  stage: 'Where it sits in a progression',
  pattern: 'What the movement does',
};

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
