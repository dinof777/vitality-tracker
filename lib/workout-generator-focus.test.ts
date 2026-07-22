import { describe, it, expect } from 'vitest';
import type { Exercise } from './database.types';
import { generateWorkout } from './workout-generator';
import { regionFocus, focusChoice, type Profile } from './profile';

// Regression coverage for the goals-first focus model at the generator level:
// 1) a region's parent-inclusive `groups` (lib/taxonomy-db#fetchRegionHierarchy)
//    must not silently drop exercises tagged to the parent's own name, and
// 2) resolving/generating a workout with a per-workout focus OVERRIDE must
//    never mutate the caller's saved Profile — that's what keeps a builder tap
//    from silently overwriting the onboarding default (app/page.tsx's
//    `refineFocus` session-local state relies on this at the call site).

const ex = (over: Partial<Exercise> & Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'equipment'>): Exercise => ({
  default_cue: '',
  image_url: null,
  created_at: '',
  tags: [],
  ...over,
});

describe('generateWorkout — region focus is parent-inclusive', () => {
  const pool: Exercise[] = [
    ex({ id: 'e-legs-general', name: 'Leg Press', muscle_group: 'Legs', equipment: 'dumbbell' }),
    ex({ id: 'e-hamstrings', name: 'Leg Curl', muscle_group: 'Hamstrings', equipment: 'dumbbell' }),
    ex({ id: 'e-quads', name: 'Front Squat', muscle_group: 'Quads', equipment: 'dumbbell' }),
    ex({ id: 'e-arms', name: 'Bicep Curl', muscle_group: 'Arms', equipment: 'dumbbell' }),
  ];

  const legsRegion = regionFocus({ region: 'Legs', groups: ['Legs', 'Hamstrings', 'Quads'] });

  const profile: Profile = { equipment: ['dumbbell'], focus: legsRegion.value, intensity: 'moderate' };

  it('an exercise tagged muscle_group="Legs" (the parent itself) is NOT dropped from a "Legs" region workout', () => {
    const result = generateWorkout(profile, { pool, count: 10, focusChoices: [legsRegion] });
    expect(result.map((e) => e.id)).toContain('e-legs-general');
  });

  it('still includes the children (Hamstrings/Quads) alongside the parent', () => {
    const result = generateWorkout(profile, { pool, count: 10, focusChoices: [legsRegion] });
    const ids = result.map((e) => e.id);
    expect(ids).toContain('e-hamstrings');
    expect(ids).toContain('e-quads');
  });

  it('excludes exercises outside the region entirely (Arms is not part of the Legs region)', () => {
    const result = generateWorkout(profile, { pool, count: 10, focusChoices: [legsRegion] });
    expect(result.map((e) => e.id)).not.toContain('e-arms');
  });

  it('a children-only groups list (the pre-fix shape) WOULD drop the parent-tagged exercise — proves the fixture is meaningful', () => {
    const childrenOnlyRegion = { ...legsRegion, groups: ['Hamstrings', 'Quads'] };
    const result = generateWorkout(profile, { pool, count: 10, focusChoices: [childrenOnlyRegion] });
    expect(result.map((e) => e.id)).not.toContain('e-legs-general');
  });
});

describe('generateWorkout — rehab umbrella vs. a narrowed area', () => {
  const pool: Exercise[] = [
    ex({ id: 'knee-1', name: 'Knee Extension', muscle_group: 'Legs', equipment: 'tube_band', tags: ['physical-therapy', 'knee'] }),
    ex({ id: 'shoulder-1', name: 'Shoulder External Rotation', muscle_group: 'Shoulders', equipment: 'tube_band', tags: ['physical-therapy', 'shoulder'] }),
    ex({ id: 'nonrehab-1', name: 'Bicep Curl', muscle_group: 'Arms', equipment: 'tube_band' }),
  ];

  const profile: Profile = { equipment: ['tube_band'], focus: 'physical-therapy', intensity: 'moderate' };

  it('the umbrella focus ("physical-therapy") draws from every rehab area, unnarrowed', () => {
    const result = generateWorkout({ ...profile }, { pool, count: 10 });
    const ids = result.map((e) => e.id);
    expect(ids).toContain('knee-1');
    expect(ids).toContain('shoulder-1');
    expect(ids).not.toContain('nonrehab-1');
  });

  it('a per-joint focus (e.g. "knee") narrows to just that area', () => {
    const kneeFocus = focusChoice('knee');
    expect(kneeFocus.areaTags).toEqual(['knee']);
    const result = generateWorkout({ ...profile, focus: 'knee' }, { pool, count: 10 });
    const ids = result.map((e) => e.id);
    expect(ids).toContain('knee-1');
    expect(ids).not.toContain('shoulder-1');
  });
});

describe('a per-workout focus override never mutates the saved Profile', () => {
  const pool: Exercise[] = [
    ex({ id: 'e-legs', name: 'Leg Press', muscle_group: 'Legs', equipment: 'dumbbell' }),
    ex({ id: 'e-arms', name: 'Bicep Curl', muscle_group: 'Arms', equipment: 'dumbbell' }),
  ];

  it('generateWorkout(profile, { focus: <override> }) resolves the OVERRIDE, and profile.focus is untouched afterward', () => {
    const profile: Profile = { equipment: ['dumbbell'], focus: 'legs', intensity: 'moderate' };
    const snapshot = { ...profile };

    // Simulate app/page.tsx's `refineFocus`: a one-workout override distinct
    // from the saved profile.focus, passed only via opts.focus.
    const refineFocus = 'arms';
    const result = generateWorkout(profile, { focus: refineFocus, count: 5, pool });

    expect(result.map((e) => e.id)).toEqual(['e-arms']); // resolved the override, not the saved focus
    expect(profile).toEqual(snapshot); // no mutation of the caller's profile object
    expect(profile.focus).toBe('legs'); // saved default is exactly as it was
  });

  it('generating twice with two different overrides from the same saved profile never drifts profile.focus', () => {
    const profile: Profile = { equipment: ['dumbbell'], focus: 'legs', intensity: 'moderate' };

    generateWorkout(profile, { focus: 'arms', count: 5, pool });
    generateWorkout(profile, { focus: 'legs', count: 5, pool });

    expect(profile.focus).toBe('legs');
  });

  // Gap note (not testable here): app/page.tsx itself keeps the override in a
  // separate `refineFocus` React state and only calls `saveProfile` when the
  // trainer explicitly taps "Set as my default" (onSetDefaultFocus). That
  // component-level wiring has no unit under lib/ — proving it end-to-end
  // would require React Testing Library + jsdom, which aren't installed here.
  // This suite proves the piece that IS unit-testable: the generator/resolver
  // functions the component calls are pure with respect to the profile it
  // passes in.
});
