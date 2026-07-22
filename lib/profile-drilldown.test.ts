import { describe, it, expect } from 'vitest';
import {
  muscleDrillDownNodes,
  rehabDrillDownNodes,
  regionFocus,
  focusKind,
  REHAB_AREA_FOCUSES,
  type DrillDownNode,
} from './profile';

// Regression coverage for the goals-first onboarding drill-down. The bug this
// locks in: a region's children (Quads/Biceps/Obliques/…) used to ALSO leak
// out as their own top-level tile, collapsing the drill-down back into the
// flat wall of tiles it was built to replace — every child rendered twice.
//
// Fixture mirrors a realistic admin-managed region tree (lib/taxonomy-db.ts
// #fetchRegionHierarchy): parent-inclusive `groups` (region name first, then
// children), three regions covering most of CANON_MUSCLE_GROUPS, with a
// handful of groups (Back, Chest, Rear Delts, Shoulders, Spine, T-Spine,
// Traps) deliberately left un-regioned to prove the flat-leaf fallback still
// works for groups that aren't part of any region.
const REGIONS = [
  { region: 'Legs', groups: ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Hips'] },
  { region: 'Arms', groups: ['Arms', 'Biceps', 'Triceps', 'Grip'] },
  { region: 'Core', groups: ['Core', 'Obliques'] },
];

const CHILD_NAMES = new Set(
  REGIONS.flatMap((r) => r.groups.filter((g) => g !== r.region)),
);
const PARENT_NAMES = new Set(REGIONS.map((r) => r.region));

describe('muscleDrillDownNodes', () => {
  const nodes = muscleDrillDownNodes(REGIONS);

  it('top level excludes every region CHILD group — no Quads/Biceps/Obliques/etc. leaks flat', () => {
    const topLevelLabels = nodes.map((n) => n.label);
    const leaked = topLevelLabels.filter((label) => CHILD_NAMES.has(label));
    expect(leaked).toEqual([]);
  });

  it('top level still contains each region PARENT once (nested, not duplicated)', () => {
    const topLevelLabels = nodes.map((n) => n.label);
    for (const parent of Array.from(PARENT_NAMES)) {
      expect(topLevelLabels.filter((l) => l === parent)).toEqual([parent]);
    }
  });

  it('includes a "Full Body" leaf ahead of the region parents', () => {
    expect(nodes[0]).toMatchObject({ value: 'full', label: 'Full Body' });
  });

  it('un-regioned muscle groups still surface as flat top-level leaves (fallback intact)', () => {
    const topLevelLabels = nodes.map((n) => n.label);
    for (const flat of ['Back', 'Chest', 'Rear Delts', 'Shoulders', 'Spine', 'T-Spine', 'Traps']) {
      expect(topLevelLabels).toContain(flat);
    }
  });

  it('each region parent nests exactly its own children (parent name excluded from its own children list)', () => {
    const legs = nodes.find((n) => n.label === 'Legs')!;
    expect(legs.children?.map((c) => c.label).sort()).toEqual(
      ['Calves', 'Glutes', 'Hamstrings', 'Hip Flexors', 'Hips', 'Quads'].sort(),
    );

    const arms = nodes.find((n) => n.label === 'Arms')!;
    expect(arms.children?.map((c) => c.label).sort()).toEqual(['Biceps', 'Grip', 'Triceps'].sort());

    const core = nodes.find((n) => n.label === 'Core')!;
    expect(core.children?.map((c) => c.label)).toEqual(['Obliques']);
  });

  it('a flat leaf (e.g. Chest) has no children field', () => {
    const chest = nodes.find((n) => n.label === 'Chest')!;
    expect(chest.children).toBeUndefined();
  });

  it('falls back to every muscle group rendering flat when regions have not loaded yet ([])', () => {
    const flatNodes = muscleDrillDownNodes([]);
    // No parents to nest under, so nothing here should carry `children`.
    expect(flatNodes.every((n) => n.children === undefined)).toBe(true);
    // Full Body leaf plus one leaf per non-skipped canon muscle group.
    expect(flatNodes.length).toBeGreaterThan(1);
  });
});

describe('rehabDrillDownNodes', () => {
  it('is a single umbrella parent (physical-therapy) whose children are exactly REHAB_AREA_FOCUSES', () => {
    const nodes = rehabDrillDownNodes();
    expect(nodes).toHaveLength(1);
    const umbrella = nodes[0] as DrillDownNode;
    expect(umbrella.value).toBe('physical-therapy');
    expect(umbrella.children?.map((c) => c.value).sort()).toEqual(
      REHAB_AREA_FOCUSES.map((f) => f.value).sort(),
    );
    expect(umbrella.children?.length).toBeGreaterThan(0);
  });

  it('every child value round-trips to a real REHAB_AREA_FOCUSES entry with a matching label', () => {
    const [umbrella] = rehabDrillDownNodes();
    for (const child of umbrella.children ?? []) {
      const focus = REHAB_AREA_FOCUSES.find((f) => f.value === child.value);
      expect(focus).toBeDefined();
      expect(focus!.label).toBe(child.label);
    }
  });
});

// Regression coverage for the focus sheet's segmented control (BuilderControls
// sheet === 'focus'): which lens (Muscle · Style · Rehab) the CURRENT focus
// belongs to, so opening the sheet defaults to the tab the user is already on
// instead of always resetting to Muscle.
describe('focusKind — which lens of the focus picker a value belongs to', () => {
  it('the Physical Therapy umbrella (a tag match, no area) resolves to rehab', () => {
    expect(focusKind('physical-therapy', [])).toBe('rehab');
  });

  it('a narrowed rehab area (an areaTags match) resolves to rehab', () => {
    const knee = REHAB_AREA_FOCUSES.find((f) => f.value === 'knee')!;
    expect(focusKind(knee.value, [])).toBe('rehab');
  });

  it('each Style preset (balanced/cardio/balance/mobility) resolves to style', () => {
    for (const v of ['balanced', 'cardio', 'balance', 'mobility']) {
      expect(focusKind(v, [])).toBe('style');
    }
  });

  it('Full Body resolves to muscle, not style — it lives in the Muscle lens only', () => {
    expect(focusKind('full', [])).toBe('muscle');
  });

  it('a plain muscle-group value resolves to muscle', () => {
    expect(focusKind('chest', [])).toBe('muscle');
  });

  it('an admin-managed region focus resolves to muscle', () => {
    const region = regionFocus({ region: 'Legs', groups: ['Legs', 'Quads', 'Hamstrings'] });
    expect(focusKind(region.value, [region])).toBe('muscle');
  });

  it('an unrecognized value falls back to muscle (focusChoice/resolveFocus default)', () => {
    expect(focusKind('not-a-real-focus', [])).toBe('muscle');
  });
});

describe('regionFocus — parent-inclusive groups', () => {
  it("a region's groups include the region's OWN name, not just its children", () => {
    const legs = REGIONS.find((r) => r.region === 'Legs')!;
    const focus = regionFocus(legs);
    expect(focus.groups).toContain('Legs');
    expect(focus.groups).toEqual(legs.groups); // parent-inclusive, unchanged order
  });

  it("the tile description lists only the CHILDREN, since the region name is already the tile's label", () => {
    const arms = REGIONS.find((r) => r.region === 'Arms')!;
    const focus = regionFocus(arms);
    expect(focus.desc).toBe('Biceps, Triceps, Grip');
    expect(focus.desc).not.toContain('Arms,');
  });
});
