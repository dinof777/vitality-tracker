'use client';

import { useMemo, type ReactNode } from 'react';
import type { Equipment } from '@/lib/database.types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER } from '@/lib/exercises';
import { TIER_LABEL, exerciseTier } from '@/lib/exercise-intensity';
import { tagLabel } from '@/lib/tags';
import ExerciseRow from './ExerciseRow';

// The one way an exercise library is browsed: a search box, then rows grouped
// by equipment. `/exercises` (trainee, illustrated) and `/admin/exercises`
// (trainer/admin, same illustrations + a management trailing slot) both render
// through this — the earlier admin build hand-rolled a separate plain list
// instead of reusing this view; see DESIGN.md §6 for why that's the wrong call
// for anything with an equipment illustration to show.

/** The minimum shape an item needs to be searched, grouped, and rendered as a
 *  row. `Exercise` (the trainee library) and admin's fetched row both fit. */
export interface BrowseExercise {
  id: string;
  name: string;
  equipment: Equipment | null;
  image_url?: string | null;
  muscle_group?: string | null;
  tags?: string[];
}

interface ExerciseBrowseListProps<T extends BrowseExercise> {
  items: T[];
  /** Controlled search value. Both call sites need to observe it — one to
   *  filter client-side, the other to drive a debounced server fetch — so
   *  this component never owns the value itself. */
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (item: T) => void;
  /** Forwarded straight to `ExerciseRow`'s `trailing` slot. The trainee view
   *  puts a "+ add to routine" button there; admin puts a scope/archived
   *  badge there instead — same slot, different job. */
  renderTrailing?: (item: T) => ReactNode;
  /** Meta line under the name. Defaults to muscle group · equipment · effort
   *  tier (the browse view's own take, unchanged from before extraction);
   *  admin overrides this with usage info instead. */
  renderDetail?: (item: T) => string | null;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  emptyLabel?: (query: string) => string;
}

const OTHER_EQUIPMENT = 'other-equipment';
const OTHER_EQUIPMENT_LABEL = 'OTHER EQUIPMENT';

function defaultDetail(item: BrowseExercise): string | null {
  const parts = [
    item.muscle_group,
    item.equipment && EQUIPMENT_LABEL[item.equipment],
    TIER_LABEL[exerciseTier(item)],
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function defaultEmptyLabel(query: string): string {
  return `No exercises match “${query}”.`;
}

export default function ExerciseBrowseList<T extends BrowseExercise>({
  items,
  query,
  onQueryChange,
  onSelect,
  renderTrailing,
  renderDetail = defaultDetail,
  searchPlaceholder = 'Search exercises…',
  searchAriaLabel = 'Search exercises',
  emptyLabel = defaultEmptyLabel,
}: ExerciseBrowseListProps<T>) {
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (item: T) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.muscle_group ?? '').toLowerCase().includes(q) ||
      (item.tags ?? []).some((t) => tagLabel(t).toLowerCase().includes(q));
    const filtered = items.filter(match);

    const known = EQUIPMENT_ORDER.map((eq) => ({
      key: eq,
      label: EQUIPMENT_LABEL[eq].toUpperCase(),
      items: filtered.filter((i) => i.equipment === eq),
    })).filter((g) => g.items.length > 0);

    // Anything without a core-equipment value (a gym's own custom equipment,
    // or no equipment set) still needs to be reachable, not silently dropped.
    const rest = filtered.filter((i) => !i.equipment || !EQUIPMENT_ORDER.includes(i.equipment));
    const other = rest.length > 0 ? [{ key: OTHER_EQUIPMENT, label: OTHER_EQUIPMENT_LABEL, items: rest }] : [];

    return [...known, ...other];
  }, [items, query]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
        className="mb-4 h-12 w-full rounded-md bg-surface-raised px-4 text-body text-text-primary outline-none placeholder:text-text-faint focus:ring-2 focus:ring-accent"
      />

      {total === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-body text-text-muted">
          {emptyLabel(query)}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              <p className="mb-2 text-caption text-text-muted">
                {g.label} · {g.items.length}
              </p>
              <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
                {g.items.map((item) => (
                  <ExerciseRow
                    key={item.id}
                    name={item.name}
                    equipment={item.equipment}
                    imageUrl={item.image_url ?? null}
                    detail={renderDetail(item)}
                    trailing={
                      <>
                        {/* Tap anywhere on the row to select it. Sits under
                            renderTrailing's own control (if any) via z-index,
                            not DOM order, so that control stays reachable. */}
                        <button
                          type="button"
                          onClick={() => onSelect(item)}
                          aria-label={`View ${item.name}`}
                          className="absolute inset-0 z-0 rounded-lg transition-colors active:bg-surface-raised/60"
                        />
                        {renderTrailing && <span className="relative z-10">{renderTrailing(item)}</span>}
                      </>
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
