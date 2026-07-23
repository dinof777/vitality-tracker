import { describe, it, expect } from 'vitest';
import { canLogSet } from './workout-types';

// Regression coverage for the LOG SET disabled gate (DESIGN.md §6,
// "Log-set validation") — the fix for mis-tap-logs-a-blank-set. `reps` is the
// one field SetLogRow feeds in for BOTH strength mode (reps) and timed mode
// (seconds), so a single function covers both without a mode parameter.
// Weight is deliberately absent from the signature: bodyweight sets are a
// valid logged set with weight: null, and must never be gated on.
describe('canLogSet', () => {
  it('is false when reps is empty (the untouched default state)', () => {
    expect(canLogSet('')).toBe(false);
  });

  it('is false for 0 — a set with zero reps/seconds is not a logged set', () => {
    expect(canLogSet('0')).toBe(false);
  });

  it('is false for a negative value', () => {
    expect(canLogSet('-1')).toBe(false);
  });

  it('is true at the boundary — 1 rep/second is a valid set', () => {
    expect(canLogSet('1')).toBe(true);
  });

  it('is true for any value above the boundary', () => {
    expect(canLogSet('12')).toBe(true);
  });

  it('is false for a non-numeric string', () => {
    expect(canLogSet('abc')).toBe(false);
  });
});
