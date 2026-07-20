'use client';

import { useMemo, useState } from 'react';
import type { Equipment } from '@/lib/database.types';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import { TAG_BY_ID, tagsInCategory, filterByFacets, type TagCategory } from '@/lib/tags';
import ExerciseThumb from './ExerciseThumb';

export interface PickerItem {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: Equipment | null;
  image_url: string | null;
  tags?: string[];
  /** Extra line under the name — e.g. a gym's custom equipment name. */
  subtitle?: string | null;
}

interface Props {
  items: PickerItem[];
  pickedIds: Set<string>;
  onToggle: (id: string) => void;
}

const CATEGORIES: Array<{ id: TagCategory; label: string }> = [
  { id: 'goal', label: 'Goal' },
  { id: 'stage', label: 'Stage' },
  { id: 'pattern', label: 'Movement' },
];

// Search + tag/equipment filters over an exercise list. Shared by the gym builder
// and the personal builder so the filtering behaves identically in both.
export default function ExerciseFilterPicker({ items, pickedIds, onToggle }: Props) {
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [equip, setEquip] = useState<string[]>([]);

  // Only offer tags/equipment this list actually contains.
  const tagGroups = useMemo(() => {
    const seen = new Set(items.flatMap((e) => e.tags ?? []));
    return CATEGORIES.map((c) => ({ ...c, items: tagsInCategory(c.id).filter((t) => seen.has(t.id)) })).filter(
      (g) => g.items.length > 0,
    );
  }, [items]);

  const equipments = useMemo(
    () => Array.from(new Set(items.map((e) => e.equipment).filter(Boolean))) as Equipment[],
    [items],
  );

  // OR within a filter group, AND across groups — see filterByFacets.
  const results = useMemo(
    () => filterByFacets(items, { tags, equipment: equip, search: q }),
    [items, q, tags, equip],
  );

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const activeFilters = tags.length + equip.length;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises or muscle group…"
        className="mb-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
      />

      {tagGroups.map((group) => (
        <div key={group.id} className="mb-2">
          <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">{group.label.toUpperCase()}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((t) => {
              const on = tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.description}
                  onClick={() => toggle(tags, setTags, t.id)}
                  className={`rounded-full border px-2.5 py-1 text-caption transition ${
                    on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {equipments.length > 1 && (
        <div className="mb-3">
          <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">EQUIPMENT</p>
          <div className="flex flex-wrap gap-1.5">
            {equipments.map((eq) => {
              const on = equip.includes(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggle(equip, setEquip, eq)}
                  className={`rounded-full border px-2.5 py-1 text-caption transition ${
                    on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {EQUIPMENT_LABEL[eq]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="text-caption text-text-faint nums">
          {results.length} of {items.length}
        </span>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => {
              setTags([]);
              setEquip([]);
            }}
            className="text-caption text-accent"
          >
            Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-body text-text-muted">
          Nothing matches those filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.slice(0, 80).map((e) => {
            const added = pickedIds.has(e.id);
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5">
                <ExerciseThumb equipment={e.equipment} imageUrl={e.image_url} name={e.name} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-text-primary">{e.name}</span>
                  <span className="block truncate text-caption text-text-muted">
                    {[e.muscle_group, e.subtitle ?? (e.equipment ? EQUIPMENT_LABEL[e.equipment] : null)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {(e.tags ?? []).length > 0 && (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {(e.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t} className="rounded bg-accent/10 px-1.5 py-0.5 text-[0.6rem] text-accent">
                          {TAG_BY_ID[t]?.label ?? t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(e.id)}
                  className={`h-9 w-9 shrink-0 rounded-full text-label ${
                    added ? 'bg-surface-raised text-text-muted' : 'bg-accent text-on-accent'
                  }`}
                  aria-label={added ? `Remove ${e.name}` : `Add ${e.name}`}
                >
                  {added ? '✓' : '✚'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {results.length > 80 && (
        <p className="mt-2 text-center text-caption text-text-faint">
          Showing 80 of {results.length} — narrow it with search or filters.
        </p>
      )}
    </div>
  );
}
