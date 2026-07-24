import { describe, it, expect } from 'vitest';
import {
  validateProfilePatch,
  GOALS_MAX_ITEMS,
  EQUIPMENT_MAX_ITEMS,
  ITEM_MAX_LEN,
  NOTES_MAX_LEN,
} from './client-profile';

// Pure logic only — no mocking needed. Covers array clamp/truncation caps,
// the notes cap, and the PATCH semantics that lib/client-portal-db.ts's
// upsertProfile() depends on to distinguish "field not sent" (leave alone)
// from "field sent as null" (clear it): only fields present in the request
// body should appear as keys on the returned patch at all.

describe('validateProfilePatch — goals array clamp', () => {
  it('truncates to GOALS_MAX_ITEMS when more are sent', () => {
    const goals = Array.from({ length: GOALS_MAX_ITEMS + 5 }, (_, i) => `goal-${i}`);
    const { ok, patch } = validateProfilePatch({ goals });
    expect(ok).toBe(true);
    expect(patch!.goals).toHaveLength(GOALS_MAX_ITEMS);
    expect(patch!.goals).toEqual(goals.slice(0, GOALS_MAX_ITEMS));
  });

  it('passes an under-the-cap array through untouched (aside from trimming)', () => {
    const { patch } = validateProfilePatch({ goals: ['lose fat', 'run a 10k'] });
    expect(patch!.goals).toEqual(['lose fat', 'run a 10k']);
  });

  it('truncates each item to ITEM_MAX_LEN characters', () => {
    const long = 'a'.repeat(ITEM_MAX_LEN + 20);
    const { patch } = validateProfilePatch({ goals: [long] });
    expect(patch!.goals![0]).toHaveLength(ITEM_MAX_LEN);
  });

  it('drops non-string entries and blank/whitespace-only entries', () => {
    const { patch } = validateProfilePatch({ goals: ['real goal', 42, null, '   ', {}] });
    expect(patch!.goals).toEqual(['real goal']);
  });

  it('non-array input becomes an empty array rather than erroring', () => {
    const { ok, patch } = validateProfilePatch({ goals: 'not-an-array' });
    expect(ok).toBe(true);
    expect(patch!.goals).toEqual([]);
  });
});

describe('validateProfilePatch — equipment array clamp', () => {
  it('truncates to EQUIPMENT_MAX_ITEMS when more are sent', () => {
    const equipment = Array.from({ length: EQUIPMENT_MAX_ITEMS + 3 }, (_, i) => `item-${i}`);
    const { patch } = validateProfilePatch({ equipment });
    expect(patch!.equipment).toHaveLength(EQUIPMENT_MAX_ITEMS);
  });
});

describe('validateProfilePatch — notes cap', () => {
  it('caps notes at NOTES_MAX_LEN characters', () => {
    const long = 'n'.repeat(NOTES_MAX_LEN + 100);
    const { patch } = validateProfilePatch({ notes: long });
    expect(patch!.notes).toHaveLength(NOTES_MAX_LEN);
  });

  it('trims and treats an empty/whitespace-only string as null', () => {
    expect(validateProfilePatch({ notes: '   ' }).patch!.notes).toBeNull();
  });
});

describe('validateProfilePatch — heightCm range (50-260cm)', () => {
  it('accepts the boundaries themselves', () => {
    expect(validateProfilePatch({ heightCm: 50 })).toMatchObject({ ok: true, patch: { heightCm: 50 } });
    expect(validateProfilePatch({ heightCm: 260 })).toMatchObject({ ok: true, patch: { heightCm: 260 } });
  });

  it('rejects values just outside the range', () => {
    expect(validateProfilePatch({ heightCm: 49.9 }).ok).toBe(false);
    expect(validateProfilePatch({ heightCm: 260.1 }).ok).toBe(false);
  });

  it('rejects non-numeric heightCm', () => {
    expect(validateProfilePatch({ heightCm: 'tall' }).ok).toBe(false);
  });
});

describe('validateProfilePatch — goalWeightKg range (20-400kg, mirrors client_metrics)', () => {
  it('accepts the boundaries themselves', () => {
    expect(validateProfilePatch({ goalWeightKg: 20 })).toMatchObject({ ok: true, patch: { goalWeightKg: 20 } });
    expect(validateProfilePatch({ goalWeightKg: 400 })).toMatchObject({ ok: true, patch: { goalWeightKg: 400 } });
  });

  it('rejects values just outside the range', () => {
    expect(validateProfilePatch({ goalWeightKg: 19.9 }).ok).toBe(false);
    expect(validateProfilePatch({ goalWeightKg: 400.1 }).ok).toBe(false);
  });
});

describe('validateProfilePatch — PATCH semantics: absent key vs explicit null', () => {
  // This is the correctness contract lib/client-portal-db.ts's upsertProfile()
  // relies on: `patch.heightCm !== undefined ? patch.heightCm : existing value`.
  // If an absent field ever showed up as a key on `patch` (even as undefined),
  // or an explicit null were ever dropped, upsertProfile would silently wipe
  // or silently ignore fields the trainer never touched.

  it('heightCm: an absent key leaves the field OFF the patch entirely (unchanged)', () => {
    const { patch } = validateProfilePatch({ goals: ['x'] }); // heightCm not sent
    expect('heightCm' in patch!).toBe(false);
  });

  it('heightCm: an explicit null IS included on the patch (clears the field)', () => {
    const { patch } = validateProfilePatch({ heightCm: null });
    expect('heightCm' in patch!).toBe(true);
    expect(patch!.heightCm).toBeNull();
  });

  it('goalWeightKg: an absent key leaves the field OFF the patch entirely', () => {
    const { patch } = validateProfilePatch({ goals: ['x'] });
    expect('goalWeightKg' in patch!).toBe(false);
  });

  it('goalWeightKg: an explicit null clears it', () => {
    const { patch } = validateProfilePatch({ goalWeightKg: null });
    expect(patch!.goalWeightKg).toBeNull();
  });

  it('notes: an absent key leaves the field OFF the patch entirely', () => {
    const { patch } = validateProfilePatch({ goals: ['x'] });
    expect('notes' in patch!).toBe(false);
  });

  it('notes: an explicit null clears it', () => {
    const { patch } = validateProfilePatch({ notes: null });
    expect('notes' in patch!).toBe(true);
    expect(patch!.notes).toBeNull();
  });

  it('goals/equipment: an absent key leaves the field OFF the patch (no accidental wipe to [])', () => {
    const { patch } = validateProfilePatch({ notes: 'just a note' });
    expect('goals' in patch!).toBe(false);
    expect('equipment' in patch!).toBe(false);
  });

  it('an entirely empty body produces an empty patch object (no keys at all)', () => {
    const { ok, patch } = validateProfilePatch({});
    expect(ok).toBe(true);
    expect(Object.keys(patch!)).toEqual([]);
  });
});
