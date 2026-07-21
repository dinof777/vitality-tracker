// Taxonomy engine — the one place a free-text vocabulary field gets governed.
//
// Every vocabulary a trainer can extend (muscle groups, tags, equipment) runs
// through here so none of them can sprawl. The rules are the same for all three:
//
//   1. NORMALIZE   — "  Quads! " and "quads" are the same string.
//   2. FOLD        — known synonyms/abbreviations collapse ("abs" → "Core").
//   3. FUZZY MATCH — a typo ("hamstrigs") resolves to the existing term rather
//                    than creating a near-duplicate.
//   4. TIER        — canon (curated, global) / proposed (this gym now, pending
//                    globally) / local (an alias — never leaves the gym).
//
// Trainers are never blocked: anything they add works for their gym instantly.
// Only PROMOTION to the shared vocabulary is gated, and promotion is driven by
// how many independent gyms proposed the same thing — so review stays small.
//
// This generalizes the pattern equipment already used; lib/equipment-normalize
// is now a thin shim over it.

export type TermKind = 'muscle_group' | 'tag' | 'equipment';

export type TermStatus = 'core' | 'approved' | 'pending' | 'rejected' | 'merged';

export interface TermRef {
  id: string;
  name: string;
  normalized: string;
}

/** lowercase, strip punctuation, collapse whitespace. */
export function normalizeTerm(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * The tag id for a term: its normalized form, dash-joined.
 *
 * The seeded core tags carry a `normalized` chosen to round-trip to their
 * registry id in lib/tags — 'knee pt' → 'knee-pt', 'stage 1' → 'stage-1' — so a
 * tag means the same thing whether it came from the registry or the taxonomy.
 * Derive it from `normalized`, never from the display name ('Stage 1 · Early'
 * would give 'stage-1-early').
 */
export function termSlug(normalized: string): string {
  return normalized.replace(/ /g, '-');
}

// ── Synonyms, per kind ───────────────────────────────────────────────────────
// Maps a normalized input to the normalized form of the term it should fold into.

const EQUIPMENT_SYNONYMS: Record<string, string> = {
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

// The anatomy vocabulary trainers actually type. Folds gym slang and the
// plural/singular pairs that would otherwise become their own filter chips.
const MUSCLE_GROUP_SYNONYMS: Record<string, string> = {
  // Core
  abs: 'core',
  ab: 'core',
  abdominals: 'core',
  abdominal: 'core',
  obliques: 'core',
  oblique: 'core',
  stomach: 'core',
  midsection: 'core',
  trunk: 'core',
  // Quads
  quad: 'quads',
  quadricep: 'quads',
  quadriceps: 'quads',
  thigh: 'quads',
  thighs: 'quads',
  // Hamstrings
  ham: 'hamstrings',
  hams: 'hamstrings',
  hammies: 'hamstrings',
  hamstring: 'hamstrings',
  // Glutes
  glute: 'glutes',
  gluteus: 'glutes',
  butt: 'glutes',
  booty: 'glutes',
  buttocks: 'glutes',
  // Shoulders
  delt: 'shoulders',
  delts: 'shoulders',
  deltoid: 'shoulders',
  deltoids: 'shoulders',
  shoulder: 'shoulders',
  // Rear delts
  'rear delt': 'rear delts',
  'rear deltoid': 'rear delts',
  'rear deltoids': 'rear delts',
  'posterior delt': 'rear delts',
  'posterior delts': 'rear delts',
  'reardelts': 'rear delts',
  // Back
  lat: 'back',
  lats: 'back',
  latissimus: 'back',
  'upper back': 'back',
  'mid back': 'back',
  'middle back': 'back',
  // Arms
  arm: 'arms',
  bicep: 'arms',
  biceps: 'arms',
  tricep: 'arms',
  triceps: 'arms',
  forearm: 'arms',
  forearms: 'arms',
  // Chest
  pec: 'chest',
  pecs: 'chest',
  pectoral: 'chest',
  pectorals: 'chest',
  // Calves
  calf: 'calves',
  // Legs
  'lower body': 'legs',
  leg: 'legs',
  // Full body
  'total body': 'full body',
  'whole body': 'full body',
  'full boddy': 'full body',
  // Conditioning
  cardio: 'conditioning',
  endurance: 'conditioning',
  metcon: 'conditioning',
  // Traps
  trap: 'traps',
  trapezius: 'traps',
  // Spine
  thoracic: 't spine',
  'thoracic spine': 't spine',
  // Hip flexors
  'hip flexor': 'hip flexors',
  psoas: 'hip flexors',
  hip: 'hips',
};

const TAG_SYNONYMS: Record<string, string> = {
  rehab: 'knee pt',
  'knee rehab': 'knee pt',
  'range of motion': 'mobility',
  rom: 'mobility',
  flexibility: 'mobility',
  'balance work': 'balance',
  isometrics: 'isometric',
  hold: 'isometric',
  stretches: 'stretch',
  stretching: 'stretch',
  'non weight bearing': 'seated lying',
};

const SYNONYMS: Record<TermKind, Record<string, string>> = {
  equipment: EQUIPMENT_SYNONYMS,
  muscle_group: MUSCLE_GROUP_SYNONYMS,
  tag: TAG_SYNONYMS,
};

/** Normalize, then fold a known synonym for that kind. */
export function canonicalTerm(kind: TermKind, name: string): string {
  const n = normalizeTerm(name);
  return SYNONYMS[kind][n] ?? n;
}

// ── Fuzzy matching ───────────────────────────────────────────────────────────

/** Levenshtein edit distance (small strings). */
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
  match: TermRef | null;
  reason: 'synonym' | 'exact' | 'fuzzy' | null;
}

/**
 * Find the existing term an input is (probably) a duplicate of.
 * Exact and synonym matches are certain; fuzzy is a typo catch, with a tighter
 * threshold on short names so genuinely-distinct short terms don't over-merge.
 */
export function findTermDuplicate(kind: TermKind, name: string, existing: TermRef[]): DuplicateResult {
  const norm = normalizeTerm(name);
  if (!norm) return { match: null, reason: null };
  const canon = SYNONYMS[kind][norm] ?? norm;

  for (const e of existing) {
    if (e.normalized === norm) return { match: e, reason: 'exact' };
    if (e.normalized === canon && canon !== norm) return { match: e, reason: 'synonym' };
  }
  for (const e of existing) {
    const threshold = Math.min(norm.length, e.normalized.length) <= 5 ? 1 : 2;
    if (levenshtein(canon, e.normalized) <= threshold) return { match: e, reason: 'fuzzy' };
  }
  return { match: null, reason: null };
}

/** Human-readable explanation of why an add was blocked, for the 409 body. */
export function duplicateMessage(reason: DuplicateResult['reason'], matchName: string): string {
  if (reason === 'exact') return `“${matchName}” already exists.`;
  if (reason === 'synonym') return `We already call that “${matchName}”.`;
  return `Did you mean “${matchName}”?`;
}

// ── Canon ────────────────────────────────────────────────────────────────────

/**
 * The curated muscle groups — every value in use across the shipped library
 * (see SAMPLE_EXERCISES). Seeded as `core`; what the picker offers first.
 */
export const CANON_MUSCLE_GROUPS = [
  'Arms',
  'Back',
  'Calves',
  'Chest',
  'Conditioning',
  'Core',
  'Full Body',
  'Glutes',
  'Grip',
  'Hamstrings',
  'Hip Flexors',
  'Hips',
  'Legs',
  'Quads',
  'Rear Delts',
  'Shoulders',
  'Spine',
  'T-Spine',
  'Traps',
] as const;

// ── Governance limits ────────────────────────────────────────────────────────

/**
 * How many independent gyms must propose the same term before it auto-promotes
 * into the shared vocabulary. Real signal that the canon has a gap — as opposed
 * to one gym's local naming — and it keeps the review queue to the handful of
 * terms that actually matter.
 */
export const PROMOTION_THRESHOLD = 3;

/**
 * Per-gym ceiling on custom terms of one kind. Far above what any real gym
 * needs; it exists so a runaway import can't fill the table.
 */
export const MAX_CUSTOM_TERMS_PER_TENANT = 25;

/** Longest a term name may be. */
export const MAX_TERM_LENGTH = 40;
