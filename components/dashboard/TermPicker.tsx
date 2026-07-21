'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { TAG_CATEGORIES, TAG_CATEGORY_HINT, TAG_CATEGORY_LABEL } from '@/lib/vocabulary';

// Picker for a governed vocabulary field (muscle group, tag).
//
// The point of this control: typing is how trainers want to work, but a raw text
// input is how a vocabulary sprawls. So it searches first and only offers "add"
// when nothing matches — and the add goes through the server's dedup engine,
// which folds synonyms silently and asks about near-misses.

export interface Term {
  id: string;
  name: string;
  normalized: string;
  category: string | null;
  status: string;
  is_canon: boolean;
  is_mine: boolean;
}

// Labels come from lib/vocabulary so the builder, the trainer dashboard and
// admin all call a tag category the same thing.
const CATEGORIES = TAG_CATEGORIES.map((value) => ({
  value,
  label: TAG_CATEGORY_LABEL[value],
  hint: TAG_CATEGORY_HINT[value],
}));

interface Props {
  kind: 'muscle_group' | 'tag';
  value: string;
  onChange: (name: string) => void;
  /** Accessible name — there's no visible label in the compact add form. */
  label: string;
  placeholder?: string;
  /** Tags must declare a category — the faceted filter groups by it. */
  requireCategory?: boolean;
  /** Called after a new term is created, so the parent can refresh its list. */
  onTermAdded?: (term: Term) => void;
  /** Fires for any pick, new or existing — the full term, not just its name. */
  onSelect?: (term: Term) => void;
  /** Reset to empty after a pick, for add-another-one controls. */
  clearOnSelect?: boolean;
  className?: string;
}

export default function TermPicker({
  kind,
  value,
  onChange,
  label,
  placeholder = 'Search…',
  requireCategory = false,
  onTermAdded,
  onSelect,
  clearOnSelect = false,
  className = '',
}: Props) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // No default: a tag's group decides how it filters, so the trainer picks it
  // deliberately rather than inheriting whichever option happened to be first.
  const [category, setCategory] = useState<string | null>(null);
  /** Index of the arrow-key-highlighted option; -1 = none. */
  const [active, setActive] = useState(-1);
  /** A fuzzy near-match the server wants confirmed before creating anything. */
  const [confirmDup, setConfirmDup] = useState<{ name: string; id: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const load = () =>
    fetch(`/api/tenant/taxonomy?kind=${kind}`)
      .then((r) => (r.ok ? r.json() : { terms: [] }))
      .then((d) => setTerms(d.terms ?? []))
      .catch(() => {});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => setQuery(value), [value]);

  // Close on an outside click so the dropdown doesn't trap the form.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? terms.filter((t) => t.name.toLowerCase().includes(q)) : terms).slice(0, 40),
    [terms, q],
  );
  const exact = terms.some((t) => t.name.toLowerCase() === q);
  const canAdd = q.length > 0 && !exact;
  const chosen = CATEGORIES.find((c) => c.value === category);
  /** Waiting on step 1 — the name is typed but no group is picked yet. */
  const blockedOnCategory = requireCategory && !category;

  const select = (t: Term) => {
    onChange(t.name);
    onSelect?.(t);
    setQuery(clearOnSelect ? '' : t.name);
    setOpen(false);
    setActive(-1);
    setNote(null);
    setError(null);
    setConfirmDup(null);
  };

  // Keyboard parity with the native <select> this replaced: arrows move, Enter
  // picks (or adds when nothing is highlighted), Escape closes.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (matches.length === 0 ? -1 : (i + delta + matches.length) % matches.length));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && matches[active]) select(matches[active]);
      else if (canAdd) add(false);
    }
  };

  const add = async (force = false) => {
    if (requireCategory && !category) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/tenant/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name: query.trim(), category: requireCategory ? category : undefined, force }),
      });
      const j = await r.json();

      if (r.status === 409) {
        setConfirmDup(j.duplicate);
        return;
      }
      if (!r.ok) {
        setError(j.error ?? 'Could not add.');
        return;
      }
      await load();
      onTermAdded?.(j.term);
      select(j.term);
      setCategory(null); // the next tag picks its own group
      // The server folded a synonym into an existing term — say so, so the
      // trainer isn't confused about why the name changed under them.
      if (j.folded) setNote(`We call that “${j.term.name}”.`);
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  };

  const useExisting = () => {
    const t = terms.find((x) => x.id === confirmDup?.id);
    if (t) select(t);
    setConfirmDup(null);
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
          setConfirmDup(null);
          setNote(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && matches[active] ? `${listId}-${matches[active].id}` : undefined}
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-body text-text-primary placeholder:text-text-faint"
      />

      {note && <p className="mt-1 text-caption text-accent">{note}</p>}
      {error && <p className="mt-1 text-caption text-destructive">{error}</p>}

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface-raised shadow-lg"
        >
          {matches.map((t, i) => (
            <button
              key={t.id}
              id={`${listId}-${t.id}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onClick={() => select(t)}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-body text-text-primary ${
                i === active ? 'bg-background' : ''
              }`}
            >
              <span className="truncate">{t.name}</span>
              {!t.is_canon && <span className="shrink-0 text-caption text-text-faint">your gym</span>}
            </button>
          ))}

          {matches.length === 0 && !canAdd && (
            <p className="px-3 py-2 text-caption text-text-faint">Nothing matches.</p>
          )}

          {canAdd && (
            <div className="border-t border-border p-3">
              {confirmDup ? (
                <>
                  <p className="mb-2 text-caption text-text-muted">
                    Did you mean <span className="text-text-primary">“{confirmDup.name}”</span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={useExisting}
                      className="h-9 flex-1 rounded-md bg-accent px-3 text-caption font-semibold text-on-accent"
                    >
                      Use “{confirmDup.name}”
                    </button>
                    <button
                      type="button"
                      onClick={() => add(true)}
                      disabled={busy}
                      className="h-9 flex-1 rounded-md border border-border px-3 text-caption text-text-primary disabled:opacity-50"
                    >
                      No, it’s different
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {requireCategory && (
                    <fieldset className="mb-2">
                      <legend className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">
                        1 · WHICH GROUP DOES “{query.trim().toUpperCase()}” BELONG TO?
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIES.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            title={c.hint}
                            aria-pressed={category === c.value}
                            onClick={() => setCategory(c.value)}
                            className={`min-h-11 rounded-full border px-3 py-1 text-caption transition ${
                              category === c.value
                                ? 'border-accent bg-accent text-on-accent'
                                : 'border-border bg-background text-text-muted'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-caption text-text-faint">
                        {chosen
                          ? chosen.hint
                          : 'The group decides how the tag filters — pick one to continue.'}
                      </p>
                    </fieldset>
                  )}
                  <button
                    type="button"
                    onClick={() => add(false)}
                    disabled={busy || blockedOnCategory}
                    className="min-h-11 w-full rounded-md border border-accent px-3 text-caption font-semibold text-accent disabled:cursor-not-allowed disabled:border-border disabled:text-text-faint disabled:opacity-100"
                  >
                    {busy
                      ? 'Adding…'
                      : blockedOnCategory
                        ? 'Pick a group first'
                        : `${requireCategory ? '2 · ' : ''}+ Add “${query.trim()}”${chosen ? ` to ${chosen.label}` : ''}`}
                  </button>
                  <p className="mt-1.5 text-caption text-text-faint">
                    Available to your gym right away. Shared with everyone once enough gyms add it too.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
