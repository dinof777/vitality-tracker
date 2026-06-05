'use client';

import { useState } from 'react';
import type { SetType } from '@/lib/database.types';
import { SET_TYPES, SET_TYPE_INFO, TEMPO_INFO, TEMPO_PRESETS, type LoggedSet } from '@/lib/workout-types';

interface SetLogRowProps {
  exerciseId: string;
  setNumber: number;
  defaultWeight?: number | null;
  defaultReps?: number | null;
  defaultTempo?: string;
  onLogSet: (entry: LoggedSet) => void;
}

// One row for logging a single set: weight + reps inputs, tempo badge picker,
// set-type chips, and a full-width Log Set button. Inputs pre-fill from the
// previous set (progressive overload). All targets >= 48px.
export default function SetLogRow({
  exerciseId,
  setNumber,
  defaultWeight = null,
  defaultReps = null,
  defaultTempo = '3-1-1',
  onLogSet,
}: SetLogRowProps) {
  const [weight, setWeight] = useState(defaultWeight != null ? String(defaultWeight) : '');
  const [reps, setReps] = useState(defaultReps != null ? String(defaultReps) : '');
  const [tempo, setTempo] = useState(defaultTempo);
  const [customTempo, setCustomTempo] = useState(!TEMPO_PRESETS.includes(defaultTempo as never));
  const [setType, setSetType] = useState<SetType>('normal');

  const handleLog = () => {
    onLogSet({
      exerciseId,
      setNumber,
      weight: weight === '' ? null : Number(weight),
      reps: reps === '' ? null : Number(reps),
      tempo,
      setType,
    });
    // The parent remounts this row for the next set with fresh pre-fill.
  };

  const inputClass =
    'h-12 w-full rounded-md bg-surface-raised text-center text-2xl font-extrabold nums text-text-primary placeholder:text-text-faint outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <span className="text-caption text-text-faint">SET {setNumber}</span>
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
      </div>

      {/* Tempo badge picker */}
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
              className={`h-8 rounded-full px-3 text-caption font-semibold nums transition-colors ${
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
          className={`h-8 rounded-full px-3 text-caption font-semibold transition-colors ${
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
            className="h-8 w-24 rounded-full bg-surface-raised px-3 text-caption nums text-text-primary outline-none focus:ring-2 focus:ring-accent"
            aria-label="Custom tempo"
          />
        )}
      </div>

      {/* Set type chips */}
      <div className="inline-flex w-full rounded-full bg-surface-raised p-1">
        {SET_TYPES.map((st) => {
          const active = setType === st.value;
          const activeClass =
            st.value === 'amrap' ? 'bg-energy text-on-accent' : 'bg-accent text-on-accent';
          return (
            <button
              key={st.value}
              type="button"
              title={SET_TYPE_INFO[st.value]}
              onClick={() => setSetType(st.value)}
              className={`h-9 flex-1 rounded-full text-caption font-semibold transition-colors ${
                active ? activeClass : 'text-text-muted'
              }`}
            >
              {st.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleLog}
        className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all duration-150 ease-out active:scale-[0.97] active:bg-accent-press"
      >
        LOG SET
      </button>
    </div>
  );
}
