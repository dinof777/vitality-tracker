import type { Equipment, Exercise } from './database.types';

// Exercise tagging system.
//
// Tags add the dimensions the columns can't express — what a movement is FOR
// (goal), where it fits in a progression (stage), and what it does to the body
// (pattern). Muscle group and equipment stay as columns (single source of truth);
// `filterExercises` queries across all of them together so callers never care
// which dimension lives where.

export type TagCategory = 'goal' | 'stage' | 'pattern';

export interface Tag {
  id: string;
  category: TagCategory;
  label: string;
  description: string;
  /** Rehab/clinical goal — surfaces REHAB_DISCLAIMER wherever it's shown. */
  clinical?: boolean;
}

export const TAGS: Tag[] = [
  // ── Goal: what program this movement serves ────────────────────────────────
  { id: 'knee-pt', category: 'goal', label: 'Knee PT', description: 'Knee rehab — post knee-replacement or knee-injury recovery', clinical: true },
  { id: 'mobility', category: 'goal', label: 'Mobility', description: 'Range of motion and tissue length' },
  { id: 'strength', category: 'goal', label: 'Strength', description: 'Rebuilding force production' },
  { id: 'stability', category: 'goal', label: 'Stability', description: 'Balance, control, and joint support' },

  // ── Stage: where it sits in a recovery/progression arc ─────────────────────
  { id: 'stage-1', category: 'stage', label: 'Stage 1 · Early', description: 'Gentle activation and range — floor/seated, little to no weight through the leg' },
  { id: 'stage-2', category: 'stage', label: 'Stage 2 · Progressing', description: 'Standing work, partial load, building range and control' },
  { id: 'stage-3', category: 'stage', label: 'Stage 3 · Strengthening', description: 'Loaded and single-leg work — rebuilding real strength and function' },

  // ── Pattern: what the movement actually does ───────────────────────────────
  { id: 'knee-flexion', category: 'pattern', label: 'Knee flexion', description: 'Bending the knee — regaining the bend' },
  { id: 'knee-extension', category: 'pattern', label: 'Knee extension', description: 'Straightening the knee — regaining full extension' },
  { id: 'stretch', category: 'pattern', label: 'Stretch', description: 'Sustained lengthening hold' },
  { id: 'isometric', category: 'pattern', label: 'Isometric', description: 'Contract and hold — no joint movement' },
  { id: 'balance', category: 'pattern', label: 'Balance', description: 'Single-leg or unstable control' },
  { id: 'low-impact', category: 'pattern', label: 'Low impact', description: 'No jarring or jumping through the joint' },
  { id: 'seated-lying', category: 'pattern', label: 'Seated / lying', description: 'Done off the feet — no weight through the leg' },
  { id: 'weight-bearing', category: 'pattern', label: 'Weight bearing', description: 'Standing — load through the leg' },
];

export const TAG_BY_ID: Record<string, Tag> = Object.fromEntries(TAGS.map((t) => [t.id, t]));

export function tagLabel(id: string): string {
  return TAG_BY_ID[id]?.label ?? id;
}

export function tagsInCategory(category: TagCategory): Tag[] {
  return TAGS.filter((t) => t.category === category);
}

export function hasTag(ex: Exercise, tagId: string): boolean {
  return (ex.tags ?? []).includes(tagId);
}

/** Stage tags in progression order, for grouping a program by phase. */
export const STAGE_ORDER = ['stage-1', 'stage-2', 'stage-3'] as const;

export interface ExerciseFilter {
  /** Must have ALL of these tags. */
  allTags?: string[];
  /** Must have AT LEAST ONE of these tags (ignored when empty). */
  anyTags?: string[];
  equipment?: Equipment[];
  muscleGroups?: string[];
  /** Case-insensitive match on name. */
  search?: string;
}

/** One filter across tags + equipment + muscle group + name. */
export function filterExercises(list: Exercise[], f: ExerciseFilter): Exercise[] {
  const q = f.search?.trim().toLowerCase();
  return list.filter((ex) => {
    const tags = ex.tags ?? [];
    if (f.allTags?.length && !f.allTags.every((t) => tags.includes(t))) return false;
    if (f.anyTags?.length && !f.anyTags.some((t) => tags.includes(t))) return false;
    if (f.equipment?.length && !(ex.equipment && f.equipment.includes(ex.equipment))) return false;
    if (f.muscleGroups?.length && !(ex.muscle_group && f.muscleGroups.includes(ex.muscle_group))) return false;
    if (q && !ex.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** The minimum shape the faceted filter needs — Exercise and PickerItem both fit. */
export interface FacetFilterable {
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  tags?: string[];
}

export interface Facets {
  /** Tag ids across any categories. */
  tags?: string[];
  equipment?: string[];
  /** Matches name or muscle group, case-insensitive. */
  search?: string;
}

/**
 * Faceted filter with the semantics people expect from filter chips:
 *
 *   • OR **within** a group — picking "Knee flexion" + "Knee extension" widens the
 *     list to movements that do either, rather than demanding both.
 *   • AND **across** groups — Goal "Knee PT" + Stage "Stage 1" narrows to movements
 *     that are both.
 *
 * Equipment is its own OR facet, AND-ed in the same way.
 */
export function filterByFacets<T extends FacetFilterable>(list: T[], f: Facets): T[] {
  // Group the selected tags by their category so each group can OR internally.
  const byCategory = new Map<TagCategory, string[]>();
  for (const id of f.tags ?? []) {
    const cat = TAG_BY_ID[id]?.category;
    if (!cat) continue;
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), id]);
  }
  const groups = Array.from(byCategory.values());
  const q = f.search?.trim().toLowerCase();

  return list.filter((item) => {
    const tags = item.tags ?? [];
    // Every group that has a selection must be satisfied by at least one of its tags.
    for (const group of groups) {
      if (!group.some((t) => tags.includes(t))) return false;
    }
    if (f.equipment?.length && !(item.equipment && f.equipment.includes(item.equipment))) return false;
    if (q && !item.name.toLowerCase().includes(q) && !(item.muscle_group ?? '').toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Bucket a list by the tags of one category, in registry order. */
export function groupByTag(list: Exercise[], category: TagCategory): Array<{ tag: Tag; items: Exercise[] }> {
  return tagsInCategory(category)
    .map((tag) => ({ tag, items: list.filter((ex) => hasTag(ex, tag.id)) }))
    .filter((g) => g.items.length > 0);
}

/** Every tag actually in use on a list, for building filter chips. */
export function usedTags(list: Exercise[], category?: TagCategory): Tag[] {
  const seen = new Set(list.flatMap((ex) => ex.tags ?? []));
  return TAGS.filter((t) => seen.has(t.id) && (!category || t.category === category));
}

// Shown on any rehab/clinical collection. These are widely-used movements, not a
// prescription — programming after surgery belongs to the person's care team.
export const REHAB_DISCLAIMER =
  'General rehab movements for information only — not medical advice. Follow the protocol your surgeon or physical therapist gave you, start where they tell you to start, and stop if you feel sharp or increasing pain.';
