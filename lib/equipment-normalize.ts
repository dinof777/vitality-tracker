// Equipment dedup engine. Keeps the catalog from sprawling: before a new piece
// is created we normalize it, fold known synonyms/abbreviations, and fuzzy-match
// against what already exists — so "DBs", "dumbells", "Dumbbell" all resolve to
// the one canonical Dumbbell instead of three rows.

export interface EquipRef {
  id: string;
  name: string;
  normalized: string;
}

// lowercase, strip punctuation, collapse whitespace.
export function normalizeEquip(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Common abbreviations / alternate names → the canonical normalized form.
export const EQUIP_SYNONYMS: Record<string, string> = {
  db: 'dumbbell',
  dbs: 'dumbbell',
  dumbbells: 'dumbbell',
  dumbell: 'dumbbell',
  dumbells: 'dumbbell',
  'free weight': 'dumbbell',
  'free weights': 'dumbbell',
  kb: 'kettlebell',
  kbs: 'kettlebell',
  kettlebells: 'kettlebell',
  kettleball: 'kettlebell',
  'kettle bell': 'kettlebell',
  bodyweight: 'calisthenics',
  'body weight': 'calisthenics',
  calisthenic: 'calisthenics',
  'no equipment': 'calisthenics',
  'resistance band': 'tube band',
  'resistance bands': 'tube band',
  'tube bands': 'tube band',
  band: 'tube band',
  bands: 'tube band',
  'mini band': 'loop band',
  'mini bands': 'loop band',
  'booty band': 'loop band',
  'glute band': 'loop band',
  'loop bands': 'loop band',
  'pullup bar': 'pull up bar',
  'pullup bars': 'pull up bar',
  'chin up bar': 'pull up bar',
  'med ball': 'medicine ball',
  'medicine balls': 'medicine ball',
  'slam ball': 'medicine ball',
  'wall ball': 'medicine ball',
  'jump ropes': 'jump rope',
  'skipping rope': 'jump rope',
  'speed rope': 'jump rope',
  jumprope: 'jump rope',
  stretching: 'stretch',
  mobility: 'stretch',
};

// Canonicalize: normalize, then fold a synonym if we know one.
export function canonicalEquip(name: string): string {
  const n = normalizeEquip(name);
  return EQUIP_SYNONYMS[n] ?? n;
}

// Levenshtein edit distance (small strings).
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export interface DuplicateResult {
  match: EquipRef | null;
  reason: 'synonym' | 'exact' | 'fuzzy' | null;
}

// Find an existing equipment that the input is (probably) a duplicate of.
export function findEquipDuplicate(name: string, existing: EquipRef[]): DuplicateResult {
  const norm = normalizeEquip(name);
  if (!norm) return { match: null, reason: null };
  const canon = EQUIP_SYNONYMS[norm] ?? norm;

  // Exact / synonym match.
  for (const e of existing) {
    if (e.normalized === norm) return { match: e, reason: 'exact' };
    if (e.normalized === canon && canon !== norm) return { match: e, reason: 'synonym' };
  }
  // Fuzzy — tighter threshold for short names so we don't over-merge.
  for (const e of existing) {
    const threshold = Math.min(norm.length, e.normalized.length) <= 5 ? 1 : 2;
    if (levenshtein(canon, e.normalized) <= threshold) return { match: e, reason: 'fuzzy' };
  }
  return { match: null, reason: null };
}
