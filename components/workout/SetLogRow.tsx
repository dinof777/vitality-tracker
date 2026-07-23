'use client';

import { useState } from 'react';
import type { SetType } from '@/lib/database.types';
import { modeWorkLabel, type ExerciseMode } from '@/lib/exercise-mode';
import { SET_TYPES, SET_TYPE_INFO, TEMPO_INFO, TEMPO_PRESETS, canLogSet, type LoggedSet } from '@/lib/workout-types';

interface SetLogRowProps {
  exerciseId: string;
  setNumber: number;
  mode: ExerciseMode;
  perSide: boolean;
  defaultSide?: 'L' | 'R';
  defaultWeight?: number | null;
  defaultReps?: number | null; // reps, or seconds for timed moves
  defaultTempo?: string;
  onLogSet: (entry: LoggedSet) => void;
}

// One row for logging a single set. Strength moves show weight × reps + tempo +
// set-type; timed moves (holds / cardio / carries) show a single seconds input.
// Unilateral moves add an L / R side toggle.
export default function SetLogRow({
  exerciseId,
  setNumber,
  mode,
  perSide,
  defaultSide = 'L',
  defaultWeight = null,
  defaultReps = null,
  defaultTempo = '3-1-1',
  onLogSet,
}: SetLogRowProps) {
  const timed = mode !== 'reps';
  const [weight, setWeight] = useState(defaultWeight != null ? String(defaultWeight) : '');
  const [reps, setReps] = useState(defaultReps != null ? String(defaultReps) : '');
  const [tempo, setTempo] = useState(defaultTempo);
  const [customTempo, setCustomTempo] = useState(!TEMPO_PRESETS.includes(defaultTempo as never));
  const [setType, setSetType] = useState<SetType>('normal');
  const [side, setSide] = useState<'L' | 'R'>(defaultSide);

  const handleLog = () => {
    onLogSet({
      exerciseId,
      setNumber,
      weight: timed ? null : weight === '' ? null : Number(weight),
      reps: reps === '' ? null : Number(reps),
      tempo: timed ? '' : tempo,
      setType: timed ? 'normal' : setType,
      side: perSide ? side : null,
    });
  };

  const canLog = canLogSet(reps);

  const inputClass =
    'h-12 w-full rounded-md bg-surface-raised text-center text-2xl font-extrabold nums text-text-primary placeholder:text-text-faint outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <span className="text-caption text-text-faint">SET {setNumber}</span>
        {timed ? (
          <label className="flex-1">
            <span className="mb-1 block text-caption text-text-muted">{modeWorkLabel(mode).toUpperCase()} (SEC)</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className={inputClass}
              aria-label={`Set ${setNumber} seconds`}
            />
          </label>
        ) : (
          <div className="flex flex-1 items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-caption text-text-muted">WEIGHT</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={inputClass}
                aria-label={`Set ${setNumber} weight`}
              />
            </label>
            <span className="mb-3 text-text-faint">×</span>
            <label className="flex-1">
              <span className="mb-1 block text-caption text-text-muted">REPS</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className={inputClass}
                aria-label={`Set ${setNumber} reps`}
              />
            </label>
          </div>
        )}
      </div>

      {/* Per-side toggle */}
      {perSide && (
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-muted">SIDE</span>
          <div className="inline-flex rounded-full bg-surface-raised p-1">
            {(['L', 'R'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`h-11 w-16 rounded-full text-caption font-semibold transition-colors ${
                  side === s ? 'bg-accent text-on-accent' : 'text-text-muted'
                }`}
              >
                {s === 'L' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Strength-only: tempo + set type */}
      {!timed && (
        <>
          <div className="flex flex-wrap items-center gap-2" title={TEMPO_INFO}>
            {TEMPO_PRESETS.map((t) => {
              const active = !customTempo && tempo === t;
              return (
                <button
                  key={t}
                  type="button"
                  title={TEMPO_INFO}
                  onClick={() => {
                    setCustomTempo(false);
                    setTempo(t);
                  }}
                  className={`h-11 rounded-full px-3 text-caption font-semibold nums transition-colors ${
                    active ? 'bg-accent text-on-accent' : 'bg-accent/15 text-accent'
                  }`}
                >
                  {t}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCustomTempo(true)}
              className={`h-11 rounded-full px-3 text-caption font-semibold transition-colors ${
                customTempo ? 'bg-accent text-on-accent' : 'bg-surface-raised text-text-muted'
              }`}
            >
              Custom
            </button>
            {customTempo && (
              <input
                type="text"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="e.g. 2-1-X"
                className="h-11 w-24 rounded-full bg-surface-raised px-3 text-caption nums text-text-primary outline-none focus:ring-2 focus:ring-accent"
                aria-label="Custom tempo"
              />
            )}
          </div>

          <div className="inline-flex w-full rounded-full bg-surface-raised p-1">
            {SET_TYPES.map((st) => {
              const active = setType === st.value;
              const activeClass = st.value === 'amrap' ? 'bg-energy text-on-accent' : 'bg-accent text-on-accent';
              return (
                <button
                  key={st.value}
                  type="button"
                  title={SET_TYPE_INFO[st.value]}
                  onClick={() => setSetType(st.value)}
                  className={`h-11 flex-1 rounded-full text-caption font-semibold transition-colors ${
                    active ? activeClass : 'text-text-muted'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleLog}
        disabled={!canLog}
        className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 ease-out active:scale-[0.97] active:bg-accent-press disabled:opacity-40 disabled:active:scale-100"
      >
        LOG SET{perSide ? ` · ${side === 'L' ? 'LEFT' : 'RIGHT'}` : ''}
      </button>
    </div>
  );
}
