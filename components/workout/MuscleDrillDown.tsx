'use client';

import { useState } from 'react';
import type { DrillDownNode } from '@/lib/profile';

interface Props {
  /** The tree — see lib/profile.ts#muscleDrillDownNodes / #rehabDrillDownNodes. */
  nodes: DrillDownNode[];
  /** Currently selected focus value (a leaf value, a childless-parent value,
   *  or a parent's own "whole area" value). */
  value: string;
  onSelect: (value: string) => void;
  columns?: 2 | 3;
}

// Shared parent→child focus picker. ONE component, fed different trees, so
// onboarding's goal-driven focus step and the per-workout builder (both the
// personal app and the gym build page, via BuilderControls) drill through the
// exact same muscle-group / rehab-area hierarchy instead of each maintaining
// its own picker over the same data.
//
// Interaction: a leaf tile selects immediately. A parent tile does two things
// at once on tap — it selects the whole area (so doing nothing further still
// gives you "train all of Legs") AND reveals its children inline so you can
// narrow further; tapping a revealed child re-selects down to just that one.
export default function MuscleDrillDown({ nodes, value, onSelect, columns = 3 }: Props) {
  // Start expanded on whichever parent the current value already belongs to,
  // so reopening the sheet on a child value (e.g. "Quads") lands already
  // drilled into its parent ("Legs") instead of collapsed back to the top.
  const initialExpanded =
    nodes.find((n) => n.children?.length && (n.value === value || n.children.some((c) => c.value === value)))
      ?.value ?? null;
  const [expanded, setExpanded] = useState<string | null>(initialExpanded);

  const gridCols = columns === 2 ? 'grid-cols-2' : 'grid-cols-3';
  const expandedNode = nodes.find((n) => n.value === expanded);

  return (
    <div className="space-y-2">
      <div className={`grid ${gridCols} gap-2`}>
        {nodes.map((n) => {
          const hasChildren = !!n.children?.length;
          const childSelected = hasChildren && n.children!.some((c) => c.value === value);
          const on = value === n.value || childSelected;
          return (
            <button
              key={n.value}
              type="button"
              aria-expanded={hasChildren ? expanded === n.value : undefined}
              aria-pressed={hasChildren ? undefined : on}
              aria-label={
                hasChildren && childSelected
                  ? `${n.label}, ${n.children!.find((c) => c.value === value)?.label} selected`
                  : n.label
              }
              onClick={() => {
                if (hasChildren) {
                  setExpanded((cur) => (cur === n.value ? null : n.value));
                  onSelect(n.value);
                } else {
                  onSelect(n.value);
                }
              }}
              className={`relative rounded-lg border p-2.5 text-center transition-colors ${
                on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
              }`}
            >
              <span className="block text-body">{n.emoji}</span>
              <span className="mt-0.5 block text-caption font-semibold leading-tight text-text-primary">
                {n.label}
              </span>
              {hasChildren && (
                <span className="mt-0.5 block text-caption font-medium tracking-wide text-text-faint">
                  {childSelected
                    ? n.children!.find((c) => c.value === value)?.label
                    : expanded === n.value
                      ? '▾ narrow'
                      : '▸ narrow'}
                </span>
              )}
              {value === n.value && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent text-[10px] font-bold leading-none">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {expandedNode?.children?.length ? (
        <div className="rounded-lg border border-border bg-surface-raised/50 p-2.5">
          <p className="mb-2 text-caption font-semibold tracking-wide text-text-faint">
            {expandedNode.label.toUpperCase()} — NARROW TO{' '}
            <span className="font-normal text-text-faint/70">(OPTIONAL)</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {expandedNode.children.map((c) => {
              const on = value === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onSelect(c.value)}
                  aria-pressed={on}
                  className={`relative rounded-md border p-2 text-center transition-colors ${
                    on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                  }`}
                >
                  <span className="block text-body">{c.emoji}</span>
                  <span className="mt-0.5 block text-caption font-semibold leading-tight text-text-primary">
                    {c.label}
                  </span>
                  {on && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent text-[10px] font-bold leading-none">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
