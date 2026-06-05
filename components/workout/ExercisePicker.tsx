'use client';

import { useMemo, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER, SAMPLE_EXERCISES } from '@/lib/exercises';
import ExerciseThumb from './ExerciseThumb';
import ExerciseDetailSheet from './ExerciseDetailSheet';

interface ExercisePickerProps {
  excludeIds?: string[];
  onPick: (exercise: Exercise) => void;
  onClose?: () => void;
  exercises?: Exercise[];
  addLabel?: string;
}

// Searchable exercise list grouped by equipment. Scales to any library size.
export default function ExercisePicker({
  excludeIds = [],
  onPick,
  onClose,
  exercises = SAMPLE_EXERCISES,
  addLabel = 'Add to workout',
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<Exercise | null>(null);

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
                  onClick={() => setPreview(e)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left active:bg-surface-raised"
                >
                  <ExerciseThumb
                    equipment={e.equipment}
                    imageUrl={e.image_url}
                    name={e.name}
                    size={40}
                  />
                  <span className="flex-1 text-body text-text-primary">{e.name}</span>
                  <span className="text-caption text-text-muted">{e.muscle_group}</span>
                  <span className="text-text-faint">›</span>
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

      {preview && (
        <ExerciseDetailSheet
          exercise={preview}
          onClose={() => setPreview(null)}
          actionLabel={addLabel}
          onAction={() => {
            onPick(preview);
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
