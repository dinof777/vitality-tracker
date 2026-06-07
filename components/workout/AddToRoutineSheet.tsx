'use client';

import { useEffect, useState } from 'react';
import {
  createRoutine,
  fetchRoutines,
  saveRoutineExercises,
  type RoutineWithExercises,
} from '@/lib/routines';

interface AddToRoutineSheetProps {
  exerciseId: string;
  exerciseName: string;
  onClose: () => void;
}

// Bottom sheet: add one exercise to an existing routine/circuit, or spin up a
// new routine containing it. saveRoutineExercises replaces the whole list, so
// we re-send the routine's current exercises plus the new one.
export default function AddToRoutineSheet({ exerciseId, exerciseName, onClose }: AddToRoutineSheetProps) {
  const [routines, setRoutines] = useState<RoutineWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = () =>
    fetchRoutines().then((r) => {
      setRoutines(r);
      setLoading(false);
    });

  useEffect(() => {
    void load();
  }, []);

  const addTo = async (routine: RoutineWithExercises) => {
    if (busyId) return;
    if (routine.exercises.some((e) => e.exercise_id === exerciseId)) {
      setAddedTo((s) => new Set(s).add(routine.id));
      return;
    }
    setBusyId(routine.id);
    const inputs = routine.exercises.map((e) => ({
      exerciseId: e.exercise_id,
      sets: e.default_sets,
      reps: e.default_reps,
      tempo: e.default_tempo,
    }));
    inputs.push({ exerciseId, sets: null, reps: null, tempo: null });
    await saveRoutineExercises(routine.id, inputs);
    setAddedTo((s) => new Set(s).add(routine.id));
    setBusyId(null);
    void load();
  };

  const createAndAdd = async () => {
    if (!newName.trim() || busyId) return;
    setBusyId('new');
    const r = await createRoutine(newName.trim(), null);
    if (r) {
      await saveRoutineExercises(r.id, [{ exerciseId, sets: null, reps: null, tempo: null }]);
      setAddedTo((s) => new Set(s).add(r.id));
    }
    setNewName('');
    setCreating(false);
    setBusyId(null);
    void load();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border" />
        <p className="text-h3 text-text-primary">Add to routine</p>
        <p className="mb-4 text-caption text-text-muted">{exerciseName}</p>

        {loading ? (
          <p className="text-caption text-text-muted">Loading routines…</p>
        ) : (
          <ul className="space-y-2">
            {routines.map((r) => {
              const added = addedTo.has(r.id) || r.exercises.some((e) => e.exercise_id === exerciseId);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => addTo(r)}
                    disabled={busyId === r.id}
                    className="flex w-full items-center justify-between rounded-md border border-border bg-surface p-3 text-left active:bg-surface-raised disabled:opacity-60"
                  >
                    <span>
                      <span className="block text-body font-semibold text-text-primary">{r.name}</span>
                      <span className="block text-caption text-text-muted">
                        {r.exercises.length} exercise{r.exercises.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className={`text-label ${added ? 'text-accent' : 'text-text-faint'}`}>
                      {busyId === r.id ? '…' : added ? 'Added ✓' : '+ Add'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {creating ? (
          <div className="mt-3 space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New routine name"
              className="h-12 w-full rounded-md bg-surface-raised px-3 text-body text-text-primary outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createAndAdd}
                disabled={busyId === 'new'}
                className="h-12 flex-1 rounded-md bg-accent text-label text-on-accent active:scale-[0.97] disabled:opacity-50"
              >
                {busyId === 'new' ? 'CREATING…' : 'CREATE & ADD'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-12 rounded-md border border-border px-4 text-label text-text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface-raised"
          >
            + NEW ROUTINE
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-11 w-full items-center justify-center text-caption text-text-muted"
        >
          Done
        </button>
      </div>
    </div>
  );
}
