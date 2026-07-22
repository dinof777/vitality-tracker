import { describe, it, expect } from 'vitest';
import { FOCUS_CHOICES, MUSCLE_GROUP_FOCUSES } from './profile';
import { CANON_MUSCLE_GROUPS } from './taxonomy';

// Focus vs muscle groups. Focus is a curated preset, not the muscle-group list
// (the "special" focuses select by pillar / mode / rehab tag instead). But
// MUSCLE_GROUP_FOCUSES is GENERATED from CANON_MUSCLE_GROUPS (lib/profile.ts),
// one tile per group — the guard used to be about a hand-typed Upper/Lower/Core
// split drifting out of sync with the taxonomy (Quads, Hips, Hip Flexors, Grip,
// Spine and T-Spine fell through it). Generation makes that class of bug
// impossible, but a NEW canon muscle group could still silently get no focus if
// someone hand-edits MUSCLE_GROUP_FOCUS_SKIP — this guard catches that instead.

describe('every muscle group is reachable from a focus', () => {
  // Legitimately covered without a muscle-group focus of their own:
  //   Conditioning → the Cardio special focus (pillar-based, not `groups`)
  //   Full Body    → the "Full Body" special focus (groups: null = everything)
  const COVERED_ELSEWHERE = new Set(['Conditioning', 'Full Body']);

  const grouped = new Set(FOCUS_CHOICES.flatMap((f) => f.groups ?? []));

  it('every canon muscle group has its own muscle-group focus (except the documented specials)', () => {
    const orphaned = (CANON_MUSCLE_GROUPS as readonly string[]).filter(
      (g) => !grouped.has(g) && !COVERED_ELSEWHERE.has(g),
    );
    expect(orphaned).toEqual([]);
  });

  it('MUSCLE_GROUP_FOCUSES has exactly one focus per non-skipped canon muscle group', () => {
    const expected = (CANON_MUSCLE_GROUPS as readonly string[]).filter((g) => !COVERED_ELSEWHERE.has(g));
    expect(MUSCLE_GROUP_FOCUSES.map((f) => f.label).sort()).toEqual([...expected].sort());
  });

  it('focuses only reference real canon muscle groups', () => {
    const canon = new Set(CANON_MUSCLE_GROUPS as readonly string[]);
    const ghosts = [...grouped].filter((g) => !canon.has(g));
    expect(ghosts).toEqual([]);
  });
});
