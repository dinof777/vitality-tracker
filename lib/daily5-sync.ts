// Daily 5 cloud sync — the restore half of the loop.
//
// lib/daily5.ts owns the on-device store and the streak arithmetic and stays
// the authority while the app is running: localStorage is written first and is
// what the badge reads, so the checklist keeps working with no network. This
// module is what stops the streak dying with the store. It does two things,
// both pure enough to test without a DOM or a database:
//
//   1. reads the local history back out so it can be pushed to the cloud once,
//   2. merges cloud days INTO localStorage, local always winning.
//
// IT HOLDS NO IDENTITY. Who a row belongs to is decided server-side from the
// httpOnly `vt_device` cookie (lib/device.ts, migration 0014_device_identity).
// An earlier draft of this module minted its own `d:<uuid>` key into
// localStorage and sent it in a header; that was deleted, because a key living
// in localStorage dies with localStorage — which is the exact failure this
// module exists to fix. The cookie survives a localStorage clear; a
// localStorage key cannot.
//
// Why local wins on a merge: the device is the only place a tick can happen
// offline, so a local day is either newer than the cloud copy or identical to
// it. Letting the cloud overwrite would resurrect a day the user un-ticked
// while offline.

/** How far back the local scan and the cloud read go. ~13 months of streak. */
export const LOOKBACK_DAYS = 400;

export interface CloudDay {
  logged_date: string;
  completed_items: unknown;
}

export interface LocalDay {
  date: string;
  completedItems: string[];
}

// Date helpers are duplicated from lib/daily5.ts rather than imported so this
// module stays importable from a server route without dragging the DOM-reading
// half of daily5.ts along. They are three lines and fully covered by tests.
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normalize whatever the driver hands back for a `date` column to YYYY-MM-DD. */
export function normalizeDate(v: unknown): string | null {
  if (typeof v === 'string') {
    const d = v.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }
  if (v instanceof Date) return dateKey(v);
  return null;
}

function parseItems(v: unknown): string[] | null {
  const raw = typeof v === 'string' ? safeJson(v) : v;
  if (!Array.isArray(raw)) return null;
  return raw.filter((x): x is string => typeof x === 'string');
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Every day with something ticked in the local store, newest first. Walks back
 * day by day rather than enumerating localStorage keys: the store is shared
 * with the rest of the app, and a date walk cannot pick up an unrelated key.
 */
export function localHistory(today = new Date(), lookbackDays = LOOKBACK_DAYS): LocalDay[] {
  if (typeof window === 'undefined') return [];
  const out: LocalDay[] = [];
  const cursor = new Date(today);
  for (let i = 0; i < lookbackDays; i++) {
    const date = dateKey(cursor);
    let items: string[] | null = null;
    try {
      const raw = window.localStorage.getItem(`daily5_${date}`);
      items = raw ? parseItems(raw) : null;
    } catch {
      items = null;
    }
    if (items && items.length > 0) out.push({ date, completedItems: items });
    cursor.setDate(cursor.getDate() - 1);
  }
  return out;
}

export function hasLocalHistory(today = new Date(), lookbackDays = LOOKBACK_DAYS): boolean {
  return localHistory(today, lookbackDays).length > 0;
}

/**
 * Should this device push its local history to the cloud?
 *
 * Derived from state, never from a stored flag. The earlier draft remembered
 * "already pushed" in localStorage keyed on the owner key; with the identity
 * now in an httpOnly cookie the client cannot read that key, and a bare
 * boolean would be worse than nothing — if the cookie is ever replaced, a
 * stale `true` would suppress the push forever and the new identity would own
 * no history at all.
 *
 * `cloudCount` is the number of days GET /api/mobility returned for this
 * device. Zero days in the cloud plus days on the device means the cloud copy
 * has never been written under this identity, so push. It is idempotent (the
 * next read returns a non-zero count) and self-correcting on a new cookie.
 *
 * KNOWN LIMIT, deliberately accepted: the push only runs when the cloud is
 * *completely* empty for this device. A device that is one day ahead of the
 * cloud does not re-push the gap — today's own POST covers today, and a
 * per-day diff is a bigger mechanism than the failure justifies.
 */
export function shouldPushHistory(
  cloudCount: number,
  today = new Date(),
  lookbackDays = LOOKBACK_DAYS,
): boolean {
  if (cloudCount > 0) return false;
  return hasLocalHistory(today, lookbackDays);
}

/**
 * Write cloud days into localStorage for dates the device has nothing for.
 * Returns how many days were actually restored. A date the device already
 * knows about is left alone (see the header note on local winning).
 */
export function restoreDays(rows: CloudDay[]): number {
  if (typeof window === 'undefined') return 0;
  let restored = 0;
  for (const row of rows) {
    const date = normalizeDate(row.logged_date);
    const items = parseItems(row.completed_items);
    if (!date || !items || items.length === 0) continue;
    try {
      if (window.localStorage.getItem(`daily5_${date}`) !== null) continue;
      window.localStorage.setItem(`daily5_${date}`, JSON.stringify(items));
      restored++;
    } catch {
      /* storage full or unavailable — restore what we can, skip the rest */
    }
  }
  return restored;
}
