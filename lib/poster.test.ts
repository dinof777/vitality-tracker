import { describe, it, expect } from 'vitest';
import { resolvePosterLayout } from './poster';

describe('resolvePosterLayout', () => {
  it('defaults to poster when missing', () => {
    expect(resolvePosterLayout(undefined)).toBe('poster');
  });
  it('accepts the handout value', () => {
    expect(resolvePosterLayout('handout')).toBe('handout');
  });
  it('falls back to poster for any invalid value (typo, unrelated, empty)', () => {
    expect(resolvePosterLayout('flyer')).toBe('poster');
    expect(resolvePosterLayout('')).toBe('poster');
    expect(resolvePosterLayout('Poster')).toBe('poster'); // case-sensitive, not a silent alias
  });
});
