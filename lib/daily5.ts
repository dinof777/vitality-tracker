// Daily 5 — Brian Pruett's non-negotiable daily practices. Edit this list to
// change the checklist. Keys are stored in localStorage / mobility_logs.
export interface Daily5Item {
  key: string;
  label: string;
  subtitle: string;
}

export const DAILY_5: Daily5Item[] = [
  { key: 'morning_mobility', label: 'Morning Mobility Flow', subtitle: '4–7 minutes of movement' },
  { key: 'mindful_movement', label: 'Mindful Movement', subtitle: 'Walk, play, or non-gym activity' },
  { key: 'mental_checkin', label: 'Mental Check-in', subtitle: '1-minute intention or gratitude' },
  { key: 'hydration', label: 'Hydration', subtitle: '64oz+ water today' },
  { key: 'recovery', label: 'Recovery', subtitle: 'Sleep 7h+ or active recovery' },
];

// Local date as YYYY-MM-DD (not UTC — the day flips at the user's midnight).
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

const storageKey = (dateStr: string) => `daily5_${dateStr}`;

export function loadDay(dateStr: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(dateStr));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveDay(dateStr: string, checkedKeys: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(dateStr), JSON.stringify(checkedKeys));
}

const isComplete = (checked: string[]) =>
  DAILY_5.every((item) => checked.includes(item.key));

// Streak = consecutive fully-complete days ending today (if today is complete)
// or ending yesterday (if today isn't done yet). Scans localStorage backwards.
export function computeStreak(today = new Date()): number {
  if (typeof window === 'undefined') return 0;
  let streak = 0;
  const cursor = new Date(today);

  // If today isn't complete, the streak is whatever ran through yesterday.
  if (!isComplete(loadDay(dateKey(cursor)))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  // Walk back while each day is fully complete.
  for (let i = 0; i < 3650; i++) {
    if (isComplete(loadDay(dateKey(cursor)))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function isDayComplete(checked: string[]): boolean {
  return isComplete(checked);
}
