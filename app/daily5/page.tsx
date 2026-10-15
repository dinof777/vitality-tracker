'use client';

import { useEffect, useState } from 'react';
import ChecklistItem from '@/components/daily5/ChecklistItem';
import StreakBadge from '@/components/daily5/StreakBadge';
import {
  DAILY_5,
  computeStreak,
  isDayComplete,
  loadDay,
  saveDay,
  todayKey,
} from '@/lib/daily5';
import { hasLocalHistory, localHistory, restoreDays, shouldPushHistory } from '@/lib/daily5-sync';

export default function Daily5Page() {
  const [checked, setChecked] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [celebrated, setCelebrated] = useState(false);
  const [ready, setReady] = useState(false);
  // Flips once the cloud pass below has run (or failed). Until then nothing is
  // POSTed: on a fresh install `checked` is [] and posting it immediately would
  // race the restore read and overwrite today's stored row with an empty one.
  const [synced, setSynced] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setChecked(loadDay(todayKey()));
    setStreak(computeStreak());
    setReady(true);
  }, []);

  // Cloud pass, once per mount. Two jobs, and which one runs depends entirely
  // on whether this device has any history of its own:
  //   • no local history (reinstalled, cleared Safari data, new device) →
  //     restore the owner's days from the database and recompute the streak.
  //     This is the read that never existed: every tick was already being
  //     written and nothing read it back, so the streak read 0 while the rows
  //     sat there intact.
  //   • local history, never pushed → send it up once, so the cloud copy holds
  //     the whole streak rather than only the days ticked since sync went live.
  // Offline or a 503 is not an error here: localStorage stays authoritative.
  //
  // No identity is sent or held: the device is identified server-side by the
  // httpOnly `vt_device` cookie the browser already carries (lib/device.ts).
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/mobility');
        if (!res.ok) return;
        const data = (await res.json()) as { logs?: unknown; count?: number };
        const logs = Array.isArray(data.logs) ? data.logs : [];
        const count = typeof data.count === 'number' ? data.count : logs.length;

        if (!hasLocalHistory()) {
          if (restoreDays(logs) > 0 && !cancelled) {
            setChecked(loadDay(todayKey()));
            setStreak(computeStreak());
          }
        } else if (shouldPushHistory(count)) {
          await fetch('/api/mobility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: localHistory() }),
          });
        }
      } catch {
        /* offline — the checklist works on-device; try again next mount */
      } finally {
        if (!cancelled) setSynced(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  // Persist + sync whenever the checklist changes (functional toggle below keeps
  // rapid taps correct; this effect handles the side effects once per commit).
  useEffect(() => {
    if (!ready) return;
    const today = todayKey();
    saveDay(today, checked); // localStorage first (offline-safe)
    const s = computeStreak();
    setStreak(s);
    if (!isDayComplete(checked)) setCelebrated(false);

    // Fire-and-forget cloud sync (no-op 503 until the database is wired).
    // Held until the restore pass has run — see `synced` above.
    if (!synced) return;
    void fetch('/api/mobility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, completedItems: checked, streakCount: s }),
    }).catch(() => {});
  }, [checked, ready, synced]);

  const toggle = (key: string) => {
    setChecked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const complete = isDayComplete(checked);

  const completeDay = () => {
    setCelebrated(true);
    setStreak(computeStreak());
  };

  return (
    <main className="shell-tight min-h-dvh px-4 pb-28 pt-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-label text-accent">DAILY 5</p>
          <h1 className="text-h1 text-text-primary">Live Elevated</h1>
        </div>
        <StreakBadge streak={streak} />
      </header>

      <div className="space-y-2">
        {DAILY_5.map((item) => (
          <ChecklistItem
            key={item.key}
            label={item.label}
            subtitle={item.subtitle}
            checked={ready && checked.includes(item.key)}
            onToggle={() => toggle(item.key)}
          />
        ))}
      </div>

      {complete && !celebrated && (
        <button
          type="button"
          onClick={completeDay}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          COMPLETE DAY
        </button>
      )}

      {complete && celebrated && (
        <p className="mt-6 rounded-md bg-energy/15 p-4 text-center text-h3 text-energy">
          Day complete! 🔥
        </p>
      )}
    </main>
  );
}
