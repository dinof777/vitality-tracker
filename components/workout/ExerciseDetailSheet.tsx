'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import { TIER_LABEL, exerciseTier } from '@/lib/exercise-intensity';
import { exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { loadProfile, workoutParams } from '@/lib/profile';
import ExerciseThumb from './ExerciseThumb';
import OverloadSparkline from './OverloadSparkline';

interface ExerciseDetailSheetProps {
  exercise: Exercise;
  onClose: () => void;
  /** Optional primary action (e.g. "Add to workout"). */
  actionLabel?: string;
  onAction?: () => void;
}

// Bottom-sheet preview of an exercise: big illustration, muscle + equipment,
// coaching cue, how-to-log hint, and recent-weight trend. Opened by tapping an
// exercise anywhere in the app.
export default function ExerciseDetailSheet({
  exercise,
  onClose,
  actionLabel,
  onAction,
}: ExerciseDetailSheetProps) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mode = exerciseMode(exercise);
  const timed = mode !== 'reps';
  const unit = mode === 'cardio' ? 'rounds' : 'sets';

  // Recommended prescription from the saved profile's intensity (or moderate).
  const [recommend, setRecommend] = useState('');
  useEffect(() => {
    const p = loadProfile();
    const wp = p
      ? workoutParams(p)
      : { sets: 3, reps: 10, restSec: 60, holdSec: 40, tempo: '3-1-1', repSec: 5, setupSec: 25 };
    setRecommend(
      timed
        ? `${wp.sets} ${unit} · ${wp.holdSec}s ${modeWorkLabel(mode)} · ${wp.restSec}s rest`
        : `${wp.sets} sets × ${wp.reps} reps @ ${wp.tempo} · ${wp.restSec}s rest`,
    );
  }, [timed, mode, unit]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Grabber + close */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface/95 px-4 pb-2 pt-3 backdrop-blur">
          <span className="mx-auto h-1 w-10 rounded-full bg-border" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-2 flex h-9 w-9 items-center justify-center rounded-full text-text-muted active:bg-surface-raised"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4">
          {/* Illustration */}
          {exercise.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="h-56 w-full rounded-lg border border-border bg-surface-raised object-contain"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center rounded-lg border border-border bg-surface-raised">
              <ExerciseThumb equipment={exercise.equipment} name={exercise.name} size={96} />
            </div>
          )}

          {/* Title + badges */}
          <div className="space-y-2">
            <h2 className="text-h2 text-text-primary">{exercise.name}</h2>
            <div className="flex flex-wrap gap-2">
              {exercise.muscle_group && (
                <span className="rounded-sm bg-surface-raised px-2 py-1 text-caption text-text-muted">
                  {exercise.muscle_group}
                </span>
              )}
              {exercise.equipment && (
                <span className="rounded-sm bg-accent/15 px-2 py-1 text-caption font-semibold text-accent">
                  {EQUIPMENT_LABEL[exercise.equipment]}
                </span>
              )}
              <span className="rounded-sm bg-surface-raised px-2 py-1 text-caption text-text-muted">
                {TIER_LABEL[exerciseTier(exercise)]}
              </span>
            </div>
          </div>

          {/* Coaching cue */}
          {exercise.default_cue && (
            <div>
              <p className="mb-1 text-caption text-text-muted">COACHING CUE</p>
              <p className="text-body text-text-primary">{exercise.default_cue}</p>
            </div>
          )}

          {/* Recommended prescription (from profile intensity) */}
          {recommend && (
            <div>
              <p className="mb-1 text-caption text-text-muted">RECOMMENDED</p>
              <p className="text-body text-text-primary nums">{recommend}</p>
            </div>
          )}

          {/* How to log */}
          <div>
            <p className="mb-1 text-caption text-text-muted">HOW TO LOG</p>
            <p className="text-caption text-text-muted">
              {timed
                ? `Log the seconds of ${modeWorkLabel(mode)} in the reps field; weight stays at bodyweight (0) unless you add load.`
                : 'Log the weight and reps for each set. Tap a tempo badge and set type as you go.'}
            </p>
          </div>

          {/* Recent trend */}
          <div>
            <p className="mb-1 text-caption text-text-muted">RECENT</p>
            <OverloadSparkline exerciseId={exercise.id} />
          </div>

          {/* Action */}
          <div className="pt-1">
            {actionLabel && onAction ? (
              <button
                type="button"
                onClick={onAction}
                className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
              >
                {actionLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface-raised"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
