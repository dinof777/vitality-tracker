// Hand-maintained types that mirror supabase/schema.sql.
// When the schema changes, update these to match (or regenerate with the
// Supabase CLI: `supabase gen types typescript`).

export type SetType = 'normal' | 'amrap' | 'dropset' | 'half_rep';

export type Equipment = 'dumbbell' | 'band' | 'isometric' | 'stretch';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  default_cue: string | null;
  equipment: Equipment | null;
  image_url: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  name: string;
  day_of_week: number | null; // 1=Mon .. 7=Sun
  sort_order: number;
  created_at: string;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  sort_order: number;
  default_sets: number | null;
  default_reps: string | null; // allows "8-12"
  default_tempo: string | null; // e.g. "3-1-1"
  default_weight: number | null;
}

export interface Workout {
  id: string;
  routine_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface LogEntry {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  tempo: string | null;
  set_type: SetType;
  rpe: number | null; // 1-10
  created_at: string;
}

export interface MobilityLog {
  id: string;
  logged_date: string; // YYYY-MM-DD
  completed_items: string[]; // checklist item keys
  streak_count: number;
  created_at: string;
}
