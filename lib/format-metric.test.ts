import { describe, it, expect } from 'vitest';
import { fmt1 } from './format-metric';

// Trivial by design (see the module's own header comment) — light coverage
// is the right amount here.

describe('fmt1', () => {
  it('adds a trailing .0 for whole numbers', () => {
    expect(fmt1(82)).toBe('82.0');
    expect(fmt1(0)).toBe('0.0');
  });

  it('passes an already-one-decimal value through', () => {
    expect(fmt1(82.5)).toBe('82.5');
  });

  it('rounds a multi-decimal value to one place', () => {
    expect(fmt1(82.357)).toBe('82.4');
    expect(fmt1(82.349)).toBe('82.3');
  });

  it('handles negative values the same way', () => {
    expect(fmt1(-3.14159)).toBe('-3.1');
  });
});
