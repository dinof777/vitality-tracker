'use client';

import { useId, type ReactNode } from 'react';

// A row in an admin lifecycle list.
//
// The rule this encodes: a list is for READING first. Managing one item is the
// exception, not the default — so every row is a single scannable line, and the
// controls (which are mostly rare and some destructive) live behind one
// disclosure. The previous version rendered every action on every row, which
// turned a list of 19 terms into 19 stacked forms.

export interface RowBadge {
  label: string;
  /** `shared` = lives globally; `local` = belongs to one gym. */
  tone: 'shared' | 'local';
}

interface Props {
  title: string;
  badge: RowBadge;
  /** Second line — muscle group, what depends on it, etc. */
  meta: string;
  archived?: boolean;
  /** Highlight rows that want attention (e.g. awaiting review). */
  flagged?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export default function LifecycleRow({
  title,
  badge,
  meta,
  archived = false,
  flagged = false,
  open,
  onToggle,
  children,
}: Props) {
  const panelId = useId();
  return (
    <li
      className={`overflow-hidden rounded-lg border ${
        archived
          ? 'border-dashed border-border bg-background'
          : flagged
            ? 'border-accent/40 bg-surface'
            : 'border-border bg-surface'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-body font-semibold ${
              archived ? 'text-text-faint line-through' : 'text-text-primary'
            }`}
          >
            {title}
          </p>
          <p className="truncate text-caption text-text-muted">{meta}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-caption ${
            badge.tone === 'shared' ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'
          }`}
        >
          {badge.label}
        </span>
        <span aria-hidden className={`shrink-0 text-text-faint transition-transform ${open ? 'rotate-180' : ''}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-border px-3 py-3">
          {children}
        </div>
      )}
    </li>
  );
}
