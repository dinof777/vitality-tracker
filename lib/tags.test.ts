import { describe, it, expect } from 'vitest';
import { SAMPLE_EXERCISES } from './exercises';
import { MOVEMENT_FAMILIES } from './movement-families';
import { TAG_BY_ID, STAGE_ORDER, filterExercises, filterByFacets, groupByTag, usedTags, hasTag } from './tags';

const kneePt = SAMPLE_EXERCISES.filter((e) => hasTag(e, 'knee-pt'));

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

  it('knee-pt has a meaningful set of movements', () => {
    expect(kneePt.length).toBeGreaterThanOrEqual(30);
  });

  it('every knee-pt movement is assigned exactly one recovery stage', () => {
    for (const ex of kneePt) {
      const stages = (ex.tags ?? []).filter((t) => (STAGE_ORDER as readonly string[]).includes(t));
      expect(stages.length, `"${ex.name}" should have exactly one stage, got [${stages}]`).toBe(1);
    }
  });

  it('all three recovery stages are populated', () => {
    for (const stage of STAGE_ORDER) {
      const inStage = kneePt.filter((e) => hasTag(e, stage));
      expect(inStage.length, `${stage} is empty`).toBeGreaterThanOrEqual(4);
    }
  });

  it('covers both regaining the bend and regaining full extension', () => {
    expect(kneePt.filter((e) => hasTag(e, 'knee-flexion')).length).toBeGreaterThanOrEqual(4);
    expect(kneePt.filter((e) => hasTag(e, 'knee-extension')).length).toBeGreaterThanOrEqual(4);
    expect(kneePt.filter((e) => hasTag(e, 'stretch')).length).toBeGreaterThanOrEqual(3);
  });

  it('early stage stays off the feet; later stages load the leg', () => {
    const early = kneePt.filter((e) => hasTag(e, 'stage-1'));
    expect(early.every((e) => hasTag(e, 'seated-lying')), 'stage-1 should be seated/lying').toBe(true);
    expect(kneePt.filter((e) => hasTag(e, 'weight-bearing')).length).toBeGreaterThanOrEqual(6);
  });

  it('excludes kneeling movements (not appropriate on a replaced knee)', () => {
    expect(kneePt.some((e) => /kneel/i.test(e.name))).toBe(false);
  });

  it('offers more than one equipment option', () => {
    const equip = new Set(kneePt.map((e) => e.equipment));
    expect(equip.size).toBeGreaterThanOrEqual(3);
  });

  it('filterExercises combines tags, equipment and muscle group', () => {
    const seatedEarly = filterExercises(SAMPLE_EXERCISES, { allTags: ['knee-pt', 'stage-1'] });
    expect(seatedEarly.length).toBeGreaterThan(0);
    expect(seatedEarly.every((e) => hasTag(e, 'stage-1'))).toBe(true);

    const stretches = filterExercises(SAMPLE_EXERCISES, { allTags: ['knee-pt'], equipment: ['stretch'] });
    expect(stretches.every((e) => e.equipment === 'stretch')).toBe(true);

    const byName = filterExercises(SAMPLE_EXERCISES, { search: 'heel slide' });
    expect(byName.map((e) => e.name)).toContain('Heel Slide');
  });

  it('groups a program by stage in progression order', () => {
    const groups = groupByTag(kneePt, 'stage');
    expect(groups.map((g) => g.tag.id)).toEqual([...STAGE_ORDER]);
  });

  it('usedTags only returns tags actually in use', () => {
    const goals = usedTags(SAMPLE_EXERCISES, 'goal').map((t) => t.id);
    expect(goals).toContain('knee-pt');
  });
});

describe('filterByFacets — OR within a group, AND across groups', () => {
  const flexion = kneePt.filter((e) => hasTag(e, 'knee-flexion'));
  const extension = kneePt.filter((e) => hasTag(e, 'knee-extension'));

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
    const goalOnly = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-pt'] });
    const goalAndStage = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-pt', 'stage-1'] });
    expect(goalAndStage.length).toBeLessThan(goalOnly.length);
    expect(goalAndStage.every((e) => hasTag(e, 'knee-pt') && hasTag(e, 'stage-1'))).toBe(true);
  });

  it('combines an in-group OR with a cross-group AND', () => {
    const res = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-pt', 'stage-2', 'stage-3'] });
    expect(res.length).toBeGreaterThan(0);
    // every result: knee-pt AND (stage-2 OR stage-3)
    expect(res.every((e) => hasTag(e, 'knee-pt') && (hasTag(e, 'stage-2') || hasTag(e, 'stage-3')))).toBe(true);
    expect(res.some((e) => hasTag(e, 'stage-2'))).toBe(true);
    expect(res.some((e) => hasTag(e, 'stage-3'))).toBe(true);
  });

  it('equipment is its own OR facet, AND-ed with tags', () => {
    const res = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-pt'], equipment: ['stretch', 'tube_band'] });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((e) => hasTag(e, 'knee-pt') && ['stretch', 'tube_band'].includes(e.equipment ?? ''))).toBe(true);
  });

  it('search AND-s with the rest', () => {
    const res = filterByFacets(SAMPLE_EXERCISES, { tags: ['knee-pt'], search: 'heel' });
    expect(res.every((e) => hasTag(e, 'knee-pt') && /heel/i.test(e.name))).toBe(true);
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
