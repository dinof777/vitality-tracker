import { describe, it, expect } from 'vitest';
import {
  isMetricType,
  validateMetricValue,
  validateRecordedAt,
  clampNote,
  summarizeMetricRows,
  toHistory,
  NOTE_MAX_LEN,
  type MetricRow,
} from './client-metrics';

// Pure logic only — no mocking needed. Covers the exact boundaries Priya's
// handoff calls out: weight_kg 20-400, hrv_ms 1-300, on/just-inside/
// just-outside for both, plus the ordering contract that
// components/charts/Sparkline.tsx depends on (oldest-first, last = latest).

describe('isMetricType', () => {
  it('accepts only the two known metric types', () => {
    expect(isMetricType('weight_kg')).toBe(true);
    expect(isMetricType('hrv_ms')).toBe(true);
    expect(isMetricType('height_cm')).toBe(false);
    expect(isMetricType(undefined)).toBe(false);
    expect(isMetricType(null)).toBe(false);
    expect(isMetricType(42)).toBe(false);
  });
});

describe('validateMetricValue — weight_kg (20-400)', () => {
  it('accepts the boundary values themselves (20 and 400)', () => {
    expect(validateMetricValue('weight_kg', 20)).toEqual({ ok: true, value: 20 });
    expect(validateMetricValue('weight_kg', 400)).toEqual({ ok: true, value: 400 });
  });

  it('accepts values just inside the range', () => {
    expect(validateMetricValue('weight_kg', 20.1)).toEqual({ ok: true, value: 20.1 });
    expect(validateMetricValue('weight_kg', 399.9)).toEqual({ ok: true, value: 399.9 });
  });

  it('rejects values just outside the range', () => {
    expect(validateMetricValue('weight_kg', 19.999).ok).toBe(false);
    expect(validateMetricValue('weight_kg', 400.001).ok).toBe(false);
  });

  it('rejects far-outside values (negative, absurd)', () => {
    expect(validateMetricValue('weight_kg', -5).ok).toBe(false);
    expect(validateMetricValue('weight_kg', 9000).ok).toBe(false);
  });
});

describe('validateMetricValue — hrv_ms (1-300)', () => {
  it('accepts the boundary values themselves (1 and 300)', () => {
    expect(validateMetricValue('hrv_ms', 1)).toEqual({ ok: true, value: 1 });
    expect(validateMetricValue('hrv_ms', 300)).toEqual({ ok: true, value: 300 });
  });

  it('accepts values just inside the range', () => {
    expect(validateMetricValue('hrv_ms', 1.5)).toEqual({ ok: true, value: 1.5 });
    expect(validateMetricValue('hrv_ms', 299.9)).toEqual({ ok: true, value: 299.9 });
  });

  it('rejects values just outside the range', () => {
    expect(validateMetricValue('hrv_ms', 0.999).ok).toBe(false);
    expect(validateMetricValue('hrv_ms', 300.001).ok).toBe(false);
  });

  it('rejects zero and negative values', () => {
    expect(validateMetricValue('hrv_ms', 0).ok).toBe(false);
    expect(validateMetricValue('hrv_ms', -1).ok).toBe(false);
  });
});

describe('validateMetricValue — non-numeric / missing input (both types)', () => {
  it('rejects null, undefined, empty string, and NaN-producing strings', () => {
    expect(validateMetricValue('weight_kg', null).ok).toBe(false);
    expect(validateMetricValue('weight_kg', undefined).ok).toBe(false);
    expect(validateMetricValue('weight_kg', '').ok).toBe(false);
    expect(validateMetricValue('weight_kg', 'not-a-number').ok).toBe(false);
  });

  it('coerces a numeric string to a number', () => {
    expect(validateMetricValue('weight_kg', '75.5')).toEqual({ ok: true, value: 75.5 });
  });
});

