// Equipment dedup — now a thin shim over the shared taxonomy engine.
//
// Equipment was the first vocabulary we governed; muscle groups and tags now run
// the same rules, so the logic lives in lib/taxonomy and this file just keeps the
// equipment-shaped names that the equipment routes already import.

import {
  normalizeTerm,
  canonicalTerm,
  findTermDuplicate,
  levenshtein,
  type TermRef,
  type DuplicateResult,
} from './taxonomy';

export type EquipRef = TermRef;
export type { DuplicateResult };

export { levenshtein };

/** lowercase, strip punctuation, collapse whitespace. */
export const normalizeEquip = normalizeTerm;

/** Normalize, then fold a known equipment synonym ("DBs" → "dumbbell"). */
export function canonicalEquip(name: string): string {
  return canonicalTerm('equipment', name);
}

/** Find an existing piece of equipment the input is (probably) a duplicate of. */
export function findEquipDuplicate(name: string, existing: EquipRef[]): DuplicateResult {
  return findTermDuplicate('equipment', name, existing);
}
