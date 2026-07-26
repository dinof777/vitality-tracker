'use client';

import { useState } from 'react';

interface ChipInputProps {
  items: string[];
  onChange: (next: string[]) => void;
  /** Mirrors lib/client-profile.ts's own limits exactly — see GOALS_MAX_ITEMS /
   *  EQUIPMENT_MAX_ITEMS / ITEM_MAX_LEN — so the UI never lets a trainer type
   *  something the server will then reject. */
  maxItems: number;
  maxCharsPerItem?: number;
  placeholder?: string;
  ariaLabel: string;
}

// Existing items as removable pills + a trailing pill-shaped add-input.
// Shared by Goals and Home equipment on the client profile form (DESIGN.md
// §6 "never color alone" doesn't apply here — chips are additive, not a
// selection state — but the pill/× recipe matches the rest of the app's chip
// language, e.g. the tag pills in app/g/[slug]/build/page.tsx).
export default function ChipInput({
  items,
  onChange,
  maxItems,
  maxCharsPerItem = 80,
  placeholder = '+ Add',
  ariaLabel,
}: ChipInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim().slice(0, maxCharsPerItem);
    setDraft('');
    if (!value || items.length >= maxItems || items.includes(value)) return;
    onChange([...items, value]);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ariaLabel}>
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent/15 px-3 text-caption font-semibold text-accent"
        >
          {item}
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Remove ${item}`}
            /* -m-2/p-2 grows the tap target to a thumb-friendly ~36px
               without growing the pill's own visual size — the negative
               margin cancels the added padding's footprint in the flex
               row (gap-2 between chips leaves room for it). */
            className="-m-2 p-2 leading-none text-accent/70 active:text-accent"
          >
            ×
          </button>
        </span>
      ))}
      {items.length < maxItems && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          maxLength={maxCharsPerItem}
          className="h-8 min-w-[6rem] flex-1 rounded-full border border-border bg-background px-3 text-caption text-text-primary placeholder:text-text-faint"
        />
      )}
    </div>
  );
}
