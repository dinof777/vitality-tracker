'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import { exerciseMode, isPerSide, modeWorkLabel } from '@/lib/exercise-mode';
import { loadProfile, workoutParams } from '@/lib/profile';
import type { LoggedSet } from '@/lib/workout-types';
import { SET_TYPES } from '@/lib/workout-types';
import SetLogRow from './SetLogRow';
import RestTimer from './RestTimer';
import OverloadSparkline from './OverloadSparkline';
import ExerciseThumb from './ExerciseThumb';
import ExerciseDetailSheet from './ExerciseDetailSheet';

interface ExerciseCardProps {
  exercise: Exercise;
  // Resolves once the POST round-trips, with the persisted entry id (or null
  // if it was never persisted) — see WorkoutSession.handleLogSet.
  onLogSet: (entry: LoggedSet) => Promise<{ id: string | null }>;
  // Undo (most-recent set only) needs to decrement the session-wide set count
  // that lives in WorkoutSession, since ExerciseCard only owns its own list.
  onUndoSet: () => void;
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
export default function ExerciseCard({ exercise, onLogSet, onUndoSet }: ExerciseCardProps) {
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [dbLast, setDbLast] = useState<LastSet | null>(null);
  const [lastLoaded, setLastLoaded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  // Recommended hold seconds, used as the first-set default for timed moves.
  const [holdDefault] = useState(() => {
    const p = loadProfile();
    return p ? workoutParams(p).holdSec : 40;
  });

  const mode = exerciseMode(exercise);
  const perSide = isPerSide(exercise);
  const timed = mode !== 'reps';

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

  const handleLogSet = async (entry: LoggedSet) => {
    const index = sets.length; // position this entry will land at, for the id patch below
    setSets((prev) => [...prev, entry]);
    setShowTimer(true);
    const { id } = await onLogSet(entry);
    if (id) {
      setSets((prev) => prev.map((s, i) => (i === index ? { ...s, id } : s)));
    }
  };

  // Undo (most-recent set only, DESIGN.md §6): removes the set locally, hides
  // its rest timer, decrements the session-wide count, and — only if it made
  // it to the DB — deletes it server-side too. No confirm; low-stakes and
  // immediately reversible by relogging.
  const handleUndo = (entry: LoggedSet) => {
    setSets((prev) => prev.slice(0, -1));
    setShowTimer(false);
    onUndoSet();
    if (entry.id) {
      fetch(`/api/log/${entry.id}`, { method: 'DELETE' }).catch(() => {
        /* best effort — matches routines' delete pattern */
      });
    }
  };

  // Pre-fill priority: this session's previous set, else the DB's last set.
  const prevSet = sets.length > 0 ? sets[sets.length - 1] : null;
  const prefill: LastSet | null = prevSet
    ? { weight: prevSet.weight, reps: prevSet.reps, tempo: prevSet.tempo }
    : dbLast;
  // Alternate L → R → L for unilateral moves.
  const lastSide = sets.length ? sets[sets.length - 1].side ?? null : null;
  const nextSide: 'L' | 'R' = perSide && lastSide === 'L' ? 'R' : 'L';
  // First-set default: previous reps/seconds, or the recommended hold for timed moves.
  const defaultReps = timed ? (prefill?.reps ?? holdDefault) : (prefill?.reps ?? null);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => setShowDetail(true)}
        className="flex w-full items-start gap-3 text-left active:opacity-70"
      >
        <ExerciseThumb
          equipment={exercise.equipment}
          imageUrl={exercise.image_url}
          name={exercise.name}
          size={56}
        />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-2">
            <span className="text-h3 text-text-primary">{exercise.name}</span>
            {exercise.muscle_group && (
              <span className="rounded-sm bg-surface-raised px-2 py-0.5 text-caption text-text-muted">
                {exercise.muscle_group}
              </span>
            )}
            <span className="ml-auto text-text-faint">ⓘ</span>
          </span>
          {exercise.default_cue && (
            <span className="block text-caption italic text-text-muted">{exercise.default_cue}</span>
          )}
        </span>
      </button>

      {showDetail && (
        <ExerciseDetailSheet exercise={exercise} onClose={() => setShowDetail(false)} />
      )}

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
                {s.side && <span className="text-text-faint"> · {s.side}</span>}
                {'  '}
                <span className="nums font-semibold text-text-primary">
                  {timed ? `${s.reps ?? '—'}s ${modeWorkLabel(mode)}` : `${s.weight ?? '—'} × ${s.reps ?? '—'}`}
                </span>
              </span>
              <span className="flex items-center gap-2 text-caption">
                {!timed && <span className="nums text-accent">{s.tempo}</span>}
                {!timed && s.setType !== 'normal' && (
                  <span className={s.setType === 'amrap' ? 'text-energy' : 'text-text-muted'}>
                    {setTypeLabel(s.setType)}
                  </span>
                )}
                {i === sets.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleUndo(s)}
                    className="text-caption font-semibold text-destructive underline decoration-dotted underline-offset-2 active:opacity-70"
                  >
                    Undo
                  </button>
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
          mode={mode}
          perSide={perSide}
          defaultSide={nextSide}
          defaultWeight={prefill?.weight ?? null}
          defaultReps={defaultReps}
          defaultTempo={prefill?.tempo ?? '3-1-1'}
          onLogSet={handleLogSet}
        />
      )}
    </section>
  );
}
