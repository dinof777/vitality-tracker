import { describe, it, expect } from 'vitest';
import { SAMPLE_EXERCISES } from './exercises';
import { MOVEMENT_FAMILIES } from './movement-families';
import { TAG_BY_ID, STAGE_ORDER, filterExercises, filterByFacets, groupByTag, usedTags, hasTag } from './tags';

const rehab = SAMPLE_EXERCISES.filter((e) => hasTag(e, 'physical-therapy'));

describe('exercise tags', () => {
  it('every tag used in the library exists in the registry (catches typos)', () => {
    for (const ex of SAMPLE_EXERCISES) {
      for (const t of ex.tags ?? []) {
        expect(TAG_BY_ID[t], `"${ex.name}" uses unknown tag "${t}"`).toBeDefined();
      }
    }
  });

  it('no duplicate exercise names or ids', () => {
    const names = SAMPLE_EXERCISES.map((e) => e.name);
    const ids = SAMPLE_EXERCISES.map((e) => e.id);
    expect(new Set(names).size, 'duplicate exercise name').toBe(names.length);
    expect(new Set(ids).size, 'duplicate exercise id').toBe(ids.length);
  });

  it('physical-therapy has a meaningful set of movements', () => {
    expect(rehab.length).toBeGreaterThanOrEqual(30);
  });

  it('every rehab movement is assigned at least one recovery stage', () => {
    // Was "exactly one" until the hip/low-back/upper-back expansion introduced
    // deliberate cross-tags: a move like Banded Clamshell now legitimately
    // carries stage-1 (hip) AND stage-2 (knee) at once — "dual stage expected"
    // per the PT spec, since the same movement sits at a different point in
    // each area's own recovery arc. The real invariant is just "not zero".
    for (const ex of rehab) {
      const stages = (ex.tags ?? []).filter((t) => (STAGE_ORDER as readonly string[]).includes(t));
      expect(stages.length, `"${ex.name}" should have at least one stage, got [${stages}]`).toBeGreaterThanOrEqual(1);
    }
  });

  it('all three recovery stages are populated', () => {
    for (const stage of STAGE_ORDER) {
      const inStage = rehab.filter((e) => hasTag(e, stage));
      expect(inStage.length, `${stage} is empty`).toBeGreaterThanOrEqual(4);
    }
  });

  it('covers both regaining the bend and regaining full extension', () => {
    expect(rehab.filter((e) => hasTag(e, 'knee-flexion')).length).toBeGreaterThanOrEqual(4);
    expect(rehab.filter((e) => hasTag(e, 'knee-extension')).length).toBeGreaterThanOrEqual(4);
    expect(rehab.filter((e) => hasTag(e, 'stretch')).length).toBeGreaterThanOrEqual(3);
  });

  it('knee early stage stays off the feet; later stages load the leg', () => {
    // Knee-specific: stage-1 knee work is off the feet. Not true across all
    // areas (shoulder stage-1 is standing), so scope to the knee area.
    // Excludes exercises that are ALSO cross-tagged to another area (e.g.
    // Glute Bridge Hold: knee/stage-2 + hip/stage-1) — there the co-occurring
    // stage-1 belongs to the OTHER area, not to knee, so it isn't a knee
    // stage-1 movement for the purpose of this "off the feet" check.
    const otherAreas = ['shoulder', 'ankle', 'hip', 'low-back', 'upper-back'];
    const kneeEarly = SAMPLE_EXERCISES.filter(
      (e) => hasTag(e, 'knee') && hasTag(e, 'stage-1') && !otherAreas.some((a) => hasTag(e, a)),
    );
    expect(kneeEarly.length).toBeGreaterThan(0);
    expect(kneeEarly.every((e) => hasTag(e, 'seated-lying')), 'knee stage-1 should be seated/lying').toBe(true);
    expect(rehab.filter((e) => hasTag(e, 'weight-bearing')).length).toBeGreaterThanOrEqual(6);
  });

  it('excludes kneeling movements (not appropriate on a replaced knee)', () => {
    const knee = SAMPLE_EXERCISES.filter((e) => hasTag(e, 'knee'));
    expect(knee.some((e) => /kneel/i.test(e.name))).toBe(false);
  });

  it('offers more than one equipment option', () => {
    const equip = new Set(rehab.map((e) => e.equipment));
    expect(equip.size).toBeGreaterThanOrEqual(3);
  });

  it('filterExercises combines tags, equipment and muscle group', () => {
    const seatedEarly = filterExercises(SAMPLE_EXERCISES, { allTags: ['physical-therapy', 'stage-1'] });
    expect(seatedEarly.length).toBeGreaterThan(0);
    expect(seatedEarly.every((e) => hasTag(e, 'stage-1'))).toBe(true);

    const stretches = filterExercises(SAMPLE_EXERCISES, { allTags: ['physical-therapy'], equipment: ['stretch'] });
    expect(stretches.every((e) => e.equipment === 'stretch')).toBe(true);

    const byName = filterExercises(SAMPLE_EXERCISES, { search: 'heel slide' });
    expect(byName.map((e) => e.name)).toContain('Heel Slide');
  });

  it('groups a program by stage in progression order', () => {
    const groups = groupByTag(rehab, 'stage');
    expect(groups.map((g) => g.tag.id)).toEqual([...STAGE_ORDER]);
  });

  it('usedTags only returns tags actually in use', () => {
    const goals = usedTags(SAMPLE_EXERCISES, 'goal').map((t) => t.id);
    expect(goals).toContain('physical-therapy');
  });
});

