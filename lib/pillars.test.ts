import { describe, it, expect } from 'vitest';
import { GOAL_CHOICES, DAY_KIND, weekTemplate, type Goal } from './pillars';

// Regression coverage for the 4th goal (recover_rehab) added alongside the
// goals-first onboarding. GOAL_SEQUENCE (lib/pillars.ts) is typed as
// `Record<Goal, DayKind[]>` and NOT exported, so TypeScript itself already
// blocks a missing key at compile time — this suite is the runtime backstop:
// every goal GOAL_CHOICES actually offers must resolve to a working weekly
// template through the one exported entry point, weekTemplate().

describe('GOAL_CHOICES', () => {
  it('has exactly 4 entries', () => {
    expect(GOAL_CHOICES).toHaveLength(4);
  });

  it('includes recover_rehab (the new rehab goal)', () => {
    expect(GOAL_CHOICES.map((g) => g.value)).toContain('recover_rehab');
  });

  it('every value is unique', () => {
    const values = GOAL_CHOICES.map((g) => g.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('weekTemplate resolves EVERY Goal — no goal falls through to a missing GOAL_SEQUENCE entry', () => {
  const DAY_KIND_KEYS = new Set(Object.keys(DAY_KIND));

  for (const { value: goal } of GOAL_CHOICES) {
    for (const daysPerWeek of [3, 4, 5, 6]) {
      it(`${goal} @ ${daysPerWeek} days/week produces a 7-day week of valid, defined DayKinds`, () => {
        const week = weekTemplate(daysPerWeek, goal as Goal);
        expect(week).toHaveLength(7);
        for (const kind of week) {
          expect(kind).toBeDefined();
          expect(DAY_KIND_KEYS.has(kind)).toBe(true);
        }
      });
    }
  }

  it('recover_rehab specifically resolves (Home hides "Plan my week" for it, but the function itself must not throw)', () => {
    expect(() => weekTemplate(4, 'recover_rehab')).not.toThrow();
    const week = weekTemplate(4, 'recover_rehab');
    expect(week.filter((k) => k !== 'rest' && k !== 'recovery')).toHaveLength(4);
  });

  it('the number of TRAINING days (non-rest, non-recovery) matches the requested daysPerWeek, for every goal', () => {
    for (const { value: goal } of GOAL_CHOICES) {
      for (const daysPerWeek of [3, 4, 5, 6]) {
        const week = weekTemplate(daysPerWeek, goal as Goal);
        const trainingDays = week.filter((k) => k !== 'rest' && k !== 'recovery').length;
        expect(trainingDays).toBe(daysPerWeek);
      }
    }
  });
});
