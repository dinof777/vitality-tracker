'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import type { LoggedSet } from '@/lib/workout-types';
import { SET_TYPES } from '@/lib/workout-types';
import SetLogRow from './SetLogRow';
import RestTimer from './RestTimer';
import OverloadSparkline from './OverloadSparkline';
import ExerciseThumb from './ExerciseThumb';

interface ExerciseCardProps {
  exercise: Exercise;
  onLogSet: (entry: LoggedSet) => void;
}

interface LastSet {
  weight: number | null;
  reps: number | null;
  tempo: string;
}

const setTypeLabel = (v: string) =>
  SET_TYPES.find((s) => s.value === v)?.label ?? v;

// One exercise within a workout: name + cue, a summary of completed sets, the
// rest timer (shown after a set is logged), and the active set-log row. The row
// pre-fills from this session's previous set, or the last logged set in the DB.
export default function ExerciseCard({ exercise, onLogSet }: ExerciseCardProps) {
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [dbLast, setDbLast] = useState<LastSet | null>(null);
  const [lastLoaded, setLastLoaded] = useState(false);

  // Fetch the most recent logged set so the first input is pre-filled.
  useEffect(() => {
    let active = true;
    fetch(`/api/exercises/${exercise.id}/last`)
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        setDbLast(j.last ?? null);
        setLastLoaded(true);
      })
      .catch(() => active && setLastLoaded(true));
    return () => {
      active = false;
    };
  }, [exercise.id]);

  const handleLogSet = (entry: LoggedSet) => {
    setSets((prev) => [...prev, entry]);
    setShowTimer(true);
    onLogSet(entry);
  };

  // Pre-fill priority: this session's previous set, else the DB's last set.
  const prevSet = sets.length > 0 ? sets[sets.length - 1] : null;
  const prefill: LastSet | null = prevSet
    ? { weight: prevSet.weight, reps: prevSet.reps, tempo: prevSet.tempo }
    : dbLast;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <ExerciseThumb
          equipment={exercise.equipment}
          imageUrl={exercise.image_url}
          name={exercise.name}
          size={56}
        />
        <div className="min-w-0 flex-1 space-y-1">
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

      {lastLoaded && (
        <SetLogRow
          key={`row-${sets.length}`}
          exerciseId={exercise.id}
          setNumber={sets.length + 1}
          defaultWeight={prefill?.weight ?? null}
          defaultReps={prefill?.reps ?? null}
          defaultTempo={prefill?.tempo ?? '3-1-1'}
          onLogSet={handleLogSet}
        />
      )}
    </section>
  );
}
