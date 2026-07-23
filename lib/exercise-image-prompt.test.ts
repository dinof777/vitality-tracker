import { describe, it, expect } from 'vitest';
import { buildExerciseImagePrompt, EXERCISE_IMAGE_STYLE } from './exercise-image-prompt';

describe('buildExerciseImagePrompt', () => {
  it('includes equipment and cue when both are given', () => {
    const prompt = buildExerciseImagePrompt({
      name: 'DB Goblet Squat',
      equipment: 'dumbbell',
      cue: 'Elbows inside knees',
    });
    expect(prompt).toBe(
      'A muscular athlete performing a DB Goblet Squat using Dumbbell. Form: Elbows inside knees. ' +
        EXERCISE_IMAGE_STYLE,
    );
  });

  it('drops the equipment clause entirely when there is none', () => {
    const prompt = buildExerciseImagePrompt({ name: 'Push-Up', cue: 'Elbows at 45°' });
    expect(prompt).toBe('A muscular athlete performing a Push-Up. Form: Elbows at 45°. ' + EXERCISE_IMAGE_STYLE);
  });

  it('drops the equipment clause for bodyweight-style entries (calisthenics, stretch)', () => {
    expect(buildExerciseImagePrompt({ name: 'Air Squat', equipment: 'calisthenics' })).toBe(
      `A muscular athlete performing a Air Squat. ${EXERCISE_IMAGE_STYLE}`,
    );
    expect(buildExerciseImagePrompt({ name: 'Hamstring Stretch', equipment: 'stretch' })).toBe(
      `A muscular athlete performing a Hamstring Stretch. ${EXERCISE_IMAGE_STYLE}`,
    );
  });

  it('drops the "Form:" clause entirely when there is no cue', () => {
    const prompt = buildExerciseImagePrompt({ name: 'Band Row', equipment: 'tube_band' });
    expect(prompt).toBe('A muscular athlete performing a Band Row using Tube Band. ' + EXERCISE_IMAGE_STYLE);
  });

  it('falls back to a plain sentence with just the name when nothing else is given', () => {
    expect(buildExerciseImagePrompt({ name: 'Kettlebell Swing' })).toBe(
      `A muscular athlete performing a Kettlebell Swing. ${EXERCISE_IMAGE_STYLE}`,
    );
  });

  it('honors an equipmentLabel override for a gym\'s own custom equipment', () => {
    const prompt = buildExerciseImagePrompt({
      name: 'Sled Push',
      equipment: 'cat:some-uuid',
      equipmentLabel: 'Prowler Sled',
    });
    expect(prompt).toBe('A muscular athlete performing a Sled Push using Prowler Sled. ' + EXERCISE_IMAGE_STYLE);
  });

  it('trims whitespace on name and cue', () => {
    const prompt = buildExerciseImagePrompt({ name: '  Lat Pulldown  ', cue: '  Squeeze the back  ' });
    expect(prompt).toBe('A muscular athlete performing a Lat Pulldown. Form: Squeeze the back. ' + EXERCISE_IMAGE_STYLE);
  });
});
