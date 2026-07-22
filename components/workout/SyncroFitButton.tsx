'use client';

import { useEffect, useState } from 'react';

export const SYNCROFIT_SITE = 'https://www.mysyncrofit.com';

// Handing a workout to SyncroFit fails SILENTLY when the app isn't installed —
// the custom-scheme link just does nothing, leaving you staring at an unchanged
// page. So we watch for that: if the page is still in front a moment after the
// tap, the app clearly didn't open, and we say so plainly instead of leaving the
// user to guess.
export default function SyncroFitButton({ url, disabled = false }: { url: string; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'failed'>('idle');
  const [showHow, setShowHow] = useState(false);
  const [canDeepLink, setCanDeepLink] = useState(true);

  // Custom schemes only resolve where the app can exist. On a desktop browser it
  // will never work, so say that up front rather than after a dead tap.
  useEffect(() => {
    setCanDeepLink(typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const open = () => {
    if (disabled) return;
    let settled = false;
    // Only a genuine backgrounding counts as success. `pagehide` is NOT safe here:
    // browsers fire it even when they cancel an unknown-scheme navigation, which
    // made a failed tap look like a success and hid the help.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        settled = true;
        setState('idle');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (!settled && document.visibilityState === 'visible') setState('failed');
    }, 1600);

    window.location.href = url;
  };

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        className={`flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        ⏱ SEND TO SYNCROFIT
      </button>

      {/* Desktop: the deep link can't work here, so don't let them find out the hard way. */}
      {!canDeepLink && state === 'idle' && (
        <p className="mt-2 rounded-md border border-border bg-surface p-3 text-caption text-text-muted">
          SyncroFit is a phone app — open this page on your phone to send the workout straight to it.
        </p>
      )}

      {/* The tap went nowhere. Explain, and give them the way out. */}
      {state === 'failed' && (
        <div className="mt-3 rounded-lg border border-accent/50 bg-accent/10 p-4">
          <p className="mb-1 text-body font-semibold text-text-primary">SyncroFit didn’t open</p>
          <p className="mb-3 text-caption text-text-muted">
            That almost always means it isn’t installed yet. SyncroFit is the free interval timer that actually runs
            this workout — it calls out every exercise, set and rest so you never touch your phone mid-set.
          </p>
          <a
            href={SYNCROFIT_SITE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent"
          >
            GET SYNCROFIT — FREE
          </a>
          <button
            type="button"
            onClick={() => {
              setState('idle');
              open();
            }}
            className="mt-2 w-full text-center text-caption text-accent underline"
          >
            Already installed? Try again
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowHow(!showHow)}
        className="mt-2 w-full text-center text-caption text-text-muted underline"
      >
        {showHow ? 'Hide' : 'What happens when I tap this?'}
      </button>

      {showHow && (
        <div className="mt-2 rounded-lg border border-border bg-surface p-3">
          <ol className="mb-2 list-inside list-decimal space-y-1 text-caption text-text-muted">
            <li>Tap the button — SyncroFit opens with this workout already loaded.</li>
            <li>Press start. It calls out each exercise, set and rest.</li>
            <li>When you finish, it reports back so your progress shows up here.</li>
          </ol>
          <p className="text-caption text-text-muted">
            Don’t have it?{' '}
            <a href={SYNCROFIT_SITE} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Get SyncroFit
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
