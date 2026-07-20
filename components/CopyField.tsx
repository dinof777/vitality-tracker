'use client';

import { useState } from 'react';

// A read-only value with a Copy button — for share URLs and paste-in snippets.
export default function CopyField({ value, multiline = false }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <pre className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background p-3 text-[0.7rem] leading-relaxed text-text-primary">
          {value}
        </pre>
      ) : (
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-caption text-text-primary"
        />
      )}
      <button
        type="button"
        onClick={copy}
        className="h-10 shrink-0 rounded-md bg-accent px-4 text-caption font-semibold text-on-accent active:scale-[0.98]"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
