import { describe, it, expect } from 'vitest';
import { movementKey, findSimilarExercise, type NamedExercise } from './exercise-dedup';
import { SAMPLE_EXERCISES } from './exercises';

const LIBRARY: NamedExercise[] = SAMPLE_EXERCISES.map((e) => ({ id: e.id, name: e.name }));

describe('movementKey', () => {
  it('drops the equipment prefix that makes the same move look different', () => {
    expect(movementKey('DB Goblet Squat')).toBe('goblet squat');
    expect(movementKey('Goblet Squat')).toBe('goblet squat');
    expect(movementKey('KB Swing')).toBe('swing');
  });

  it('never strips every token — a bare equipment name keeps its last word', () => {
    expect(movementKey('Dumbbell')).toBe('dumbbell');
    expect(movementKey('Medicine Ball')).toBe('ball');
  });
});

describe('findSimilarExercise', () => {
  it('catches the same move typed without its equipment prefix', () => {
    const hit = findSimilarExercise('Goblet Squat', LIBRARY);
    expect(hit.reason).toBe('exact');
    expect(hit.match?.name).toContain('Goblet Squat');
  });

  it('catches typos', () => {
    expect(findSimilarExercise('DB Lateral Rasie', LIBRARY).match?.name).toBe('DB Lateral Raise');
  });

  it('catches a narrower name inside a library move', () => {
    const hit = findSimilarExercise('Romanian Deadlift', LIBRARY);
    expect(hit.match).not.toBeNull();
    expect(hit.match?.name).toContain('Romanian Deadlift');
  });

  it('does not flag a single common word against the whole library', () => {
    // "Squat" alone must not match every squat variation — one word is too weak
    // a signal to interrupt the trainer with.
    expect(findSimilarExercise('Squat', LIBRARY).reason).not.toBe('variant');
  });

  it('lets a genuinely new movement through', () => {
    expect(findSimilarExercise('Copenhagen Plank', LIBRARY).match).toBeNull();
    expect(findSimilarExercise('Nordic Curl', LIBRARY).match).toBeNull();
  });

  it('flags an unprefixed name against the library move that has the prefix', () => {
    // The whole point: "Turkish Get-Up" must find "KB Turkish Get-Up" rather than
    // becoming a second copy with its own split logging history.
    expect(findSimilarExercise('Turkish Get-Up', LIBRARY).match?.name).toBe('KB Turkish Get-Up');
  });

  it('every library move matches itself — the check can never miss an exact copy', () => {
    for (const ex of LIBRARY) {
      expect(findSimilarExercise(ex.name, LIBRARY).match).not.toBeNull();
    }
  });
});
