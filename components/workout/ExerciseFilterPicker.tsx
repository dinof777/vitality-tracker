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
  /** Movement family, so variations collapse into one entry. */
  family?: string;
  variant?: string;
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
  const [muscles, setMuscles] = useState<string[]>([]);
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // Muscle groups present, most-common first.
  const muscleGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of items) if (e.muscle_group) counts.set(e.muscle_group, (counts.get(e.muscle_group) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [items]);

  // OR within a filter group, AND across groups — see filterByFacets.
  const results = useMemo(
    () => filterByFacets(items, { tags, equipment: equip, muscleGroups: muscles, search: q }),
    [items, q, tags, equip, muscles],
  );

  // Collapse a family into ONE row when more than one of its variations is in
  // view — the user picks the variation from inside. A lone survivor stays a
  // normal row (no point hiding one move behind a chooser).
  const rows = useMemo(() => {
    const byFamily = new Map<string, PickerItem[]>();
    for (const r of results) {
      if (r.family) byFamily.set(r.family, [...(byFamily.get(r.family) ?? []), r]);
    }
    const out: Array<{ kind: 'single'; item: PickerItem } | { kind: 'family'; family: string; items: PickerItem[] }> = [];
    const emitted = new Set<string>();
    for (const r of results) {
      const group = r.family ? byFamily.get(r.family) : undefined;
      if (group && group.length > 1) {
        if (!emitted.has(r.family!)) {
          emitted.add(r.family!);
          out.push({ kind: 'family', family: r.family!, items: group });
        }
        continue;
      }
      out.push({ kind: 'single', item: r });
    }
    return out;
  }, [results]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const activeFilters = tags.length + equip.length + muscles.length;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises or muscle group…"
        className="mb-3 h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary placeholder:text-text-faint"
      />

      {/* Filters collapse by default — results first, controls on demand. */}
      <button
        type="button"
        onClick={() => setFiltersOpen(!filtersOpen)}
        aria-expanded={filtersOpen}
        className={`mb-3 flex h-10 w-full items-center justify-between rounded-md border px-3 text-caption font-semibold ${
          activeFilters > 0 ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted'
        }`}
      >
        <span>Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}</span>
        <span>{filtersOpen ? '▲' : '▼'}</span>
      </button>

      {filtersOpen && (
        <div className="mb-3 rounded-lg border border-border bg-surface p-3">
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

      {muscleGroups.length > 1 && (
        <div className="mb-2">
          <p className="mb-1 text-[0.65rem] font-semibold tracking-wide text-text-faint">MUSCLE GROUP</p>
          <div className="flex flex-wrap gap-1.5">
            {muscleGroups.map((g) => {
              const on = muscles.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(muscles, setMuscles, g)}
                  className={`rounded-full border px-2.5 py-1 text-caption transition ${
                    on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="text-caption text-text-faint nums">
          {results.length} of {items.length}
          {rows.length !== results.length && ` · ${rows.length} entries`}
        </span>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() => {
              setTags([]);
              setEquip([]);
              setMuscles([]);
            }}
            className="text-caption text-accent"
          >
            Clear filters
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-center text-body text-text-muted">
          Nothing matches those filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            /* ── A family: one entry, variations inside ─────────────────── */
            if (row.kind === 'family') {
              const open = openFamily === row.family;
              const chosen = row.items.filter((i) => pickedIds.has(i.id));
              const lead = row.items[0];
              return (
                <li key={`fam-${row.family}`} className="rounded-lg border border-border bg-surface">
                  <button
                    type="button"
                    onClick={() => setOpenFamily(open ? null : row.family)}
                    className="flex w-full items-center gap-3 p-2.5 text-left"
                    aria-expanded={open}
                  >
                    <ExerciseThumb equipment={lead.equipment} imageUrl={lead.image_url} name={row.family} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-semibold text-text-primary">{row.family}</span>
                      <span className="block truncate text-caption text-text-muted nums">
                        {row.items.length} variations
                        {chosen.length > 0 && ` · ${chosen.length} added`}
                      </span>
                    </span>
                    <span className={`shrink-0 text-caption ${chosen.length ? 'text-accent' : 'text-text-faint'}`}>
                      {open ? '▲' : `Choose ▾`}
                    </span>
                  </button>

                  {open && (
                    <ul className="border-t border-border p-2 pt-1">
                      {row.items.map((v) => {
                        const added = pickedIds.has(v.id);
                        return (
                          <li key={v.id} className="flex items-center gap-3 py-1.5">
                            <ExerciseThumb equipment={v.equipment} imageUrl={v.image_url} name={v.name} size={32} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-body text-text-primary">{v.variant ?? v.name}</span>
                              <span className="block truncate text-caption text-text-muted">
                                {[v.subtitle ?? (v.equipment ? EQUIPMENT_LABEL[v.equipment] : null), v.name]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => onToggle(v.id)}
                              className={`h-8 w-8 shrink-0 rounded-full text-caption ${
                                added ? 'bg-surface-raised text-text-muted' : 'bg-accent text-on-accent'
                              }`}
                              aria-label={added ? `Remove ${v.name}` : `Add ${v.name}`}
                            >
                              {added ? '✓' : '✚'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            /* ── A one-off movement ─────────────────────────────────────── */
            const e = row.item;
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
    </div>
  );
}
