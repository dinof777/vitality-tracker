'use client';

import { useMemo, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER, SAMPLE_EXERCISES } from '@/lib/exercises';

interface ExercisePickerProps {
  excludeIds?: string[];
  onPick: (exercise: Exercise) => void;
  onClose?: () => void;
  exercises?: Exercise[];
}

// Searchable exercise list grouped by equipment. Scales to any library size.
export default function ExercisePicker({
  excludeIds = [],
  onPick,
  onClose,
  exercises = SAMPLE_EXERCISES,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.toLowerCase();
    const exclude = new Set(excludeIds);
    const available = exercises.filter(
      (e) => !exclude.has(e.id) && e.name.toLowerCase().includes(q),
    );
    return EQUIPMENT_ORDER.map((eq) => ({
      equipment: eq,
      label: EQUIPMENT_LABEL[eq],
      items: available.filter((e) => e.equipment === eq),
    })).filter((g) => g.items.length > 0);
  }, [query, excludeIds, exercises]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises…"
        className="h-12 w-full rounded-md bg-surface-raised px-3 text-body text-text-primary outline-none focus:ring-2 focus:ring-accent"
      />
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.equipment}>
            <p className="px-1 pb-1 text-caption text-text-faint">{g.label.toUpperCase()}</p>
            <div className="space-y-1">
              {g.items.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onPick(e)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left active:bg-surface-raised"
                >
                  <span className="text-body text-text-primary">{e.name}</span>
                  <span className="text-caption text-text-muted">{e.muscle_group}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-3 py-4 text-center text-caption text-text-faint">No matches.</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-full rounded-md border border-border text-label text-text-muted"
        >
          Done
        </button>
      )}
    </div>
  );
}
