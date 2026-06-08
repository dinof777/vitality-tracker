import { describe, it, expect } from 'vitest';
import { slugify, isValidSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Iron Forge Gym')).toBe('iron-forge-gym');
    expect(slugify("Jane's Fit!! Studio")).toBe('jane-s-fit-studio');
  });
  it('trims leading/trailing hyphens and caps length', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
    expect(slugify('a'.repeat(50)).length).toBeLessThanOrEqual(32);
  });
});

describe('isValidSlug', () => {
  it('accepts valid slugs', () => {
    expect(isValidSlug('iron-forge')).toBe(true);
    expect(isValidSlug('jane')).toBe(true);
    expect(isValidSlug('gym42')).toBe(true);
  });
  it('rejects bad shapes', () => {
    expect(isValidSlug('a')).toBe(false); // too short
    expect(isValidSlug('-lead')).toBe(false);
    expect(isValidSlug('trail-')).toBe(false);
    expect(isValidSlug('double--hyphen')).toBe(false);
    expect(isValidSlug('Caps')).toBe(false);
    expect(isValidSlug('has space')).toBe(false);
  });
  it('rejects reserved words (route collisions)', () => {
    expect(isValidSlug('dashboard')).toBe(false);
    expect(isValidSlug('api')).toBe(false);
    expect(isValidSlug('sign-in')).toBe(false);
  });
});
