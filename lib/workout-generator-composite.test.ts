import { describe, it, expect } from 'vitest';
import type { Exercise } from './database.types';
import { generateWorkout } from './workout-generator';
import type { Profile } from './profile';

// New coverage for the pillar-first composite focus grammar at the generator
// level: pillar AND muscle-group compose (sequential-AND, not else-if), and a
// too-narrow combo relaxes through the ladder instead of yielding [].

const ex = (over: Partial<Exercise> & Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'equipment'>): Exercise => ({
  default_cue: '',
  image_url: null,
  created_at: '',
  tags: [],
  ...over,
});

describe('generateWorkout — composite focus is a 3-way AND (pillar AND group AND deep)', () => {
  const pool: Exercise[] = [
    // strength + Quads — the only exercise that should survive strength:legs:quads.
    ex({ id: 'strength-quads', name: 'Front Squat', muscle_group: 'Quads', equipment: 'dumbbell' }),
    // strength but Hamstrings, not Quads — excluded by the group filter.
    ex({ id: 'strength-hamstrings', name: 'Romanian Deadlift', muscle_group: 'Hamstrings', equipment: 'dumbbell' }),
    // Quads but cardio (jump rope), not strength — excluded by the pillar filter.
    ex({ id: 'cardio-quads', name: 'Jump Squat', muscle_group: 'Quads', equipment: 'jump_rope' }),
  ];
  const profile: Profile = { equipment: ['dumbbell', 'jump_rope'], focus: 'strength:legs:quads', intensity: 'moderate' };

  it('includes only the exercise matching pillar AND group AND deep', () => {
    const result = generateWorkout(profile, { pool, count: 10 });
    expect(result.map((e) => e.id)).toEqual(['strength-quads']);
  });

  it('excludes a same-pillar exercise in a different muscle group', () => {
    const result = generateWorkout(profile, { pool, count: 10 });
    expect(result.map((e) => e.id)).not.toContain('strength-hamstrings');
  });

  it('excludes a same-group exercise from a different pillar', () => {
    const result = generateWorkout(profile, { pool, count: 10 });
    expect(result.map((e) => e.id)).not.toContain('cardio-quads');
  });
});

describe('generateWorkout — relaxation ladder never yields an empty workout for a too-narrow composite', () => {
  const profile: Profile = { equipment: ['dumbbell'], focus: 'strength:legs:quads', intensity: 'moderate' };

  it('falls back to the group rung (strength:legs) when the exact deep tier is empty', () => {
    // No Quads exercise in the pool at all — only a strength Hamstrings move,
    // which the parent-inclusive Legs group set still covers.
    const pool: Exercise[] = [ex({ id: 'strength-hamstrings', name: 'Romanian Deadlift', muscle_group: 'Hamstrings', equipment: 'dumbbell' })];
    const result = generateWorkout(profile, { pool, count: 10 });
    expect(result.map((e) => e.id)).toEqual(['strength-hamstrings']);
  });

  it('falls back further to the bare pillar rung (strength) when the group rung is also empty', () => {
    // A strength exercise that isn't in the Legs group at all.
    const pool: Exercise[] = [ex({ id: 'strength-chest', name: 'Bench Press', muscle_group: 'Chest', equipment: 'dumbbell' })];
    const result = generateWorkout(profile, { pool, count: 10 });
    expect(result.map((e) => e.id)).toEqual(['strength-chest']);
  });

  it('falls back to the full equipment-filtered pool (never []) when even the bare pillar is empty', () => {
    // Equipment excludes strength entirely — only a cardio (jump rope) move available.
    const cardioOnlyProfile: Profile = { equipment: ['jump_rope'], focus: 'strength:legs:quads', intensity: 'moderate' };
    const pool: Exercise[] = [ex({ id: 'cardio-only', name: 'Jump Rope', muscle_group: 'Conditioning', equipment: 'jump_rope' })];
    const result = generateWorkout(cardioOnlyProfile, { pool, count: 10 });
    expect(result.map((e) => e.id)).toEqual(['cardio-only']); // matches today's worst-case fallback, not []
  });

  it('the same "never empty" floor also covers an ordinary (non-composite) focus — a legacy focus with zero matches still returns the equipment pool, not []', () => {
    // relaxationLadder(v) for a colon-free legacy value is just [v] (nothing to
    // relax to), so the pool goes straight to the final "even the bare pillar
    // is empty" fallback — matches the spec's literal algorithm, and is a
    // strict improvement (never fewer results), not a regression.
    const legacyProfile: Profile = { equipment: ['dumbbell'], focus: 'chest', intensity: 'moderate' };
    const pool: Exercise[] = [ex({ id: 'strength-hamstrings', name: 'Romanian Deadlift', muscle_group: 'Hamstrings', equipment: 'dumbbell' })];
    const result = generateWorkout(legacyProfile, { pool, count: 10 });
    expect(result.map((e) => e.id)).toEqual(['strength-hamstrings']);
  });
});
