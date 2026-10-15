/**
 * Parses the Daily 5 bulk-history payload posted to /api/mobility.
 * Lives outside the route file: a Next.js route may only export handlers and
 * route config, and the release build refused "parseDays" there.
 */
import { LOOKBACK_DAYS } from '@/lib/daily5-sync';

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DayInput {
  date: string;
  completedItems: string[];
  streakCount: number;
}

/** Validate + cap a bulk day payload. Returns null if the shape is wrong. */
export function parseDays(input: unknown): DayInput[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > LOOKBACK_DAYS) return null;
  const out: DayInput[] = [];
  for (const raw of input) {
    const d = raw as Partial<DayInput>;
    if (typeof d?.date !== 'string' || !ISO_DATE.test(d.date)) return null;
    const items = Array.isArray(d.completedItems)
      ? d.completedItems.filter((x): x is string => typeof x === 'string')
      : [];
    const streak = Number.isFinite(d.streakCount)
      ? Math.max(0, Math.trunc(d.streakCount as number))
      : 0;
    out.push({ date: d.date, completedItems: items, streakCount: streak });
  }
  return out;
}

// GET /api/mobility?date=YYYY-MM-DD — one day for this device.
// GET /api/mobility                 — this device's logged days, newest first.
//
// Before 0014, mobility_logs had a table-wide UNIQUE on logged_date, so there
// was exactly one Daily 5 row per calendar day for every visitor at once —
// whoever ticked last overwrote the rest, streak and all.
//
// The range read is the half that was missing: every tick was already being
// written and nothing ever read it back, so a reinstall or a cleared store
// showed a streak of 0 while the rows sat there intact. app/daily5/page.tsx
// calls this on mount.
//
// NEVER MINT A COOKIE ON A READ. lib/device.ts mints only in write routes,
// deliberately, to keep Set-Cookie off responses that may be cached. A browser
// with no cookie owns nothing, so empty is the honest answer, not an error.
