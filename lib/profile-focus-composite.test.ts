import { describe, it, expect } from 'vitest';
import {
  focusChoice,
  resolveFocus,
  regionFocus,
  parseFocusValue,
  isPillarToken,
  focusPillarNodes,
  focusGroupNodes,
  focusPillarToken,
  FOCUS_CHOICES,
  FOCUS_MUSCLE_GROUPS,
  REHAB_AREA_FOCUSES,
  MUSCLE_GROUP_FOCUSES,
  type DrillDownNode,
} from './profile';

// Regression + new coverage for the pillar-first focus picker's composite
// grammar (<pillarToken>[:<groupSlug>[:<deepSlug>]]). See BuilderControls'
// sheet === 'focus' and lib/workout-generator's relaxation ladder.

describe('parseFocusValue', () => {
  it('returns null for any colon-free value — this is the legacy short-circuit', () => {
    expect(parseFocusValue('full')).toBeNull();
    expect(parseFocusValue('quads')).toBeNull();
    expect(parseFocusValue('knee')).toBeNull();
    expect(parseFocusValue('region-legs')).toBeNull();
  });

  it('splits pillar/group/deep on ":"', () => {
    expect(parseFocusValue('strength:legs:quads')).toEqual({
      pillarToken: 'strength',
      groupSlug: 'legs',
      deepSlug: 'quads',
    });
    expect(parseFocusValue('strength:legs')).toEqual({ pillarToken: 'strength', groupSlug: 'legs' });
  });
});

describe('isPillarToken', () => {
  it('accepts exactly the 5 pillar tokens', () => {
    for (const t of ['strength', 'cardio', 'balance', 'flexibility', 'physical-therapy']) {
      expect(isPillarToken(t)).toBe(true);
    }
  });

  it('rejects whole-session presets and foreign values', () => {
    expect(isPillarToken('full')).toBe(false);
    expect(isPillarToken('balanced')).toBe(false); // not to be confused with the 'balance' pillar
    expect(isPillarToken('mobility')).toBe(false);
    expect(isPillarToken('nonsense')).toBe(false);
  });
});

describe('composite round-trip — training pillar (3 tiers)', () => {
  it('tier 1: bare pillar resolves to the SPECIAL_FOCUSES entry itself', () => {
    const fc = focusChoice('strength');
    expect(fc.value).toBe('strength');
    expect(fc.pillars).toEqual(['strength']);
    expect(fc.groups).toBeNull();
  });

  it('tier 2: pillar:group resolves to the parent-inclusive muscle set AND the pillar', () => {
    const fc = focusChoice('strength:legs');
    expect(fc.value).toBe('strength:legs');
    expect(fc.pillars).toEqual(['strength']);
    expect(fc.groups).toEqual(['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Hips']);
  });

  it('tier 3: pillar:group:deep resolves to just the one muscle AND the pillar', () => {
    const fc = focusChoice('strength:legs:quads');
    expect(fc.value).toBe('strength:legs:quads');
    expect(fc.pillars).toEqual(['strength']);
    expect(fc.groups).toEqual(['Quads']);
  });

  it("Back's parent-inclusive set includes Spine (PT-confirmed low-back mapping depends on this)", () => {
    const fc = focusChoice('strength:back');
    expect(fc.groups).toEqual(expect.arrayContaining(['Back', 'Traps', 'Spine', 'T-Spine']));
  });
});

describe('composite round-trip — physical-therapy (3 tiers)', () => {
  it('tier 1: bare physical-therapy is unchanged — the existing umbrella', () => {
    const fc = focusChoice('physical-therapy');
    expect(fc).toBe(FOCUS_CHOICES.find((f) => f.value === 'physical-therapy'));
  });

  it('tier 2: physical-therapy:legs ORs in every area mapped to Legs (knee/hip/ankle)', () => {
    const fc = focusChoice('physical-therapy:legs');
    expect(fc.value).toBe('physical-therapy:legs');
    expect(fc.tags).toEqual(['physical-therapy']);
    expect(fc.areaTags?.sort()).toEqual(['ankle', 'hip', 'knee'].sort());
  });

  it('tier 2: physical-therapy:back ORs in low-back + upper-back (PT-confirmed mapping)', () => {
    const fc = focusChoice('physical-therapy:back');
    expect(fc.areaTags?.sort()).toEqual(['low-back', 'upper-back'].sort());
  });

  it('tier 3: physical-therapy:legs:knee narrows to just the knee area — same shape as the legacy "knee" focus', () => {
    const fc = focusChoice('physical-therapy:legs:knee');
    const legacyKnee = REHAB_AREA_FOCUSES.find((f) => f.value === 'knee')!;
    expect(fc.tags).toEqual(['physical-therapy']);
    expect(fc.areaTags).toEqual(['knee']);
    expect(fc.byStage).toBe(legacyKnee.byStage);
  });

  it('a PT group with no mapped area (Chest) is a leaf: areaTags is empty, not missing/undefined-crashing', () => {
    const fc = focusChoice('physical-therapy:chest');
    expect(fc.tags).toEqual(['physical-therapy']);
    expect(fc.areaTags).toEqual([]);
  });
});

