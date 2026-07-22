'use client';

import { useEffect, useState } from 'react';
import type { Exercise } from '@/lib/database.types';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import { TIER_LABEL, exerciseTier } from '@/lib/exercise-intensity';
import { exerciseMode, modeWorkLabel } from '@/lib/exercise-mode';
import { loadProfile, workoutParams } from '@/lib/profile';
import ScopeSelect, { type Gym } from '@/components/admin/ScopeSelect';
import ExerciseThumb from './ExerciseThumb';
import OverloadSparkline from './OverloadSparkline';

/**
 * Optional admin lifecycle block — name/muscle-group/cue edit fields plus
 * `ScopeSelect` and archive/restore, rendered as a section below the sheet's
 * normal read content. Omit entirely on every trainee-facing call site
 * (`/exercises`, `/g/[slug]/exercises`, the workout builder); admin is the
 * only caller that supplies it. Field values + change handlers are separate
 * (rather than one "draft object" prop) so this stays a plain, explicit
 * contract — no schema/form-builder layer.
 */
export interface ExerciseManageBlock {
  name: string;
  muscleGroup: string;
  defaultCue: string;
  onFieldChange: (field: 'name' | 'muscle_group' | 'default_cue', value: string) => void;
  scope: string; // GLOBAL, or the owning gym's id
  gyms: Gym[];
  onScopeChange: (next: string) => void;
  /** "112 logged sets · 3 routines", or '' when nothing depends on it. */
  usageLabel: string;
  onSave: () => void;
  archived: boolean;
  /** Archives (if used) or deletes (if not) — label decided by the caller,
   *  which already knows `usageLabel`. Ignored when `archived`. */
  onArchiveOrDelete: () => void;
  /** Ignored unless `archived`. */
  onRestore: () => void;
}

interface ExerciseDetailSheetProps {
  exercise: Exercise;
  onClose: () => void;
  /** Optional primary action (e.g. "Add to workout"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Admin-only lifecycle controls. Undefined on every other call site — see
   *  `ExerciseManageBlock` above. */
  manage?: ExerciseManageBlock;
}

// Bottom-sheet preview of an exercise: big illustration, muscle + equipment,
// coaching cue, how-to-log hint, and recent-weight trend. Opened by tapping an
// exercise anywhere in the app. Admin additionally gets a `manage` section
// (edit + scope + archive/delete) below the read content — see
// `ExerciseManageBlock`.
export default function ExerciseDetailSheet({
  exercise,
  onClose,
  actionLabel,
  onAction,
  manage,
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

          {/* Admin lifecycle — edit, scope, archive/delete. Only when `manage`
              is supplied (admin's call site); every other caller never sees
              this section. */}
          {manage && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-caption text-text-muted">MANAGE</p>

              {manage.archived ? (
                <button
                  type="button"
                  onClick={manage.onRestore}
                  className="h-12 w-full rounded-md border border-accent text-caption font-semibold text-accent"
                >
                  Restore to the library
                </button>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-label uppercase text-text-faint">Name</span>
                    <input
                      value={manage.name}
                      onChange={(e) => manage.onFieldChange('name', e.target.value)}
                      className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-label uppercase text-text-faint">Muscle group</span>
                    <input
                      value={manage.muscleGroup}
                      onChange={(e) => manage.onFieldChange('muscle_group', e.target.value)}
                      placeholder="Must be a shared term"
                      className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary placeholder:text-text-faint"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-label uppercase text-text-faint">Form cue</span>
                    <input
                      value={manage.defaultCue}
                      onChange={(e) => manage.onFieldChange('default_cue', e.target.value)}
                      className="h-12 w-full rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary"
                    />
                  </label>

                  <div className="space-y-3 border-t border-border pt-3">
                    <ScopeSelect value={manage.scope} gyms={manage.gyms} onChange={manage.onScopeChange} />
                    {manage.usageLabel && (
                      <p className="text-caption text-text-faint">{manage.usageLabel}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={manage.onSave}
                        className="h-12 flex-1 rounded-md bg-accent text-caption font-semibold text-on-accent"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={manage.onArchiveOrDelete}
                        className="h-12 rounded-md border border-border px-4 text-caption text-destructive"
                      >
                        {manage.usageLabel ? 'Archive' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
