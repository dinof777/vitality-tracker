import type { Equipment, SetOrder, WorkoutMode } from './database.types';

// A routine's exercise row — routine_exercises joined with the exercise.
export interface RoutineExerciseRow {
  id: string; // routine_exercises.id
  exercise_id: string;
  sort_order: number;
  default_sets: number | null;
  default_reps: string | null;
  default_tempo: string | null;
  name: string;
  muscle_group: string | null;
  equipment: Equipment | null;
  image_url: string | null;
  default_cue: string | null;
}

export interface RoutineWithExercises {
  id: string;
  name: string;
  day_of_week: number | null;
  sort_order: number;
  from_plan: boolean; // true = part of the (single) weekly plan
  favorite: boolean; // pinned to Profile › My Routines
  // SyncroFit v2 handoff — see supabase/migrations/0010, 0011.
  set_order: SetOrder;
  mode: WorkoutMode;
  amrap_minutes: number;
  emom_minutes: number;
  exercises: RoutineExerciseRow[];
}

// What the detail editor PUTs back to persist add/reorder/remove.
export interface RoutineExerciseInput {
  exerciseId: string;
  sets: number | null;
  reps: string | null;
  tempo: string | null;
}

export const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---- Client fetch helpers ----

export async function fetchRoutines(): Promise<RoutineWithExercises[]> {
  const res = await fetch('/api/routines');
  if (!res.ok) return [];
  const data = await res.json();
  return data.routines ?? [];
}

export async function fetchRoutine(id: string): Promise<RoutineWithExercises | null> {
  const res = await fetch(`/api/routines/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.routine ?? null;
}

export async function createRoutine(
  name: string,
  dayOfWeek: number | null,
  fromPlan = false,
): Promise<RoutineWithExercises | null> {
  const res = await fetch('/api/routines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dayOfWeek, fromPlan }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.routine ?? null;
}

// Delete the current weekly plan (all from_plan routines) — so a new plan
// replaces it rather than stacking up.
export async function clearWeeklyPlan(): Promise<void> {
  await fetch('/api/routines', { method: 'DELETE' });
}

// Permanently delete a routine (cascades its exercises).
export async function deleteRoutine(id: string): Promise<void> {
  await fetch(`/api/routines/${id}`, { method: 'DELETE' });
}

// Favorite / unfavorite a routine (shows on Profile › My Routines).
export async function setRoutineFavorite(id: string, favorite: boolean): Promise<void> {
  await fetch(`/api/routines/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite }),
  });
}

// Circuit vs Straight Sets — how a routine's sets are ordered when run.
export async function setRoutineSetOrder(id: string, setOrder: SetOrder): Promise<void> {
  await fetch(`/api/routines/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setOrder }),
  });
}

// Workout style (Intervals/For Time/AMRAP/EMOM) + the AMRAP/EMOM minute cap.
export async function setRoutineMode(
  id: string,
  mode: WorkoutMode,
  amrapMinutes?: number,
  emomMinutes?: number,
): Promise<void> {
  await fetch(`/api/routines/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, amrapMinutes, emomMinutes }),
  });
}

export async function saveRoutineExercises(
  routineId: string,
  exercises: RoutineExerciseInput[],
): Promise<void> {
  await fetch(`/api/routines/${routineId}/exercises`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exercises }),
  });
}
