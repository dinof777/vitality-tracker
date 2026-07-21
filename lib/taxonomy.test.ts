import { describe, it, expect } from 'vitest';
import {
  normalizeTerm,
  canonicalTerm,
  findTermDuplicate,
  termSlug,
  promotionThreshold,
  PROMOTION_FLOOR,
  PROMOTION_FRACTION,
  CANON_MUSCLE_GROUPS,
  type TermRef,
} from './taxonomy';
import { TAGS } from './tags';

const MUSCLES: TermRef[] = CANON_MUSCLE_GROUPS.map((name, i) => ({
  id: String(i),
  name,
  normalized: normalizeTerm(name),
}));

describe('normalizeTerm', () => {
  it('lowercases, strips punctuation, collapses spaces', () => {
    expect(normalizeTerm('  Rear-Delts! ')).toBe('rear delts');
    expect(normalizeTerm('T-Spine')).toBe('t spine');
  });
});

describe('canonicalTerm', () => {
  it('folds gym slang to the canon muscle group', () => {
    expect(canonicalTerm('muscle_group', 'abs')).toBe('core');
    expect(canonicalTerm('muscle_group', 'Quadriceps')).toBe('quads');
    expect(canonicalTerm('muscle_group', 'lats')).toBe('back');
    expect(canonicalTerm('muscle_group', 'Delts')).toBe('shoulders');
  });

  it('keeps synonym sets per-kind — "mobility" means different things', () => {
    expect(canonicalTerm('equipment', 'mobility')).toBe('stretch');
    expect(canonicalTerm('muscle_group', 'mobility')).toBe('mobility');
  });
});

describe('findTermDuplicate — muscle groups', () => {
  it('folds synonyms into the existing canon term', () => {
    expect(findTermDuplicate('muscle_group', 'Abs', MUSCLES).match?.name).toBe('Core');
    expect(findTermDuplicate('muscle_group', 'hammies', MUSCLES).match?.name).toBe('Hamstrings');
    expect(findTermDuplicate('muscle_group', 'Booty', MUSCLES).match?.name).toBe('Glutes');
  });

  it('catches casing and plural noise as exact/synonym, not new terms', () => {
    expect(findTermDuplicate('muscle_group', 'GLUTES', MUSCLES).reason).toBe('exact');
    expect(findTermDuplicate('muscle_group', '  legs  ', MUSCLES).reason).toBe('exact');
    expect(findTermDuplicate('muscle_group', 'Calf', MUSCLES).match?.name).toBe('Calves');
  });

  it('catches typos', () => {
    expect(findTermDuplicate('muscle_group', 'hamstrigs', MUSCLES).match?.name).toBe('Hamstrings');
    expect(findTermDuplicate('muscle_group', 'shoulderz', MUSCLES).match?.name).toBe('Shoulders');
  });

  it('lets a genuinely new muscle group through', () => {
    expect(findTermDuplicate('muscle_group', 'Lower Back', MUSCLES).match).toBeNull();
    expect(findTermDuplicate('muscle_group', 'Neck', MUSCLES).match).toBeNull();
    expect(findTermDuplicate('muscle_group', 'Rotator Cuff', MUSCLES).match).toBeNull();
  });

  it('does not over-merge distinct short canon terms', () => {
    // The canon has to be internally stable: no term may collide with another.
    for (const term of MUSCLES) {
      const others = MUSCLES.filter((m) => m.id !== term.id);
      expect(findTermDuplicate('muscle_group', term.name, others).match).toBeNull();
    }
  });
});

describe('promotionThreshold', () => {
  // Replaces the old flat PROMOTION_THRESHOLD = 3: a floor that carries the
  // "is this even signal" job while the platform is small, handing off to a
  // fraction once a fixed count would become a rounding error. These cases
  // document exactly where that handoff happens.
  it('at today\'s platform size, behaves exactly like the old flat constant — unanimity', () => {
    expect(promotionThreshold(3)).toBe(3);
  });

  it('the floor still dominates all the way to 30 tenants', () => {
    expect(promotionThreshold(30)).toBe(3);
  });

  it('the fraction takes over one tenant later, at 31', () => {
    expect(promotionThreshold(31)).toBe(4);
  });

  it('scales as a flat 10% once well past the floor', () => {
    expect(promotionThreshold(100)).toBe(10);
  });

  it('never drops below the floor for degenerate/empty platforms', () => {
    expect(promotionThreshold(0)).toBe(PROMOTION_FLOOR);
    expect(promotionThreshold(1)).toBe(PROMOTION_FLOOR);
  });

  it('clamps negative tenant counts instead of going negative or throwing', () => {
    // A live `count(*)` can never actually be negative, but the function
    // shouldn't silently misbehave (e.g. return a threshold of 0, which
    // would auto-promote anything with zero adopters) if it ever were.
    expect(promotionThreshold(-5)).toBe(PROMOTION_FLOOR);
  });

  it('derives from the exported PROMOTION_FLOOR / PROMOTION_FRACTION constants, not inline magic numbers', () => {
    const n = 250;
    expect(promotionThreshold(n)).toBe(Math.max(PROMOTION_FLOOR, Math.ceil(PROMOTION_FRACTION * n)));
  });
});

describe('termSlug', () => {
  it('round-trips the seeded core tags back to their registry ids', () => {
    // The seed normalizes 'Stage 1 · Early' to 'stage 1' precisely so this holds;
    // deriving from the display name would give 'stage-1-early'.
    for (const { id } of TAGS) {
      expect(termSlug(normalizeTerm(id))).toBe(id);
    }
  });
});
