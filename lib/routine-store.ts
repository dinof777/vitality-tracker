// Local-first routine store (localStorage). Lets you build and persist routine
// blueprints before Supabase is wired; mirrors the routines / routine_exercises
// schema so it can sync to the DB later.
export interface LocalRoutineExercise {
  exerciseId: string;
  sets: number;
  reps: string; // allows "8-12"
  tempo: string;
}

export interface LocalRoutine {
  id: string;
  name: string;
  dayOfWeek: number | null; // 1=Mon .. 7=Sun
  exercises: LocalRoutineExercise[];
}

const KEY = 'vitality_routines';

export function loadRoutines(): LocalRoutine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalRoutine[]) : [];
  } catch {
    return [];
  }
}

function persist(routines: LocalRoutine[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(routines));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function createRoutine(name: string, dayOfWeek: number | null): LocalRoutine {
  const routines = loadRoutines();
  const routine: LocalRoutine = { id: newId(), name, dayOfWeek, exercises: [] };
  persist([...routines, routine]);
  return routine;
}

export function getRoutine(id: string): LocalRoutine | undefined {
  return loadRoutines().find((r) => r.id === id);
}

export function updateRoutine(updated: LocalRoutine): void {
  persist(loadRoutines().map((r) => (r.id === updated.id ? updated : r)));
}

export function deleteRoutine(id: string): void {
  persist(loadRoutines().filter((r) => r.id !== id));
}

export const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
