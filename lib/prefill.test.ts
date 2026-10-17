import { describe, it, expect } from 'vitest';
import { pickPrefillSet, type PrefillCandidate } from './prefill';

// Guards the AMRAP/dropset pre-fill rule from DESIGN.md §"AMRAP toggle".
// The bug this exists to stop: /api/exercises/[exerciseId]/last used to return
// `order by created_at desc limit 1` with no regard for set_type, so the last
// set of a session seeded the next one even when that set was a drop set at a
// deliberately lighter weight, or an AMRAP set whose reps were a to-failure
// count. Rows below are newest-first, which is the contract pickPrefillSet
// requires.

const row = (set_type: PrefillCandidate['set_type'], weight: number, reps: number): PrefillCandidate => ({
  weight,
  reps,
  tempo: '3-1-1',
  set_type,
});

describe('pickPrefillSet', () => {
  it('returns null when the exercise has never been logged', () => {
    expect(pickPrefillSet([])).toBeNull();
  });

  it('takes the newest set when it is a straight set', () => {
    const rows = [row('normal', 135, 8), row('normal', 130, 8)];
    expect(pickPrefillSet(rows)?.weight).toBe(135);
  });

  it('skips a trailing AMRAP set and seeds from the working set before it', () => {
    // Typical session: three straight sets at 135, finished with an AMRAP at 115.
    const rows = [row('amrap', 115, 19), row('normal', 135, 8), row('normal', 135, 8)];
    const picked = pickPrefillSet(rows);
    expect(picked?.weight).toBe(135);
    expect(picked?.reps).toBe(8);
    expect(picked?.set_type).toBe('normal');
  });

  it('skips a trailing drop set — its weight is below the working weight by design', () => {
    const rows = [row('dropset', 95, 12), row('normal', 135, 8)];
    expect(pickPrefillSet(rows)?.weight).toBe(135);
  });

  it('skips a trailing 1.5-rep set, whose rep count is not comparable', () => {
    const rows = [row('half_rep', 95, 6), row('normal', 135, 8)];
    expect(pickPrefillSet(rows)?.weight).toBe(135);
  });

  it('skips past several non-working sets to reach the straight set', () => {
    const rows = [row('dropset', 75, 15), row('dropset', 95, 12), row('amrap', 115, 18), row('normal', 135, 8)];
    expect(pickPrefillSet(rows)?.weight).toBe(135);
  });

  it('falls back to the newest row when the exercise has ONLY ever been AMRAP', () => {
    // Better to seed from an AMRAP set than to show an empty input.
    const rows = [row('amrap', 115, 21), row('amrap', 110, 20)];
    const picked = pickPrefillSet(rows);
    expect(picked?.weight).toBe(115);
    expect(picked?.set_type).toBe('amrap');
  });

  it('prefers a straight set even when it is the oldest row in the window', () => {
    const rows = [row('amrap', 115, 18), row('dropset', 95, 12), row('half_rep', 90, 6), row('normal', 140, 5)];
    expect(pickPrefillSet(rows)?.weight).toBe(140);
  });
});
