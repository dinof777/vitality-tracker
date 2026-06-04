'use client';

import { useEffect, useRef, useState } from 'react';

interface RestTimerProps {
  onDismiss?: () => void;
}

const PRESETS = [30, 60, 90];

// Minimal rest timer: tap a preset to auto-start a countdown. Vibrates at 0
// (where supported), flashes the readout in the energy color for the last 10s.
export default function RestTimer({ onDismiss }: RestTimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = (seconds: number) => {
    clear();
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clear();
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(200);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clean up the interval if the component unmounts mid-countdown.
  useEffect(() => clear, []);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const isLow = remaining !== null && remaining <= 10;

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-muted">REST TIMER</span>
        <button
          type="button"
          onClick={() => {
            clear();
            setRemaining(null);
            onDismiss?.();
          }}
          className="h-8 rounded-md px-3 text-caption font-semibold text-text-muted active:bg-surface-raised"
        >
          Skip
        </button>
      </div>

      {remaining !== null ? (
        <p
          className={`text-center text-display nums ${
            isLow ? 'animate-pulse text-energy' : 'text-text-primary'
          }`}
        >
          {fmt(remaining)}
        </p>
      ) : (
        <p className="text-center text-display nums text-text-faint">0:00</p>
      )}

      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => start(p)}
            className="h-12 flex-1 rounded-md border border-border text-label text-text-primary transition-all duration-150 active:scale-[0.97] active:bg-surface-raised"
          >
            {p}s
          </button>
        ))}
      </div>
    </div>
  );
}
