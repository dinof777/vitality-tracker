import type { Equipment } from './database.types';

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
): Promise<RoutineWithExercises | null> {
  const res = await fetch('/api/routines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dayOfWeek }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.routine ?? null;
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
