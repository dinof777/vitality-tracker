import { describe, it, expect } from 'vitest';
import { SAMPLE_EXERCISES } from './exercises';
import { TAG_BY_ID, STAGE_ORDER, filterExercises, groupByTag, usedTags, hasTag } from './tags';

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
