'use client';

import { useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import type { LoggedSet } from '@/lib/workout-types';
import { SET_TYPES } from '@/lib/workout-types';
import SetLogRow from './SetLogRow';
import RestTimer from './RestTimer';
import OverloadSparkline from './OverloadSparkline';

interface ExerciseCardProps {
  exercise: Exercise;
  onLogSet: (entry: LoggedSet) => void;
}

const setTypeLabel = (v: string) =>
  SET_TYPES.find((s) => s.value === v)?.label ?? v;

// One exercise within a workout: name + cue, a summary of completed sets, the
// rest timer (shown after a set is logged), and the active set-log row.
export default function ExerciseCard({ exercise, onLogSet }: ExerciseCardProps) {
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [showTimer, setShowTimer] = useState(false);

  const handleLogSet = (entry: LoggedSet) => {
    setSets((prev) => [...prev, entry]);
    setShowTimer(true);
    onLogSet(entry);
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-h3 text-text-primary">{exercise.name}</h3>
          {exercise.muscle_group && (
            <span className="rounded-sm bg-surface-raised px-2 py-0.5 text-caption text-text-muted">
              {exercise.muscle_group}
            </span>
          )}
        </div>
        {exercise.default_cue && (
          <p className="text-caption italic text-text-muted">{exercise.default_cue}</p>
        )}
      </div>

      <OverloadSparkline exerciseId={exercise.id} />

      {/* Completed sets this session */}
      {sets.length > 0 && (
        <ul className="space-y-1">
          {sets.map((s, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md bg-surface-raised/50 px-3 py-2 text-body"
            >
              <span className="text-text-muted">
                <span className="nums text-text-primary">Set {s.setNumber}</span>
                {'  '}
                <span className="nums font-semibold text-text-primary">
                  {s.weight ?? '—'} × {s.reps ?? '—'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-caption">
                <span className="nums text-accent">{s.tempo}</span>
                {s.setType !== 'normal' && (
                  <span className={s.setType === 'amrap' ? 'text-energy' : 'text-text-muted'}>
                    {setTypeLabel(s.setType)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showTimer && <RestTimer onDismiss={() => setShowTimer(false)} />}

      <SetLogRow
        exerciseId={exercise.id}
        setNumber={sets.length + 1}
        onLogSet={handleLogSet}
      />
    </section>
  );
}
