// Pure validation + aggregation for client_metrics (weight_kg, hrv_ms) — no
// I/O here. The DB adapter (lib/client-portal-db.ts) is the thin, mockable
// layer that calls these; keeping the ranges/aggregation here means Sami can
// regression-test them without touching Postgres. See
// 04_Agents_Workspace/Software_Dev/vitality-tracker-trainee-portal/
// SCOPE_and_datasource.md §2b for the product reasoning.

export type MetricType = 'weight_kg' | 'hrv_ms';
export const METRIC_TYPES: readonly MetricType[] = ['weight_kg', 'hrv_ms'];

export function isMetricType(v: unknown): v is MetricType {
  return v === 'weight_kg' || v === 'hrv_ms';
}

// Sane physiological bounds — reject typos/garbage (negative, absurd), not a
// medical validator. weight_kg: adult body weight. hrv_ms: RMSSD-style
// readings from consumer wearables / manual entry, generally single- to
// low-triple-digit milliseconds.
const RANGES: Record<MetricType, { min: number; max: number }> = {
  weight_kg: { min: 20, max: 400 },
  hrv_ms: { min: 1, max: 300 },
};

export interface ValueValidation {
  ok: boolean;
  value?: number;
  error?: string;
}

export function validateMetricValue(type: MetricType, raw: unknown): ValueValidation {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (raw === null || raw === undefined || raw === '' || !Number.isFinite(value)) {
    return { ok: false, error: 'value is required and must be a number.' };
  }
  const range = RANGES[type];
  if (value < range.min || value > range.max) {
    return { ok: false, error: `value must be between ${range.min} and ${range.max} for ${type}.` };
  }
  return { ok: true, value };
}

export interface DateValidation {
  ok: boolean;
  iso?: string;
  error?: string;
}

/** Validates an optional caller-supplied recordedAt; defaults to now. */
export function validateRecordedAt(raw: unknown): DateValidation {
  if (raw === undefined || raw === null || raw === '') return { ok: true, iso: new Date().toISOString() };
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return { ok: false, error: 'recordedAt must be a valid date.' };
  return { ok: true, iso: d.toISOString() };
}

export const NOTE_MAX_LEN = 240;

export function clampNote(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().slice(0, NOTE_MAX_LEN);
  return s || null;
}

export interface MetricPoint {
  value: number;
  recordedAt: string;
}

/** Row shape as read back from client_metrics (snake_case, value possibly a
 * numeric-as-string the way node-postgres/neon can return `numeric`). */
export interface MetricRow {
  value: number | string;
  recorded_at: string;
}

function toPoint(r: MetricRow): MetricPoint {
  return { value: Number(r.value), recordedAt: r.recorded_at };
}

function byRecordedAtAsc(a: MetricRow, b: MetricRow): number {
  return new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
}

/** current = latest row, starting = earliest row — no separate "starting"
 * column by design: it's always the first-ever entry for this client +
 * metric type, so it can't drift from reality (see 0013's comment). */
export function summarizeMetricRows(rows: MetricRow[]): { current: MetricPoint | null; starting: MetricPoint | null } {
  if (rows.length === 0) return { current: null, starting: null };
  const sorted = [...rows].sort(byRecordedAtAsc);
  return { starting: toPoint(sorted[0]), current: toPoint(sorted[sorted.length - 1]) };
}

/** Oldest-first — matches components/charts/Sparkline.tsx's expectation
 * (it marks the LAST element as "latest"). */
export function toHistory(rows: MetricRow[]): MetricPoint[] {
  return [...rows].sort(byRecordedAtAsc).map(toPoint);
}

/** BMI is derived at read time, never stored (Elena §2b/§7) — computed from
 * height_cm + the latest weight_kg reading. Returns null (not a wrong
 * number) whenever either input is missing, so the trainee portal can omit
 * the BMI card entirely rather than show something misleading. Standard
 * kg/m² formula, rounded to 1 decimal. */
export function computeBmi(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (heightCm === null || heightCm === undefined || weightKg === null || weightKg === undefined) return null;
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}
