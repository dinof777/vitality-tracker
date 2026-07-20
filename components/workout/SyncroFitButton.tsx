'use client';

import { useState } from 'react';

export const SYNCROFIT_SITE = 'https://www.mysyncrofit.com';

// Sending a workout to SyncroFit is the one step that fails silently if you don't
// have the app — the deep link just does nothing. So the button always ships with
// a plain explanation and a way to get it.
export default function SyncroFitButton({ url, disabled = false }: { url: string; disabled?: boolean }) {
  const [help, setHelp] = useState(false);

  return (
    <div className="print:hidden">
      <a
        href={disabled ? undefined : url}
        aria-disabled={disabled}
        className={`flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] active:bg-accent-press ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        ⏱ SEND TO SYNCROFIT
      </a>

      <button
        type="button"
        onClick={() => setHelp(!help)}
        className="mt-2 w-full text-center text-caption text-text-muted underline"
      >
        {help ? 'Hide' : 'What happens when I tap this?'}
      </button>

      {help && (
        <div className="mt-2 rounded-lg border border-border bg-surface p-3">
          <p className="mb-2 text-caption text-text-muted">
            <span className="text-text-primary">SyncroFit</span> is the free interval-timer app that actually runs the
            workout — it counts your work and rest out loud so you never touch your phone mid-set.
          </p>
          <ol className="mb-3 list-inside list-decimal space-y-1 text-caption text-text-muted">
            <li>Tap the button — SyncroFit opens with this workout already loaded.</li>
            <li>Press start. It calls out each move, set and rest.</li>
            <li>When you finish, it reports back so your progress shows up here.</li>
          </ol>
          <p className="text-caption text-text-muted">
            Nothing happened?{' '}
            <a href={SYNCROFIT_SITE} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Get SyncroFit
            </a>{' '}
            — then tap the button again.
          </p>
        </div>
      )}
    </div>
  );
}