describe('validateRecordedAt', () => {
  it('defaults to "now" (ISO string) when omitted, null, or empty', () => {
    for (const raw of [undefined, null, '']) {
      const result = validateRecordedAt(raw);
      expect(result.ok).toBe(true);
      expect(result.iso).toBeDefined();
      expect(new Date(result.iso!).toString()).not.toBe('Invalid Date');
    }
  });

  it('accepts a valid ISO date string and normalizes it', () => {
    const result = validateRecordedAt('2026-01-15T10:00:00.000Z');
    expect(result.ok).toBe(true);
    expect(result.iso).toBe('2026-01-15T10:00:00.000Z');
  });

  it('rejects an unparseable date string', () => {
    const result = validateRecordedAt('not-a-date');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects garbage types coerced through String()', () => {
    // e.g. a stray object/array in the body — String({}) -> "[object Object]"
    const result = validateRecordedAt({ foo: 'bar' });
    expect(result.ok).toBe(false);
  });
});

describe('clampNote', () => {
  it('returns null for undefined/null', () => {
    expect(clampNote(undefined)).toBeNull();
    expect(clampNote(null)).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(clampNote('   ')).toBeNull();
  });

  it('trims and slices to NOTE_MAX_LEN', () => {
    const long = 'x'.repeat(NOTE_MAX_LEN + 50);
    const result = clampNote(long);
    expect(result).toHaveLength(NOTE_MAX_LEN);
    expect(result).toBe('x'.repeat(NOTE_MAX_LEN));
  });

  it('passes short notes through trimmed', () => {
    expect(clampNote('  felt strong today  ')).toBe('felt strong today');
  });
});

describe('summarizeMetricRows — ordering contract', () => {
  it('returns { current: null, starting: null } for an empty array', () => {
    expect(summarizeMetricRows([])).toEqual({ current: null, starting: null });
  });

  it('picks starting = earliest, current = latest, given OUT-OF-ORDER input', () => {
    const rows: MetricRow[] = [
      { value: 82, recorded_at: '2026-03-01T00:00:00.000Z' }, // middle
      { value: 90, recorded_at: '2026-01-01T00:00:00.000Z' }, // earliest
      { value: 78, recorded_at: '2026-06-01T00:00:00.000Z' }, // latest
    ];
    const { current, starting } = summarizeMetricRows(rows);
    expect(starting).toEqual({ value: 90, recordedAt: '2026-01-01T00:00:00.000Z' });
    expect(current).toEqual({ value: 78, recordedAt: '2026-06-01T00:00:00.000Z' });
  });

  it('does not mutate the input array', () => {
    const rows: MetricRow[] = [
      { value: 2, recorded_at: '2026-02-01T00:00:00.000Z' },
      { value: 1, recorded_at: '2026-01-01T00:00:00.000Z' },
    ];
    const copy = [...rows];
    summarizeMetricRows(rows);
    expect(rows).toEqual(copy);
  });

  it('coerces string numeric values (as node-postgres/neon can return for `numeric` columns)', () => {
    const rows: MetricRow[] = [{ value: '84.500', recorded_at: '2026-01-01T00:00:00.000Z' }];
    const { current, starting } = summarizeMetricRows(rows);
    expect(current?.value).toBe(84.5);
    expect(starting?.value).toBe(84.5);
  });

  it('single row is both starting and current', () => {
    const rows: MetricRow[] = [{ value: 70, recorded_at: '2026-01-01T00:00:00.000Z' }];
    const { current, starting } = summarizeMetricRows(rows);
    expect(current).toEqual(starting);
  });
});

describe('toHistory — ordering contract (Sparkline consumes last = latest)', () => {
  it('returns an oldest-first array given out-of-order rows', () => {
    const rows: MetricRow[] = [
      { value: 3, recorded_at: '2026-03-01T00:00:00.000Z' },
      { value: 1, recorded_at: '2026-01-01T00:00:00.000Z' },
      { value: 2, recorded_at: '2026-02-01T00:00:00.000Z' },
    ];
    const history = toHistory(rows);
    expect(history.map((p) => p.value)).toEqual([1, 2, 3]);
    // The explicit contract Sparkline.tsx relies on: last element = latest.
    expect(history[history.length - 1]).toEqual({ value: 3, recordedAt: '2026-03-01T00:00:00.000Z' });
  });

  it('returns an empty array for empty input', () => {
    expect(toHistory([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const rows: MetricRow[] = [
      { value: 2, recorded_at: '2026-02-01T00:00:00.000Z' },
      { value: 1, recorded_at: '2026-01-01T00:00:00.000Z' },
    ];
    const copy = [...rows];
    toHistory(rows);
    expect(rows).toEqual(copy);
  });
});
