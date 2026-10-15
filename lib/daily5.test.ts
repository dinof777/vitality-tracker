import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DAILY_5,
  dateKey,
  computeStreak,
  isDayComplete,
  loadDay,
  saveDay,
} from './daily5';

// lib/daily5.ts reads and writes window.localStorage directly and short-circuits
// to [] / 0 when `window` is undefined. There is no jsdom in this repo (every
// other suite is pure node), so the suite installs a minimal in-memory
// localStorage on globalThis.window rather than pulling in a DOM. The stub is
// the whole point of several tests below: clearing it IS the "reinstalled the
// PWA / cleared Safari website data" scenario this card exists to pin down.
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

function removeWindow() {
  delete (globalThis as { window?: unknown }).window;
}

const ALL_KEYS = DAILY_5.map((i) => i.key);

// A fixed "today" so the suite never flips at midnight or on a date boundary.
const TODAY = new Date(2026, 9, 8); // 2026-10-08, local time

function daysBefore(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

/** Record a fully-complete day `n` days before TODAY. */
function completeDay(n: number) {
  saveDay(dateKey(daysBefore(n)), ALL_KEYS);
}

let ls: Stub;

beforeEach(() => {
  ls = installLocalStorage();
});

afterEach(() => {
  removeWindow();
});

describe('isDayComplete', () => {
  it('needs every Daily 5 item, not just most of them', () => {
    expect(isDayComplete(ALL_KEYS)).toBe(true);
    expect(isDayComplete(ALL_KEYS.slice(0, -1))).toBe(false);
    expect(isDayComplete([])).toBe(false);
  });

  it('ignores unknown keys left over from an older checklist', () => {
    expect(isDayComplete([...ALL_KEYS, 'retired_item'])).toBe(true);
    expect(isDayComplete(['retired_item'])).toBe(false);
  });
});

describe('loadDay / saveDay', () => {
  it('round-trips the ticked keys for a date', () => {
    saveDay('2026-10-08', ['hydration']);
    expect(loadDay('2026-10-08')).toEqual(['hydration']);
  });

  it('returns [] for a day that was never logged', () => {
    expect(loadDay('1999-01-01')).toEqual([]);
  });

  it('treats corrupt stored JSON as an empty day instead of throwing', () => {
    // A half-written localStorage value is a real possibility when Safari
    // evicts storage mid-write; the checklist must still render.
    ls.store.set('daily5_2026-10-08', '{not json');
    expect(() => loadDay('2026-10-08')).not.toThrow();
    expect(loadDay('2026-10-08')).toEqual([]);
  });

  it('is a no-op without a window (server render) rather than a crash', () => {
    removeWindow();
    expect(() => saveDay('2026-10-08', ALL_KEYS)).not.toThrow();
    expect(loadDay('2026-10-08')).toEqual([]);
  });
});

describe('computeStreak', () => {
  it('is 0 on a fresh install with nothing logged', () => {
    expect(computeStreak(TODAY)).toBe(0);
  });

  it('counts consecutive complete days ending today', () => {
    completeDay(0);
    completeDay(1);
    completeDay(2);
    expect(computeStreak(TODAY)).toBe(3);
  });

  it('keeps yesterday-ending streaks alive while today is unfinished', () => {
    completeDay(1);
    completeDay(2);
    // Today only partially ticked — the streak should still read 2, not 0.
    saveDay(dateKey(TODAY), ALL_KEYS.slice(0, 2));
    expect(computeStreak(TODAY)).toBe(2);
  });

  it('stops at the first missed day', () => {
    completeDay(0);
    completeDay(1);
    completeDay(3); // day 2 missed
    expect(computeStreak(TODAY)).toBe(2);
  });

  it('does not count a partially-completed day inside the run', () => {
    completeDay(0);
    saveDay(dateKey(daysBefore(1)), ALL_KEYS.slice(0, -1));
    completeDay(2);
    expect(computeStreak(TODAY)).toBe(1);
  });

  it('crosses a month boundary', () => {
    const d = new Date(2026, 10, 2); // 2026-11-02
    for (const day of ['2026-11-02', '2026-11-01', '2026-10-31']) {
      saveDay(day, ALL_KEYS);
    }
    expect(computeStreak(d)).toBe(3);
  });

  it('is 0 without a window (server render)', () => {
    completeDay(0);
    removeWindow();
    expect(computeStreak(TODAY)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The regression this card is about.
//
// lib/daily5.ts is the on-device half and is deliberately still localStorage-
// only: a cleared store means a streak of 0 *as far as this module is
// concerned*. That is correct behaviour for it, not the bug — the bug was that
// nothing else ever put the days back. The restore path lives in
// lib/daily5-sync.ts (`restoreDays`), is driven by app/daily5/page.tsx on
// mount, and is proven end-to-end in lib/daily5-sync.test.ts, including the
// 12-day streak coming back to 12.
//
// These tests pin the on-device contract the restore path depends on: the loss
// is total and silent without it, and partial survival is counted honestly.
// ---------------------------------------------------------------------------
describe('streak survival after a localStorage clear (PWA reinstall / Safari data cleared)', () => {
  it('on-device only: a 12-day streak reads 0 after a clear, until something restores the days', () => {
    for (let n = 0; n < 12; n++) completeDay(n);
    expect(computeStreak(TODAY)).toBe(12);

    ls.clear(); // delete from Home Screen + reinstall, or Clear Website Data

    expect(computeStreak(TODAY)).toBe(0);
    expect(loadDay(dateKey(TODAY))).toEqual([]);
  });

  it('comes back cleanly rather than half-broken: today re-ticks to a streak of 1', () => {
    for (let n = 1; n < 6; n++) completeDay(n);
    ls.clear();

    // The user reopens the reinstalled app and ticks all five again.
    saveDay(dateKey(TODAY), ALL_KEYS);
    expect(computeStreak(TODAY)).toBe(1);
  });

  it('a partial clear that leaves older days intact rebuilds the real streak', () => {
    // Safari evicts selectively under storage pressure; whatever survives
    // should still be counted, and the streak should stop at the hole.
    for (let n = 0; n < 5; n++) completeDay(n);
    ls.store.delete(`daily5_${dateKey(daysBefore(2))}`);
    expect(computeStreak(TODAY)).toBe(2);
  });
});
