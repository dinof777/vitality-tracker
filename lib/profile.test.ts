import { describe, it, expect } from 'vitest';
import { FOCUS_CHOICES } from './profile';
import { CANON_MUSCLE_GROUPS } from './taxonomy';

// Focus vs muscle groups. Focus is a curated preset, not the muscle-group list
// (some focuses select by pillar / mode / rehab tag instead). But the ones that
// ARE muscle-group bundles — Upper / Lower / Core — are hand-typed, and they
// drifted: Quads, Hips, Hip Flexors, Grip, Spine and T-Spine were in NO bundle,
// so exercises in those groups fell through the split. This guard stops that
// recurring: every muscle group is reachable via some focus.

describe('every muscle group is reachable from a focus', () => {
  // Legitimately covered without a muscle-group bundle:
  //   Conditioning → the Cardio focus (pillar-based, not `groups`)
  //   Full Body    → the "Full Body" focus (groups: null = everything)
  const COVERED_ELSEWHERE = new Set(['Conditioning', 'Full Body']);

  const bundled = new Set(FOCUS_CHOICES.flatMap((f) => f.groups ?? []));

  it('no canon muscle group falls through the Upper/Lower/Core split', () => {
    const orphaned = (CANON_MUSCLE_GROUPS as readonly string[]).filter(
      (g) => !bundled.has(g) && !COVERED_ELSEWHERE.has(g),
    );
    expect(orphaned).toEqual([]);
  });

  it('bundles only reference real canon muscle groups', () => {
    const canon = new Set(CANON_MUSCLE_GROUPS as readonly string[]);
    const ghosts = [...bundled].filter((g) => !canon.has(g));
    expect(ghosts).toEqual([]);
  });
});