describe('filterByFacets — OR within a group, AND across groups', () => {
  const flexion = rehab.filter((e) => hasTag(e, 'knee-flexion'));
  const extension = rehab.filter((e) => hasTag(e, 'knee-extension'));

  it('picking two tags in the SAME group widens the list (union, not intersection)', () => {
    const both = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-flexion', 'knee-extension'] });
    // The old bug: every() required BOTH tags, so this shrank toward zero.
    expect(both.length).toBeGreaterThanOrEqual(Math.max(flexion.length, extension.length));
    const names = new Set(both.map((e) => e.name));
    for (const e of [...flexion, ...extension]) {
      expect(names, `"${e.name}" should survive an OR of its own group`).toContain(e.name);
    }
  });

  it('adding a tag to a group never removes results already in that group', () => {
    const only = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-flexion'] });
    const widened = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-flexion', 'knee-extension'] });
    expect(widened.length).toBeGreaterThanOrEqual(only.length);
  });

  it('tags in DIFFERENT groups narrow the list (intersection)', () => {
    const goalOnly = filterByFacets(SAMPLE_EXERCISES, { tags: ['physical-therapy'] });
    const goalAndStage = filterByFacets(SAMPLE_EXERCISES, { tags: ['physical-therapy', 'stage-1'] });
    expect(goalAndStage.length).toBeLessThan(goalOnly.length);
    expect(goalAndStage.every((e) => hasTag(e, 'physical-therapy') && hasTag(e, 'stage-1'))).toBe(true);
  });

  it('combines an in-group OR with a cross-group AND', () => {
    const res = filterByFacets(SAMPLE_EXERCISES, { tags: ['physical-therapy', 'stage-2', 'stage-3'] });
    expect(res.length).toBeGreaterThan(0);
    // every result: physical-therapy AND (stage-2 OR stage-3)
    expect(res.every((e) => hasTag(e, 'physical-therapy') && (hasTag(e, 'stage-2') || hasTag(e, 'stage-3')))).toBe(true);
    expect(res.some((e) => hasTag(e, 'stage-2'))).toBe(true);
    expect(res.some((e) => hasTag(e, 'stage-3'))).toBe(true);
  });

  it('equipment is its own OR facet, AND-ed with tags', () => {
    const res = filterByFacets(SAMPLE_EXERCISES, { tags: ['physical-therapy'], equipment: ['stretch', 'tube_band'] });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((e) => hasTag(e, 'physical-therapy') && ['stretch', 'tube_band'].includes(e.equipment ?? ''))).toBe(true);
  });

  it('search AND-s with the rest', () => {
    const res = filterByFacets(SAMPLE_EXERCISES, { tags: ['physical-therapy'], search: 'heel' });
    expect(res.every((e) => hasTag(e, 'physical-therapy') && /heel/i.test(e.name))).toBe(true);
    expect(res.map((e) => e.name)).toContain('Heel Slide');
  });

  it('no facets selected returns everything', () => {
    expect(filterByFacets(SAMPLE_EXERCISES, {}).length).toBe(SAMPLE_EXERCISES.length);
  });
});

describe('movement families', () => {
  const names = new Set(SAMPLE_EXERCISES.map((e) => e.name));

  it('every family key matches a real exercise (catches typos)', () => {
    for (const key of Object.keys(MOVEMENT_FAMILIES)) {
      expect(names, `"${key}" is not an exercise in the library`).toContain(key);
    }
  });

  it('every family has at least two members (otherwise grouping is pointless)', () => {
    const counts: Record<string, number> = {};
    for (const { family } of Object.values(MOVEMENT_FAMILIES)) counts[family] = (counts[family] ?? 0) + 1;
    for (const [family, n] of Object.entries(counts)) {
      expect(n, `family "${family}" has only ${n} member`).toBeGreaterThanOrEqual(2);
    }
  });

  it('variants are unique within a family', () => {
    const seen: Record<string, Set<string>> = {};
    for (const { family, variant } of Object.values(MOVEMENT_FAMILIES)) {
      seen[family] ??= new Set();
      expect(seen[family], `"${family}" has duplicate variant "${variant}"`).not.toContain(variant);
      seen[family].add(variant);
    }
  });

  it('groups the squat family the user flagged, incl. both hold variants', () => {
    const squat = Object.entries(MOVEMENT_FAMILIES).filter(([, v]) => v.family === 'Squat');
    const byName = Object.fromEntries(squat);
    expect(byName['Bodyweight Squat'].variant).toBe('Bodyweight');
    expect(byName['Isometric Squat Hold'].variant).toBe('Isometric hold');
    expect(squat.length).toBeGreaterThanOrEqual(10);
  });
});

describe('muscle group facet', () => {
  it('ORs within the group and ANDs with the rest', () => {
    const quads = filterByFacets(SAMPLE_EXERCISES, { muscleGroups: ['Quads'] });
    const both = filterByFacets(SAMPLE_EXERCISES, { muscleGroups: ['Quads', 'Glutes'] });
    expect(both.length).toBeGreaterThan(quads.length); // same group → widens
    expect(both.every((e) => ['Quads', 'Glutes'].includes(e.muscle_group ?? ''))).toBe(true);

    // Cross-facet narrows: 'Legs' has plenty of non-rehab movements.
    const legs = filterByFacets(SAMPLE_EXERCISES, { muscleGroups: ['Legs'] });
    const kneeLegs = filterByFacets(SAMPLE_EXERCISES, { tags: ['physical-therapy'], muscleGroups: ['Legs'] });
    expect(kneeLegs.length).toBeGreaterThan(0);
    expect(kneeLegs.length).toBeLessThan(legs.length);
    expect(kneeLegs.every((e) => hasTag(e, 'physical-therapy') && e.muscle_group === 'Legs')).toBe(true);
  });
});
