-- =============================================================================
-- Vitality Workout Tracker — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Tables are in dependency order: parents before the rows that reference them.
-- Postgres 15 (Supabase) — uses gen_random_uuid() from the built-in pgcrypto.
-- =============================================================================

-- exercises: the master library of movements you can log.
-- default_cue holds Brian Pruett's form reminder (e.g. "3s negative, squeeze top").
-- equipment is constrained to the Vitality kit: dumbbells, bands, isometric
-- holds, and stretches (no barbells/machines).
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  muscle_group text,
  default_cue  text,
  equipment    text check (equipment in ('dumbbell', 'tube_band', 'loop_band', 'isometric', 'stretch')),
  image_url    text,
  created_at   timestamptz not null default now()
);

-- routines: a named training day / blueprint (e.g. "Upper Pump — Week 1").
-- day_of_week is 1=Mon … 7=Sun, nullable for routines not tied to a weekday.
create table if not exists routines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  day_of_week int check (day_of_week between 1 and 7),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- routine_exercises: the ordered exercises that make up a routine, with the
-- pre-programmed prescription (sets, reps, tempo, optional starting weight).
-- default_reps is text so it can hold ranges like "8-12".
-- default_tempo is text in eccentric-pause-concentric form like "3-1-1".
create table if not exists routine_exercises (
  id             uuid primary key default gen_random_uuid(),
  routine_id     uuid not null references routines(id)  on delete cascade,
  exercise_id    uuid not null references exercises(id) on delete cascade,
  sort_order     int  not null default 0,
  default_sets   int,
  default_reps   text,
  default_tempo  text,
  default_weight numeric
);

-- workouts: a single training session. routine_id is nullable so you can log
-- a freestyle session. finished_at is null while the session is in progress.
create table if not exists workouts (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid references routines(id) on delete set null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  notes       text
);

-- log_entries: one row per set performed. This is the progressive-overload spine.
-- set_type is constrained to the four Vitality set styles.
-- rpe (rate of perceived exertion) is 1–10, nullable.
create table if not exists log_entries (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts(id)  on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  set_number  int  not null,
  weight      numeric,
  reps        int,
  tempo       text,
  set_type    text not null default 'normal'
                check (set_type in ('normal', 'amrap', 'dropset', 'half_rep')),
  rpe         int check (rpe between 1 and 10),
  created_at  timestamptz not null default now()
);

-- mobility_logs: the Daily 5 mobility checklist, one row per calendar day.
-- completed_items is a jsonb array of the checklist item keys ticked that day.
-- streak_count is the running consecutive-day streak as of logged_date.
create table if not exists mobility_logs (
  id              uuid primary key default gen_random_uuid(),
  logged_date     date not null unique,
  completed_items jsonb not null default '[]'::jsonb,
  streak_count    int  not null default 0,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes on the hot foreign-key / lookup columns.
-- -----------------------------------------------------------------------------
create index if not exists idx_routine_exercises_routine_id on routine_exercises (routine_id);
create index if not exists idx_routine_exercises_exercise_id on routine_exercises (exercise_id);
create index if not exists idx_workouts_routine_id          on workouts (routine_id);
create index if not exists idx_workouts_started_at          on workouts (started_at desc);
create index if not exists idx_log_entries_workout_id       on log_entries (workout_id);
create index if not exists idx_log_entries_exercise_id      on log_entries (exercise_id);
-- Progressive-overload sparkline query: weight history per exercise over time.
create index if not exists idx_log_entries_exercise_created on log_entries (exercise_id, created_at desc);
create index if not exists idx_mobility_logs_logged_date    on mobility_logs (logged_date desc);
