'use client';

import { useState } from 'react';
import type { Equipment } from '@/lib/database.types';
import {
  FOCUS_CHOICES,
  INTENSITY_CHOICES,
  EQUIPMENT_CHOICES,
  intensityParams,
  lengthToCount,
  type Intensity,
} from '@/lib/profile';
import LengthDial from '@/components/home/LengthDial';
import { EXERCISE } from '@/lib/vocabulary';

export interface BuilderValue {
  focus: string;
  intensity: Intensity;
  minutes: number;
  equipment: Equipment[];
  sets?: number;
  reps?: number;
  restSec?: number;
}

interface Props {
  value: BuilderValue;
  onChange: (patch: Partial<BuilderValue>) => void;
  /** Hide the equipment row where equipment is set elsewhere (a gym's registered kit). */
  showEquipment?: boolean;
  /** Replaces the equipment row with a read-only summary + link. */
  equipmentNote?: React.ReactNode;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// The workout builder controls — length dial plus summary rows that open sheets.
// Shared by the personal app and the gym builder so trainers get the same calm,
// progressive-disclosure experience instead of a wall of pills.
export default function BuilderControls({ value, onChange, showEquipment = true, equipmentNote }: Props) {
  const [sheet, setSheet] = useState<'focus' | 'intensity' | 'equipment' | null>(null);

  const fc = FOCUS_CHOICES.find((f) => f.value === value.focus) ?? FOCUS_CHOICES[0];
  const ip = intensityParams(value.intensity);
  const estCount = lengthToCount(value.minutes);
  const sets = value.sets ?? ip.sets;
  const reps = value.reps ?? ip.repsNum;
  const restSec = value.restSec ?? ip.restSec;

  const eqSummary =
    value.equipment.length === 0
      ? 'None selected'
      : value.equipment.length === EQUIPMENT_CHOICES.length
        ? 'Everything'
        : value.equipment
            .map((e) => EQUIPMENT_CHOICES.find((c) => c.value === e)?.label ?? e)
            .join(', ');

  return (
    <>
      <div className="my-2">
        <LengthDial minutes={value.minutes} onChange={(m) => onChange({ minutes: m })} />
      </div>

      <button
        type="button"
        onClick={() => setSheet('focus')}
        className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
      >
        <span>
          <span className="block text-caption text-text-muted">FOCUS</span>
          <span className="block text-h3 text-text-primary">
            {fc.emoji} {fc.label}
          </span>
        </span>
        <span className="text-text-faint">Change ›</span>
      </button>

      <button
        type="button"
        onClick={() => setSheet('intensity')}
        className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
      >
        <span>
          <span className="block text-caption text-text-muted">INTENSITY</span>
          <span className="block text-h3 text-text-primary">{ip.label}</span>
          <span className="block text-caption text-text-muted nums">
            ≈ {estCount} {estCount === 1 ? EXERCISE.one : EXERCISE.many} · {sets} × {reps} · {restSec}s rest
          </span>
        </span>
        <span className="text-text-faint">Change ›</span>
      </button>

      {showEquipment ? (
        <button
          type="button"
          onClick={() => setSheet('equipment')}
          className="mb-4 flex w-full items-center justify-between rounded-lg border border-border bg-surface p-4 text-left active:bg-surface-raised"
        >
          <span className="min-w-0">
            <span className="block text-caption text-text-muted">EQUIPMENT</span>
            <span className="block truncate text-h3 text-text-primary">{eqSummary}</span>
          </span>
          <span className="shrink-0 text-text-faint">Change ›</span>
        </button>
      ) : (
        equipmentNote && <div className="mb-4">{equipmentNote}</div>
      )}

      {/* Change sheets */}
      {sheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-black/60" onClick={() => setSheet(null)} aria-label="Close" />
          <div className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-h3 text-text-primary">
              {sheet === 'focus' ? 'Choose a focus' : sheet === 'intensity' ? 'Intensity & volume' : 'Your equipment'}
            </p>

            {sheet === 'focus' && (
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_CHOICES.map((f) => {
                  const on = value.focus === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        onChange({ focus: f.value });
                        setSheet(null);
                      }}
                      className={`rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
                    >
                      <span className="text-h3">{f.emoji}</span>
                      <span className="mt-1 block text-body font-semibold text-text-primary">{f.label}</span>
                      <span className="block text-caption text-text-muted">{f.desc}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {sheet === 'intensity' && (
              <>
                <div className="space-y-2">
                  {INTENSITY_CHOICES.map((it) => {
                    const on = value.intensity === it.value;
                    return (
                      <button
                        key={it.value}
                        type="button"
                        onClick={() =>
                          onChange({ intensity: it.value, sets: it.sets, reps: it.repsNum, restSec: it.restSec })
                        }
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
                      >
                        <span>
                          <span className="block text-body font-semibold text-text-primary">{it.label}</span>
                          <span className="block text-caption text-text-muted">{it.desc}</span>
                        </span>
                        {on && <span className="text-accent">●</span>}
                      </button>
                    );
                  })}
                </div>

                <p className="mb-2 mt-4 text-caption text-text-muted">FINE-TUNE</p>
                <div className="space-y-2">
                  {(
                    [
                      { label: 'Sets', val: sets, lo: 1, hi: 6, step: 1, key: 'sets' as const, unit: '' },
                      { label: 'Reps', val: reps, lo: 5, hi: 20, step: 1, key: 'reps' as const, unit: '' },
                      { label: 'Rest', val: restSec, lo: 15, hi: 150, step: 15, key: 'restSec' as const, unit: 's' },
                    ]
                  ).map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                      <span className="text-body text-text-primary">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onChange({ [row.key]: clamp(row.val - row.step, row.lo, row.hi) })}
                          className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95"
                        >
                          −
                        </button>
                        <span className="w-12 text-center text-body font-semibold text-text-primary nums">
                          {row.val}
                          {row.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => onChange({ [row.key]: clamp(row.val + row.step, row.lo, row.hi) })}
                          className="h-9 w-9 rounded-full border border-border text-h3 text-text-primary active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
                >
                  DONE
                </button>
              </>
            )}

            {sheet === 'equipment' && (
              <>
                <div className="space-y-2">
                  {EQUIPMENT_CHOICES.map((c) => {
                    const on = value.equipment.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          onChange({
                            equipment: on
                              ? value.equipment.filter((e) => e !== c.value)
                              : [...value.equipment, c.value],
                          })
                        }
                        className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-h3">{c.emoji}</span>
                          <span>
                            <span className="block text-body font-semibold text-text-primary">{c.label}</span>
                            <span className="block text-caption text-text-muted">{c.hint}</span>
                          </span>
                        </span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-accent bg-accent text-on-accent' : 'border-border'}`}
                        >
                          {on ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setSheet(null)}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.97]"
                >
                  DONE
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
