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
  /**
   * Omit (or pass null) for the common case — a shared, live item. A badge is
   * a claim that a row is an EXCEPTION to the default; when every row carries
   * one it stops meaning anything. Reserve it for gym-owned and archived rows.
   */
  badge?: RowBadge | null;
  /** Second line — muscle group, what depends on it, etc. */
  meta: string;
  archived?: boolean;
  /** Highlight rows that want attention (e.g. awaiting review). */
  flagged?: boolean;
  /**
   * A child of a parent/region row, rendered directly beneath it — indented
   * with a connector rather than a separate nested list, so a region's
   * children read as "part of" it without a second list component.
   */
  indent?: boolean;
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
  indent = false,
  open,
  onToggle,
  children,
}: Props) {
  const panelId = useId();
  return (
    <li
      className={`overflow-hidden rounded-lg border ${indent ? 'ml-5 border-l-4 border-l-accent/25' : ''} ${
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
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
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
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-caption ${
              badge.tone === 'shared' ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'
            }`}
          >
            {badge.label}
          </span>
        )}
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-bold transition-all duration-150 ${
            open ? 'rotate-180 bg-accent/15 text-accent' : 'text-text-muted'
          }`}
        >
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
