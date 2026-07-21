import { describe, it, expect } from 'vitest';
import {
  NO_USAGE,
  isInUse,
  deleteEffect,
  usageSummary,
  deleteMessage,
  isDemotion,
  checkScopeMove,
  type Usage,
} from './lifecycle';

const used = (partial: Partial<Usage>): Usage => ({ ...NO_USAGE, ...partial });

describe('deleteEffect', () => {
  it('really deletes something nothing points at', () => {
    expect(deleteEffect(NO_USAGE)).toBe('deleted');
  });

  it('archives anything in use — a single logged set is enough', () => {
    // The rule that matters: exercises CASCADE to log_entries, so a hard delete
    // of a trained move destroys the history it's the evidence for.
    expect(deleteEffect(used({ logEntries: 1 }))).toBe('archived');
    expect(deleteEffect(used({ routines: 1 }))).toBe('archived');
    expect(deleteEffect(used({ exercises: 1 }))).toBe('archived');
    expect(deleteEffect(used({ aliases: 1 }))).toBe('archived');
    expect(deleteEffect(used({ gyms: 1 }))).toBe('archived');
  });

  it('every field counts toward in-use', () => {
    for (const key of Object.keys(NO_USAGE) as Array<keyof Usage>) {
      expect(isInUse(used({ [key]: 1 }))).toBe(true);
    }
  });
});

describe('usageSummary', () => {
  it('leads with the most painful loss', () => {
    expect(usageSummary(used({ routines: 3, logEntries: 112 }))).toBe('112 logged sets · 3 routines');
  });

  it('singularizes', () => {
    expect(usageSummary(used({ routines: 1, gyms: 1 }))).toBe('1 routine · 1 gym');
  });

  it('omits zeroes', () => {
    expect(usageSummary(used({ exercises: 2 }))).toBe('2 exercises');
    expect(usageSummary(NO_USAGE)).toBe('');
  });
});

describe('deleteMessage', () => {
  it('promises removal only when nothing is at stake', () => {
    expect(deleteMessage('Sled Push', NO_USAGE)).toContain('removed completely');
  });

  it('names what is at stake and promises history survives', () => {
    const msg = deleteMessage('Sled Push', used({ logEntries: 112, routines: 3 }));
    expect(msg).toContain('112 logged sets · 3 routines');
    expect(msg).toContain('archived instead of deleted');
    expect(msg).not.toContain('removed completely');
  });
});

describe('checkScopeMove', () => {
  it('always allows promoting — strictly more people can see it', () => {
    expect(checkScopeMove({ from: 'tenant', to: 'global' }, ['Gym A', 'Gym B']).allowed).toBe(true);
  });

  it('allows a demotion nobody else depends on', () => {
    expect(checkScopeMove({ from: 'global', to: 'tenant' }, []).allowed).toBe(true);
  });

  it('blocks a demotion that would take it away from other gyms, and names them', () => {
    const r = checkScopeMove({ from: 'global', to: 'tenant' }, ['Iron House', 'Peak Fitness']);
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('Iron House');
    expect(r.reason).toContain('Peak Fitness');
    expect(r.reason).toContain('Merge it');
  });

  it('truncates a long dependent list instead of dumping every gym', () => {
    const many = Array.from({ length: 9 }, (_, i) => `Gym ${i + 1}`);
    const r = checkScopeMove({ from: 'global', to: 'tenant' }, many);
    expect(r.reason).toContain('and 4 more');
    expect(r.reason).not.toContain('Gym 9');
  });

  it('same-scope moves are not demotions', () => {
    expect(isDemotion({ from: 'tenant', to: 'tenant' })).toBe(false);
    expect(isDemotion({ from: 'global', to: 'global' })).toBe(false);
    expect(isDemotion({ from: 'global', to: 'tenant' })).toBe(true);
  });
});
