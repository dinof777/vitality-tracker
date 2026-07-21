import { levenshtein, normalizeTerm } from './taxonomy';

// Exercise-name near-duplicate detection.
//
// Names get DIFFERENT treatment from the vocabulary fields: two gyms genuinely
// do run different movements under similar names, so a match here never blocks a
// save. It exists to offer the better option — rename the library move for your
// gym (exercise_aliases) instead of forking it.
//
// Forking matters more than muscle-group sprawl: a forked move gets its own id,
// so its log_entries history splits from the original and progressive overload
// silently loses the past.

const EQUIPMENT_PREFIXES = new Set([
  'db',
  'dbs',
  'dumbbell',
  'dumbbells',
  'kb',
  'kettlebell',
  'band',
  'banded',
  'tube',
  'loop',
  'mini',
  'bw',
  'bodyweight',
  'body',
  'weighted',
  'med',
  'medicine',
  'ball',
  'cable',
  'machine',
  'barbell',
  'bb',
]);

/**
 * Normalize a name down to the movement itself, dropping the equipment prefix
 * that makes "DB Goblet Squat" and "Goblet Squat" look like different moves.
 * Only leading tokens are stripped, and never all of them.
 */
export function movementKey(name: string): string {
  const tokens = normalizeTerm(name).split(' ').filter(Boolean);
  let i = 0;
  while (i < tokens.length - 1 && EQUIPMENT_PREFIXES.has(tokens[i])) i++;
  return tokens.slice(i).join(' ');
}

export interface NamedExercise {
  id: string;
  name: string;
}

export interface SimilarResult {
  match: NamedExercise | null;
  reason: 'exact' | 'variant' | 'typo' | null;
}

/**
 * Find the library move a proposed name is probably a duplicate of.
 *
 *   exact   — the same movement once the equipment prefix is dropped
 *   variant — one name's words fully contain the other's ("Split Squat" inside
 *             "Bulgarian Split Squat"); needs 2+ words so "Squat" doesn't match
 *             every squat in the library
 *   typo    — within two edits
 */
export function findSimilarExercise(name: string, library: NamedExercise[]): SimilarResult {
  const key = movementKey(name);
  if (!key) return { match: null, reason: null };
  const words = key.split(' ');

  let variant: NamedExercise | null = null;
  let typo: NamedExercise | null = null;

  for (const ex of library) {
    const exKey = movementKey(ex.name);
    if (!exKey) continue;
    if (exKey === key) return { match: ex, reason: 'exact' };

    const exWords = exKey.split(' ');
    const [short, long] = words.length <= exWords.length ? [words, exWords] : [exWords, words];
    if (!variant && short.length >= 2 && short.every((w) => long.includes(w))) variant = ex;
    if (!typo && levenshtein(key, exKey) <= 2) typo = ex;
  }

  if (variant) return { match: variant, reason: 'variant' };
  if (typo) return { match: typo, reason: 'typo' };
  return { match: null, reason: null };
}