describe('malformed / stale composite values degrade one level, never throw', () => {
  it('unknown group slug degrades to the bare pillar', () => {
    const fc = focusChoice('strength:not-a-real-group');
    expect(fc.value).toBe('strength');
    expect(fc).toBe(FOCUS_CHOICES.find((f) => f.value === 'strength'));
  });

  it('unknown deep slug degrades to the group level, not all the way to bare pillar', () => {
    const fc = focusChoice('strength:legs:not-a-real-muscle');
    expect(fc.value).toBe('strength:legs');
    expect(fc.groups).toContain('Quads');
  });

  it('unknown deep slug under PT degrades to the group level', () => {
    const fc = focusChoice('physical-therapy:legs:not-a-real-joint');
    expect(fc.value).toBe('physical-therapy:legs');
  });

  it('a foreign (non-pillar) token before the colon falls through to the plain FOCUS_CHOICES lookup, never crashes', () => {
    expect(() => focusChoice('not-a-pillar:legs')).not.toThrow();
    expect(focusChoice('not-a-pillar:legs')).toBe(FOCUS_CHOICES[0]); // unmatched value → default fallback
  });
});

describe('legacy focus values are colon-free and resolve byte-identically (same object reference)', () => {
  const LEGACY_VALUES = ['full', 'balanced', 'cardio', 'physical-therapy', 'knee', 'mobility', 'chest'];

  it.each(LEGACY_VALUES)('%s has no colon, so the composite parser never engages', (v) => {
    expect(v.includes(':')).toBe(false);
    expect(focusChoice(v)).toBe(FOCUS_CHOICES.find((f) => f.value === v));
  });

  it('quads (a generated MUSCLE_GROUP_FOCUSES value) is unaffected', () => {
    expect(focusChoice('quads')).toBe(MUSCLE_GROUP_FOCUSES.find((f) => f.value === 'quads'));
  });

  it('an admin-managed region (region-legs) is colon-free too, so resolveFocus is unaffected', () => {
    const region = regionFocus({ region: 'Legs', groups: ['Legs', 'Quads', 'Hamstrings'] });
    expect(region.value.includes(':')).toBe(false);
    expect(resolveFocus(region.value, [region])).toBe(region);
  });
});

describe('focusPillarNodes — step 1', () => {
  const nodes = focusPillarNodes();

  it('is exactly Full Body, Balanced, and the 5 pillar tiles, flat (no children)', () => {
    expect(nodes.map((n) => n.value)).toEqual([
      'full',
      'balanced',
      'strength',
      'cardio',
      'balance',
      'flexibility',
      'physical-therapy',
    ]);
    expect(nodes.every((n) => n.children === undefined)).toBe(true);
  });
});

describe('focusGroupNodes — step 2/3', () => {
  it('a training pillar (strength) has one tile per FOCUS_MUSCLE_GROUPS group, children = muscles', () => {
    const nodes = focusGroupNodes('strength');
    expect(nodes.map((n) => n.label)).toEqual(FOCUS_MUSCLE_GROUPS.map((g) => g.group));
    const legs = nodes.find((n) => n.label === 'Legs')!;
    expect(legs.value).toBe('strength:legs');
    expect(legs.children?.map((c) => c.value)).toEqual([
      'strength:legs:quads',
      'strength:legs:hamstrings',
      'strength:legs:glutes',
      'strength:legs:calves',
      'strength:legs:hip-flexors',
      'strength:legs:hips',
    ]);
  });

  it('Chest has no muscles to drill into under a training pillar — a leaf', () => {
    const nodes = focusGroupNodes('strength');
    const chest = nodes.find((n) => n.label === 'Chest')!;
    expect(chest.children).toBeUndefined();
  });

  it('physical-therapy group tiles drill to AREA_TO_GROUP joints, not muscles', () => {
    const nodes = focusGroupNodes('physical-therapy');
    const legs = nodes.find((n) => n.label === 'Legs')! as DrillDownNode;
    expect(legs.children?.map((c) => c.value).sort()).toEqual(
      ['physical-therapy:legs:knee', 'physical-therapy:legs:hip', 'physical-therapy:legs:ankle'].sort(),
    );
    const back = nodes.find((n) => n.label === 'Back')!;
    expect(back.children?.map((c) => c.value).sort()).toEqual(
      ['physical-therapy:back:low-back', 'physical-therapy:back:upper-back'].sort(),
    );
  });

  it('Chest/Core/Arms have no mapped rehab area — leaf under PT (correct, not a bug)', () => {
    const nodes = focusGroupNodes('physical-therapy');
    for (const label of ['Chest', 'Core', 'Arms']) {
      const node = nodes.find((n) => n.label === label)!;
      expect(node.children).toBeUndefined();
    }
  });
});

describe('focusPillarToken — reopen-state', () => {
  it('a 3-tier composite value returns its pillar token', () => {
    expect(focusPillarToken('strength:legs:quads', [])).toBe('strength');
  });

  it('a bare pillar value returns itself', () => {
    expect(focusPillarToken('physical-therapy', [])).toBe('physical-therapy');
  });

  it('full/balanced return themselves (step 1, not a pillar)', () => {
    expect(focusPillarToken('full', [])).toBe('full');
    expect(focusPillarToken('balanced', [])).toBe('balanced');
  });

  it('a legacy bare muscle-group slug, region, bare rehab-area, or mobility falls back to full', () => {
    for (const v of ['quads', 'chest', 'knee', 'mobility', 'not-a-real-focus']) {
      expect(focusPillarToken(v, [])).toBe('full');
    }
    const region = regionFocus({ region: 'Legs', groups: ['Legs', 'Quads'] });
    expect(focusPillarToken(region.value, [region])).toBe('full');
  });
});
