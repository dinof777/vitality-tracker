'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import ExerciseDetailSheet from '@/components/workout/ExerciseDetailSheet';
import {
  DAY_LABELS,
  fetchRoutine,
  saveRoutineExercises,
  type RoutineExerciseRow,
  type RoutineWithExercises,
} from '@/lib/routines';
import ExercisePicker from '@/components/workout/ExercisePicker';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import { syncrofitRunUrlFromRoutine } from '@/lib/syncrofit';
import { EQUIPMENT_LABEL } from '@/lib/exercises';
import WorkoutStyleControl, { type WorkoutStylePatch } from '@/components/workout/WorkoutStyleControl';
import { setRoutineMode, setRoutineSetOrder } from '@/lib/routines';

interface SfRecent {
  id: string;
  event: string;
  user_display_name: string | null;
  duration_seconds: number | null;
  event_ts: string | null;
  received_at: string;
}
interface Engagement {
  summary: { imports: number; completions: number; uniqueUsers: number; lastActivity: string | null };
  recent: SfRecent[];
}

function fmtDur(s: number): string {
  const m = Math.round(s / 60);
  return m >= 1 ? `${m}m` : `${s}s`;
}
function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return '';
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RoutineDetailPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const [routine, setRoutine] = useState<RoutineWithExercises | null>(null);
  const [rows, setRows] = useState<RoutineExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [syncHint, setSyncHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);

  const rowToExercise = (re: RoutineExerciseRow): Exercise => ({
    id: re.exercise_id,
    name: re.name,
    muscle_group: re.muscle_group,
    default_cue: re.default_cue,
    equipment: re.equipment,
    image_url: re.image_url,
    created_at: '',
  });

  useEffect(() => {
    fetchRoutine(routineId).then((r) => {
      setRoutine(r);
      setRows(r?.exercises ?? []);
      setLoading(false);
    });
  }, [routineId]);

  // SyncroFit engagement for this routine (circuit_id === routine id).
  useEffect(() => {
    fetch(`/api/routines/${routineId}/engagement`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Engagement | null) => setEngagement(d))
      .catch(() => {});
  }, [routineId]);

  // Persist the current order/contents to the DB.
  const persist = (next: RoutineExerciseRow[]) => {
    setRows(next);
    void saveRoutineExercises(
      routineId,
      next.map((r) => ({
        exerciseId: r.exercise_id,
        sets: r.default_sets,
        reps: r.default_reps,
        tempo: r.default_tempo,
      })),
    );
  };

  const addExercise = (ex: Exercise) => {
    persist([
      ...rows,
      {
        id: `tmp-${ex.id}`,
        exercise_id: ex.id,
        sort_order: rows.length,
        default_sets: 3,
        default_reps: '8-12',
        default_tempo: '3-1-1',
        name: ex.name,
        muscle_group: ex.muscle_group,
        equipment: ex.equipment,
        image_url: ex.image_url,
        default_cue: ex.default_cue,
      },
    ]);
    setPicking(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const remove = (index: number) => persist(rows.filter((_, i) => i !== index));

  // Persist a workout-style change (mode/minutes/set order) — optimistic
  // local update + the PATCH that writes it to the routine's DB columns.
  const updateStyle = (patch: WorkoutStylePatch) => {
    if (!routine) return;
    const next = {
      mode: patch.mode ?? routine.mode,
      amrap_minutes: patch.amrapMinutes ?? routine.amrap_minutes,
      emom_minutes: patch.emomMinutes ?? routine.emom_minutes,
      set_order: patch.setOrder ?? routine.set_order,
    };
    setRoutine({ ...routine, ...next });
    if (patch.setOrder !== undefined) void setRoutineSetOrder(routine.id, patch.setOrder);
    if (patch.mode !== undefined || patch.amrapMinutes !== undefined || patch.emomMinutes !== undefined) {
      void setRoutineMode(routine.id, next.mode, next.amrap_minutes, next.emom_minutes);
    }
  };

  // Hand this routine to SyncroFit as a timed circuit. Copy the import link to
  // the clipboard (so SyncroFit's in-app Import works) AND open the deep link
  // (so a build with onOpenURL auto-imports). Needs SyncroFit on the iPhone.
  const sendToSyncrofit = async () => {
    if (!routine || rows.length === 0) return;
    const url = syncrofitRunUrlFromRoutine({ ...routine, exercises: rows });
    setSyncHint(true);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
    try {
      window.location.href = url;
    } catch {
      /* no handler — clipboard + in-app Import still works */
    }
  };

  const copySyncLink = async () => {
    if (!routine) return;
    try {
      await navigator.clipboard.writeText(syncrofitRunUrlFromRoutine({ ...routine, exercises: rows }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading) {
    return (
      <main className="shell min-h-dvh px-4 pt-8">
        <div className="h-8 w-40 animate-pulse rounded bg-surface" />
      </main>
    );
  }

  if (!routine) {
    return (
      <main className="shell min-h-dvh px-4 pt-8">
        <p className="text-body text-text-muted">Routine not found.</p>
        <Link href="/routines" className="text-accent">
          ← Back to routines
        </Link>
      </main>
    );
  }

  return (
    <main className="shell min-h-dvh px-4 pb-32 pt-8">
      <Link href="/routines" className="text-caption text-text-muted">
        ← Routines
      </Link>
      <header className="mb-5 mt-2">
        <h1 className="text-h1 text-text-primary">{routine.name}</h1>
        {routine.day_of_week && (
          <p className="text-caption text-text-muted">{DAY_LABELS[routine.day_of_week]}</p>
        )}
      </header>

      <ul className="space-y-2">
        {rows.map((re, i) => (
          <li
            key={re.id}
            className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="text-text-faint active:text-accent disabled:opacity-30"
                disabled={i === 0}
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="text-text-faint active:text-accent disabled:opacity-30"
                disabled={i === rows.length - 1}
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDetail(rowToExercise(re))}
              className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
            >
              <ExerciseThumb equipment={re.equipment} imageUrl={re.image_url} name={re.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-text-primary">{re.name}</span>
                <span className="block text-caption text-text-muted">
                  {[re.equipment && EQUIPMENT_LABEL[re.equipment], `${re.default_sets} × ${re.default_reps} · ${re.default_tempo}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-caption text-destructive"
              aria-label="Remove exercise"
            >
              Remove
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-md border border-dashed border-border p-5 text-center text-caption text-text-muted">
            No exercises yet. Add your first one.
          </li>
        )}
      </ul>

      {picking ? (
        <div className="mt-4">
          <ExercisePicker
            excludeIds={rows.map((r) => r.exercise_id)}
            onPick={addExercise}
            onClose={() => setPicking(false)}
            addLabel="Add to routine"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:scale-[0.97] active:bg-surface"
        >
          + ADD EXERCISE
        </button>
      )}

      {/* Workout style — how this routine runs once handed to SyncroFit.
          Always visible, not behind a sheet: a trainer is already editing a
          saved, persistent thing, and the exercise list itself is fully
          expanded above, not summarized. */}
      <section className="mt-5">
        <p className="mb-2 text-label text-accent">WORKOUT STYLE</p>
        <WorkoutStyleControl
          mode={routine.mode}
          amrapMinutes={routine.amrap_minutes}
          emomMinutes={routine.emom_minutes}
          setOrder={routine.set_order}
          onChange={updateStyle}
        />
      </section>

      {/* Send to SyncroFit as a timed interval circuit */}
      {rows.length > 0 && (
        <button
          type="button"
          onClick={sendToSyncrofit}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-label text-text-primary active:scale-[0.97] active:bg-surface-raised"
        >
          ⏱ SEND TO SYNCROFIT
        </button>
      )}

      {syncHint ? (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-surface p-3">
          <p className="text-caption text-text-muted">
            {copied ? (
              <>
                <span className="font-semibold text-success">Link copied ✓</span> — if SyncroFit
                didn&apos;t open and load the circuit, open <span className="text-text-primary">SyncroFit</span>{' '}
                on your iPhone and tap <span className="text-text-primary">Import</span> (the link&apos;s on your clipboard).
              </>
            ) : (
              <>Opening <span className="text-text-primary">SyncroFit</span>… needs the app installed on your iPhone.</>
            )}
          </p>
          <button
            type="button"
            onClick={copySyncLink}
            className="h-9 w-full rounded-md border border-border text-caption font-semibold text-accent active:bg-surface-raised"
          >
            {copied ? 'Copy again' : 'Copy circuit link'}
          </button>
        </div>
      ) : (
        <p className="mt-2 px-1 text-caption text-text-faint">
          Sends this routine to SyncroFit as a timed circuit (needs the SyncroFit app on your iPhone).
        </p>
      )}

      {/* SyncroFit engagement — how this circuit is being used */}
      {engagement && (engagement.summary.imports > 0 || engagement.summary.completions > 0) ? (
        <section className="mt-6">
          <p className="mb-2 text-label text-accent">SYNCROFIT ACTIVITY</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: engagement.summary.imports, label: 'Imports' },
              { n: engagement.summary.completions, label: 'Completions' },
              { n: engagement.summary.uniqueUsers, label: 'Athletes' },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border bg-surface p-3 text-center">
                <div className="text-h2 font-bold text-text-primary nums">{s.n}</div>
                <div className="text-caption text-text-muted">{s.label}</div>
              </div>
            ))}
          </div>
          {engagement.recent.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {engagement.recent.slice(0, 6).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
                >
                  <span className="min-w-0 truncate text-caption text-text-primary">
                    {e.event === 'circuit.completed' ? '✓ Completed' : '↓ Imported'}
                    {e.user_display_name ? ` · ${e.user_display_name}` : ''}
                  </span>
                  <span className="shrink-0 text-caption text-text-faint nums">
                    {e.event === 'circuit.completed' && e.duration_seconds ? `${fmtDur(e.duration_seconds)} · ` : ''}
                    {timeAgo(e.event_ts ?? e.received_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : engagement ? (
        <p className="mt-6 px-1 text-caption text-text-faint">
          No SyncroFit activity yet — when someone imports or completes this circuit in SyncroFit, it shows up here.
        </p>
      ) : null}

      {/* Sticky Start Workout */}
      <div className="fixed inset-x-0 bottom-16 mx-auto max-w-md px-4 pt-2">
        <Link
          href={`/workout/active?routine=${routine.id}`}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent shadow-lift transition-all duration-150 active:scale-[0.97] active:bg-accent-press"
        >
          START WORKOUT
        </Link>
      </div>

      {detail && <ExerciseDetailSheet exercise={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
