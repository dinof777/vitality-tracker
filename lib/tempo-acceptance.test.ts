import { describe, it, expect } from 'vitest';
import {
  TEMPO_PRESETS,
  TEMPO_INFO,
  TEMPO_PATTERN,
  TEMPO_PLACEHOLDER,
  isValidTempo,
  isStorableTempo,
} from './workout-types';
import { INTENSITY_CHOICES, intensityParams, workoutParams, type Profile } from './profile';

// Acceptance coverage for TEMPO TRACKING — the headline feature the project
// objective names first. See docs/TEMPO_ACCEPTANCE.md for the full spec and the
// two gaps this suite deliberately does NOT assert away (they are `it.todo`
// below, owned by someone who may edit production code; this file may not).
//
// The contract being locked here: tempo is THREE digits in
// eccentric-pause-concentric order, hyphen-separated, each 0-9 seconds.
// "3-1-1" = 3s lowering · 1s pause at the bottom · 1s lifting.
//
// Dino settled the three-digit question on card cb0f0c75 (2026-10-08, "a"), so
// the shape now lives in production as `TEMPO_PATTERN` and is enforced by the
// Custom box and by POST /api/log. This local copy is kept deliberately
// independent: if someone widens the production regex (to four digits, or to
// allow `X`), this file fails rather than silently agreeing with the change.
const TEMPO_NOTATION = /^\d-\d-\d$/;

// Sum of the three phases = seconds of one rep. The workout generator's timing
// math uses `repSec` for the same quantity, and the two must agree or the app
// shows a tempo badge that contradicts the time estimate on the same screen.
function tempoSeconds(tempo: string): number {
  return tempo.split('-').reduce((total, phase) => total + Number(phase), 0);
}

describe('tempo notation — the preset pills offered in SetLogRow', () => {
  it('offers at least one preset (the pill row is never empty)', () => {
    expect(TEMPO_PRESETS.length).toBeGreaterThan(0);
  });

  it.each(TEMPO_PRESETS)('"%s" is three hyphen-separated single digits', (preset) => {
    expect(preset).toMatch(TEMPO_NOTATION);
  });

  it('has no duplicate presets (two identical pills would both look selectable)', () => {
    expect(new Set(TEMPO_PRESETS).size).toBe(TEMPO_PRESETS.length);
  });

  it('includes "3-1-1" — the shared default used by SetLogRow, ExerciseCard and ExerciseDetailSheet', () => {
    // Three separate files hardcode '3-1-1' as the fallback when there is no
    // prior set to pre-fill from. If it ever stops being a preset, the Custom
    // input silently opens on first use instead of a pill showing as selected.
    expect(TEMPO_PRESETS).toContain('3-1-1');
  });

  it('prescribes a slower eccentric than concentric in every preset', () => {
    // Pruett's tempo work is eccentric-loaded: the lowering phase is the point.
    // A preset with a faster lowering than lift would be off-methodology.
    for (const preset of TEMPO_PRESETS) {
      const [eccentric, , concentric] = preset.split('-').map(Number);
      expect(eccentric, `${preset} eccentric vs concentric`).toBeGreaterThanOrEqual(concentric);
    }
  });
});

describe('TEMPO_INFO — the tap/hover explanation shown on the badges', () => {
  it('names all three phases in order, so the digits are not ambiguous', () => {
    expect(TEMPO_INFO).toMatch(/eccentric.*pause.*concentric/i);
  });

  it('illustrates with a tempo that is itself a real preset', () => {
    const quoted = TEMPO_INFO.match(/\d-\d-\d/g) ?? [];
    expect(quoted.length, 'TEMPO_INFO should show a worked example').toBeGreaterThan(0);
    for (const example of quoted) {
      expect(TEMPO_PRESETS).toContain(example as (typeof TEMPO_PRESETS)[number]);
    }
  });
});

