import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DAILY_5, computeStreak, dateKey, saveDay } from './daily5';
import {
  LOOKBACK_DAYS,
  hasLocalHistory,
  localHistory,
  normalizeDate,
  restoreDays,
  shouldPushHistory,
} from './daily5-sync';

// Same in-memory localStorage stub as lib/daily5.test.ts — no jsdom in this
// repo, every suite is pure node. Clearing the stub IS the "reinstalled the
// PWA / cleared Safari website data" scenario, and the point of this file is
// that the streak now comes BACK from the cloud copy afterwards.
interface Stub {
  store: Map<string, string>;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  clear(): void;
}

function installLocalStorage(): Stub {
  const store = new Map<string, string>();
  const stub: Stub = {
    store,
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => void store.set(k, v),
    clear: () => store.clear(),
  };
  (globalThis as { window?: unknown }).window = { localStorage: stub };
  return stub;
}

/** A stub whose writes always throw — Safari private mode / quota exceeded. */
function installReadOnlyStorage(): void {
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    },
  };
}

function removeWindow() {
  delete (globalThis as { window?: unknown }).window;
}

const ALL_KEYS = DAILY_5.map((i) => i.key);
const TODAY = new Date(2026, 9, 8); // 2026-10-08, local time

function daysBefore(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

/** A cloud row as the route returns it (jsonb array already parsed). */
function cloudDay(n: number, items: string[] = ALL_KEYS) {
  return { logged_date: dateKey(daysBefore(n)), completed_items: items };
}

let ls: Stub;

beforeEach(() => {
  ls = installLocalStorage();
});

afterEach(() => {
  removeWindow();
});

// This module deliberately holds NO identity: who a row belongs to is decided
// server-side from the httpOnly `vt_device` cookie (lib/device.ts, covered by
// lib/device.test.ts). An earlier draft minted a `d:<uuid>` key into
// localStorage and its tests lived here; both were deleted, because a key in
// localStorage dies with localStorage — the exact failure this module exists
// to fix. Nothing here should ever read or mint an owner id again.

describe('normalizeDate', () => {
  it('accepts what the driver can hand back for a date column', () => {
    expect(normalizeDate('2026-10-08')).toBe('2026-10-08');
    expect(normalizeDate('2026-10-08T00:00:00.000Z')).toBe('2026-10-08');
    expect(normalizeDate(new Date(2026, 9, 8))).toBe('2026-10-08');
  });

  it('rejects anything else', () => {
    expect(normalizeDate('8 Oct 2026')).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(17)).toBeNull();
  });
});

describe('localHistory', () => {
  it('returns every day with something ticked, newest first', () => {
    saveDay(dateKey(daysBefore(0)), ALL_KEYS);
    saveDay(dateKey(daysBefore(2)), ['hydration']);
    expect(localHistory(TODAY)).toEqual([
      { date: '2026-10-08', completedItems: ALL_KEYS },
      { date: '2026-10-06', completedItems: ['hydration'] },
    ]);
  });

  it('ignores empty days, corrupt values and unrelated keys', () => {
    saveDay(dateKey(daysBefore(1)), []); // ticked then un-ticked
    ls.store.set(`daily5_${dateKey(daysBefore(3))}`, '{not json');
    ls.store.set('vitality_account', JSON.stringify({ name: 'Dino' }));
    expect(localHistory(TODAY)).toEqual([]);
  });

  it('stops at the lookback horizon rather than scanning forever', () => {
    saveDay(dateKey(daysBefore(LOOKBACK_DAYS + 5)), ALL_KEYS);
    expect(localHistory(TODAY)).toEqual([]);
    expect(localHistory(TODAY, LOOKBACK_DAYS + 10)).toHaveLength(1);
  });

  it('is empty on the server rather than throwing', () => {
    saveDay(dateKey(TODAY), ALL_KEYS);
    removeWindow();
    expect(localHistory(TODAY)).toEqual([]);
    expect(hasLocalHistory(TODAY)).toBe(false);
  });
});

