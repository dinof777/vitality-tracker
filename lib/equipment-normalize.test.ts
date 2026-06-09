import { describe, it, expect } from 'vitest';
import { normalizeEquip, canonicalEquip, findEquipDuplicate, type EquipRef } from './equipment-normalize';

const CORE: EquipRef[] = [
  { id: '1', name: 'Dumbbell', normalized: 'dumbbell' },
  { id: '2', name: 'Kettlebell', normalized: 'kettlebell' },
  { id: '3', name: 'Tube Band', normalized: 'tube band' },
  { id: '4', name: 'Medicine Ball', normalized: 'medicine ball' },
  { id: '5', name: 'Jump Rope', normalized: 'jump rope' },
];

describe('normalizeEquip', () => {
  it('lowercases, strips punctuation, collapses spaces', () => {
    expect(normalizeEquip('  Pull-Up   Bar! ')).toBe('pull up bar');
    expect(normalizeEquip('TRX®')).toBe('trx');
  });
});

describe('canonicalEquip', () => {
  it('folds known synonyms', () => {
    expect(canonicalEquip('DBs')).toBe('dumbbell');
    expect(canonicalEquip('resistance band')).toBe('tube band');
    expect(canonicalEquip('med ball')).toBe('medicine ball');
  });
});

describe('findEquipDuplicate', () => {
  it('catches abbreviations / synonyms', () => {
    expect(findEquipDuplicate('DB', CORE).match?.name).toBe('Dumbbell');
    expect(findEquipDuplicate('Kettleball', CORE).match?.name).toBe('Kettlebell');
    expect(findEquipDuplicate('Resistance Bands', CORE).match?.name).toBe('Tube Band');
  });

  it('catches exact + plural/typo via fuzzy', () => {
    expect(findEquipDuplicate('dumbbell', CORE).reason).toBe('exact');
    expect(findEquipDuplicate('dumbbells', CORE).match?.name).toBe('Dumbbell'); // synonym
    expect(findEquipDuplicate('medecine ball', CORE).match?.name).toBe('Medicine Ball'); // fuzzy typo
  });

  it('lets genuinely new equipment through', () => {
    expect(findEquipDuplicate('Battle Ropes', CORE).match).toBeNull();
    expect(findEquipDuplicate('Sandbag', CORE).match).toBeNull();
    expect(findEquipDuplicate('Sled', CORE).match).toBeNull();
  });

  it('does not over-merge distinct short names', () => {
    // 'sled' vs 'sand' etc. should not collide with core
    expect(findEquipDuplicate('Bosu', CORE).match).toBeNull();
  });
});