describe('profile-recommended tempo agrees with the logger', () => {
  it.each(INTENSITY_CHOICES)(
    '$value recommends "$tempo", which the logger offers as a pill',
    ({ tempo }) => {
      expect(TEMPO_PRESETS).toContain(tempo as (typeof TEMPO_PRESETS)[number]);
    },
  );

  it.each(INTENSITY_CHOICES)(
    '$value: repSec ($repSec) equals the sum of its tempo phases',
    ({ tempo, repSec }) => {
      // If these drift, ExerciseDetailSheet's "3 sets × 10 reps @ 3-1-1" line
      // and the workout length estimate describe different workouts.
      expect(tempoSeconds(tempo)).toBe(repSec);
    },
  );

  it('resolves a tempo for every intensity through workoutParams', () => {
    for (const choice of INTENSITY_CHOICES) {
      const profile: Profile = { equipment: [], focus: 'full-body', intensity: choice.value };
      expect(workoutParams(profile).tempo).toMatch(TEMPO_NOTATION);
    }
  });

  it('falls back to the moderate tempo for an unrecognised intensity', () => {
    // intensityParams defaults to INTENSITY_CHOICES[1]; a bad localStorage
    // value must not produce an undefined tempo on the badge row.
    expect(intensityParams('nonsense' as never).tempo).toBe(INTENSITY_CHOICES[1].tempo);
  });
});

describe('the timed-mode sentinel is distinguishable from a real tempo', () => {
  it("'' (what SetLogRow logs for holds/cardio/carries) is not valid notation", () => {
    // SetLogRow sends `tempo: timed ? '' : tempo`. Every display surface must
    // therefore guard on mode rather than on tempo being truthy — and the empty
    // string must never pass for a prescription.
    expect('').not.toMatch(TEMPO_NOTATION);
    expect(TEMPO_PRESETS).not.toContain('' as (typeof TEMPO_PRESETS)[number]);
  });
});

describe('isValidTempo — the validator behind the Custom box and POST /api/log', () => {
  it('is the same shape this suite independently specifies', () => {
    expect(TEMPO_PATTERN.source).toBe(TEMPO_NOTATION.source);
  });

  it.each(TEMPO_PRESETS)('accepts the preset "%s"', (preset) => {
    expect(isValidTempo(preset)).toBe(true);
  });

  it.each([
    ['banana', 'free text — the original defect: this was a loggable tempo'],
    ['2-1-X', 'the old placeholder: X (explosive) is a different convention'],
    ['3-1-2-0', 'four digits — rejected per Dino, 2026-10-08'],
    ['3-1', 'two phases'],
    ['31 1', 'no hyphens'],
    ['3--1', 'empty phase'],
    ['10-1-1', 'two-digit phase: out of scope by the three-digit decision'],
    ['3-1-1 ', 'trailing space'],
    [' 3-1-1', 'leading space'],
    ['', 'the timed-mode sentinel is not a tempo'],
  ])('rejects %j (%s)', (bad) => {
    expect(isValidTempo(bad)).toBe(false);
  });

  it('uses a placeholder that is itself valid and a real preset', () => {
    // The old placeholder taught the wrong notation; the suite now stops that
    // from happening again rather than just having fixed it once.
    expect(isValidTempo(TEMPO_PLACEHOLDER)).toBe(true);
    expect(TEMPO_PRESETS).toContain(TEMPO_PLACEHOLDER as (typeof TEMPO_PRESETS)[number]);
  });
});

describe('isStorableTempo — the boundary POST /api/log enforces', () => {
  it('allows the timed-mode sentinel and null, which are "no tempo", not bad tempo', () => {
    expect(isStorableTempo('')).toBe(true);
    expect(isStorableTempo(null)).toBe(true);
    expect(isStorableTempo(undefined)).toBe(true);
  });

  it('allows every preset', () => {
    for (const preset of TEMPO_PRESETS) expect(isStorableTempo(preset)).toBe(true);
  });

  it('refuses garbage, so a stale client cannot write an unreadable tempo', () => {
    expect(isStorableTempo('banana')).toBe(false);
    expect(isStorableTempo('2-1-X')).toBe(false);
  });
});

describe('known gaps — NOT fixed here (this suite may not edit production code)', () => {
  // Gap #2. Logged tempo surfaces only inside the live workout session. The
  // progressive-overload sparkline reads max(weight) only, and
  // ExerciseDetailSheet's "@ 3-1-1" is the PROFILE RECOMMENDATION, not what was
  // actually logged — so tempo history cannot be reviewed after the session.
  it.todo('surfaces the tempo actually logged in the exercise history view');
});