describe('shouldPushHistory', () => {
  // Derived from state, never from a stored flag. The replaced version
  // remembered "already pushed" in localStorage keyed on an owner key the
  // client can no longer read; a bare boolean would have been worse, because a
  // stale `true` after a cookie change would suppress the push forever and the
  // new identity would own no history at all.
  it('pushes when the device has days and the cloud has none', () => {
    saveDay(dateKey(TODAY), ALL_KEYS);
    expect(shouldPushHistory(0, TODAY)).toBe(true);
  });

  it('does not push once the cloud holds anything for this device', () => {
    saveDay(dateKey(TODAY), ALL_KEYS);
    expect(shouldPushHistory(1, TODAY)).toBe(false);
    expect(shouldPushHistory(12, TODAY)).toBe(false);
  });

  it('does not push for a genuinely new device with nothing to send', () => {
    expect(shouldPushHistory(0, TODAY)).toBe(false);
  });

  it('is idempotent: the count the push produces switches it off', () => {
    for (let n = 0; n < 12; n++) saveDay(dateKey(daysBefore(n)), ALL_KEYS);
    expect(shouldPushHistory(0, TODAY)).toBe(true);
    // …the client POSTs localHistory(), so the next read returns that many.
    expect(shouldPushHistory(localHistory(TODAY).length, TODAY)).toBe(false);
  });

  it('does not push on the server, where there is no local store to read', () => {
    saveDay(dateKey(TODAY), ALL_KEYS);
    removeWindow();
    expect(shouldPushHistory(0, TODAY)).toBe(false);
  });

  it('does not push when storage refuses reads, rather than throwing', () => {
    // Safari private mode / locked-down privacy settings: nothing readable
    // locally, so there is nothing to send and the restore branch is the right
    // one anyway.
    installReadOnlyStorage();
    expect(() => shouldPushHistory(0, TODAY)).not.toThrow();
    expect(shouldPushHistory(0, TODAY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The fix this card is named for (option A, answered on the card 2026-10-08).
// ---------------------------------------------------------------------------
describe('restoreDays — the streak survives a reinstall', () => {
  it('brings a 12-day streak back after the store is cleared', () => {
    for (let n = 0; n < 12; n++) saveDay(dateKey(daysBefore(n)), ALL_KEYS);
    expect(computeStreak(TODAY)).toBe(12);

    // The cloud copy, as GET /api/mobility returns it for this owner.
    const cloud = Array.from({ length: 12 }, (_, n) => cloudDay(n));

    ls.clear(); // delete from Home Screen + reinstall, or Clear Website Data
    expect(computeStreak(TODAY)).toBe(0); // the loss this card reported

    expect(restoreDays(cloud)).toBe(12);
    expect(computeStreak(TODAY)).toBe(12); // …and it is back
  });

  it('never overwrites a day the device already has — local wins', () => {
    // The user ticked three items today while offline; the cloud still holds
    // yesterday's complete copy of today. Restoring must not resurrect it.
    const partial = ALL_KEYS.slice(0, 3);
    saveDay(dateKey(TODAY), partial);

    expect(restoreDays([cloudDay(0), cloudDay(1)])).toBe(1); // only yesterday
    expect(JSON.parse(ls.store.get(`daily5_${dateKey(TODAY)}`) as string)).toEqual(partial);
  });

  it('skips rows it cannot trust instead of writing garbage into the store', () => {
    const restored = restoreDays([
      { logged_date: 'yesterday', completed_items: ALL_KEYS },
      { logged_date: dateKey(daysBefore(1)), completed_items: 'not an array' },
      { logged_date: dateKey(daysBefore(2)), completed_items: [] },
      { logged_date: dateKey(daysBefore(3)), completed_items: ['hydration', 7, null] },
    ]);
    expect(restored).toBe(1);
    expect(JSON.parse(ls.store.get(`daily5_${dateKey(daysBefore(3))}`) as string)).toEqual(['hydration']);
    expect(ls.store.has(`daily5_${dateKey(daysBefore(2))}`)).toBe(false);
  });

  it('accepts completed_items as a JSON string, in case the driver does not parse jsonb', () => {
    expect(restoreDays([{ logged_date: '2026-10-07', completed_items: JSON.stringify(ALL_KEYS) }])).toBe(1);
  });

  it('restores what it can when storage starts rejecting writes, and never throws', () => {
    installReadOnlyStorage();
    expect(() => restoreDays([cloudDay(0)])).not.toThrow();
    expect(restoreDays([cloudDay(0)])).toBe(0);

    removeWindow();
    expect(restoreDays([cloudDay(0)])).toBe(0);
  });

  it('is a no-op on an empty cloud copy (a genuinely new user)', () => {
    expect(restoreDays([])).toBe(0);
    expect(computeStreak(TODAY)).toBe(0);
  });
});
