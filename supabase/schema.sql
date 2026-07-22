-- =============================================================================
-- Vitality Workout Tracker — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and Run.
-- Tables are in dependency order: parents before the rows that reference them.
-- Postgres 15 (Supabase) — uses gen_random_uuid() from the built-in pgcrypto.
-- =============================================================================

-- schema_migrations: which supabase/migrations/*.sql files have been applied
-- to this database, and when. Recorded by scripts/run-migrations.mjs (npm run
-- migrate) — see supabase/migrations/README.md for the process. Not itself a
-- migration step here; a fresh install via this file already has every
-- migration's changes baked in.
create table if not exists schema_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

-- tenants: white-label orgs (gyms / trainers). Phase 0 multi-tenancy.
-- branding jsonb overrides the default theme tokens (accent, logo, brand name…).
-- Resolved path-based at /g/<slug>; subdomains/custom domains added later.
create table if not exists tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  branding      jsonb not null default '{}'::jsonb,
  custom_domain text unique,
  clerk_org_id  text unique,   -- links the tenant to its Clerk Organization
  plan          text not null default 'free',
  created_at    timestamptz not null default now()
);

-- equipment_catalog: the global, deduped equipment taxonomy. 9 'core' rows are
-- the canonical set; gyms propose new pieces as 'pending' → admin moderation
-- approves/rejects/merges (status). normalized is the dedup key.
-- Declared before `exercises`, which references it.
create table if not exists equipment_catalog (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  normalized  text not null unique,
  status      text not null default 'pending'
                check (status in ('core', 'approved', 'pending', 'rejected', 'merged')),
  merged_into uuid references equipment_catalog(id) on delete set null,
  created_by_tenant_id uuid references tenants(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- exercises: the master library of movements you can log.
-- default_cue holds Brian Pruett's form reminder (e.g. "3s negative, squeeze top").
-- equipment is constrained to the Vitality kit: dumbbells, bands, isometric
-- holds, and stretches (no barbells/machines).
-- is_global rows are the shared 188-move library (tenant_id null); a gym's own
-- custom moves carry their tenant_id and is_global=false.
-- muscle_group and tags hold the DISPLAY values, validated on write against the
-- taxonomy (see taxonomy_terms) so the vocabulary can't sprawl.
create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  muscle_group text,
  default_cue  text,
  equipment    text check (equipment in ('dumbbell', 'kettlebell', 'calisthenics', 'tube_band', 'loop_band', 'pullup_bar', 'medicine_ball', 'jump_rope', 'stretch')),
  image_url    text,
  tenant_id    uuid references tenants(id) on delete cascade,
  is_global    boolean not null default false,
  equipment_catalog_id uuid references equipment_catalog(id) on delete set null, -- custom-equipment moves (equipment null then)
  tags         text[] not null default '{}',
  -- Retired, not gone. routine_exercises and log_entries CASCADE off this row,
  -- so hard-deleting a move that has been trained destroys its own history —
  -- anything in use archives instead. Archived rows drop out of pickers and
  -- generation but still resolve for existing routines and logs.
  archived_at  timestamptz,
  archived_by  text,
  created_at   timestamptz not null default now()
);

-- taxonomy_terms: the governed vocabulary behind every field a trainer can
-- extend. One row per (kind, normalized) — muscle_group | tag | equipment.
--   status  core     → curated canon, offered first
--           approved → promoted from a proposal, shared by every gym
--           pending  → live for the proposing gym, awaiting review
--           rejected → not offered
--           merged   → folded into merged_into; references heal to the target
--   category is required for kind='tag' (goal | stage | pattern) because the
--   faceted filter groups tags by category — an uncategorized tag would be
--   silently dropped from filtering.
-- Equipment keeps its own table (equipment_catalog) for now; it predates this
-- and carries live foreign keys from exercises.
create table if not exists taxonomy_terms (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('muscle_group', 'tag', 'equipment')),
  name        text not null,
  normalized  text not null,
  category    text check (category in ('goal', 'stage', 'pattern', 'area')),
  status      text not null default 'pending'
                check (status in ('core', 'approved', 'pending', 'rejected', 'merged')),
  merged_into uuid references taxonomy_terms(id) on delete set null,
  created_by_tenant_id uuid references tenants(id) on delete set null,
  archived_at timestamptz,   -- retired but still resolvable; see exercises.archived_at
  archived_by text,
  created_at  timestamptz not null default now(),
  -- Parent region for muscle_group only (app-enforced, not a DB check — see
  -- 0006_taxonomy_parent.sql). Strictly 2 levels: a term with children may not
  -- itself have a parent. Null for every other kind.
  parent_id   uuid references taxonomy_terms(id) on delete set null,
  unique (kind, normalized),
  -- Tags drive faceted filtering, which groups by category.
  constraint tag_needs_category check (kind <> 'tag' or category is not null),
  constraint taxonomy_terms_parent_not_self check (parent_id is distinct from id)
);

-- tenant_terms: which gyms use which term. This is what makes moderation
-- self-prioritizing — a pending term proposed independently by N gyms is a real
-- gap in the canon, and auto-promotes at PROMOTION_THRESHOLD (lib/taxonomy).
create table if not exists tenant_terms (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  term_id    uuid not null references taxonomy_terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, term_id)
);

-- tenant_equipment: which catalog pieces a given gym uses (on top of the core 9).
create table if not exists tenant_equipment (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  catalog_id uuid not null references equipment_catalog(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, catalog_id)
);

-- exercise_aliases: a per-tenant LOCAL display-name override for an exercise
-- (gyms call the same move different things). Never changes it globally.
create table if not exists exercise_aliases (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id)   on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, exercise_id)
);

-- routines: a named training day / blueprint (e.g. "Upper Pump — Week 1").
-- day_of_week is 1=Mon … 7=Sun, nullable for routines not tied to a weekday.
create table if not exists routines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  day_of_week int check (day_of_week between 1 and 7),
  sort_order  int not null default 0,
  from_plan   boolean not null default false, -- part of the single weekly plan
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
  side        text check (side in ('L', 'R')), -- unilateral moves logged per side
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

-- syncrofit_events: inbound feedback from the SyncroFit interval-timer app when a
-- creator's circuit is imported or completed. POSTed to /api/syncrofit/events.
-- circuit_id correlates to the id we put on the circuit we hand off (a routine id).
create table if not exists syncrofit_events (
  id               uuid primary key default gen_random_uuid(),
  event            text not null check (event in ('circuit.imported', 'circuit.completed')),
  circuit_id       text,
  circuit_name     text,
  user_scoped_id   text,
  user_display_name text,
  started_at       timestamptz,
  completed_at     timestamptz,
  duration_seconds integer,
  event_ts         timestamptz,            -- the event's own timestamp from SyncroFit
  received_at      timestamptz not null default now(),
  raw              jsonb not null          -- the full payload as received
);

-- -----------------------------------------------------------------------------
-- Indexes on the hot foreign-key / lookup columns.
-- -----------------------------------------------------------------------------
create index if not exists idx_sf_events_circuit on syncrofit_events (circuit_id, received_at desc);
create index if not exists idx_sf_events_event   on syncrofit_events (event, received_at desc);
create index if not exists idx_routine_exercises_routine_id on routine_exercises (routine_id);
create index if not exists idx_routine_exercises_exercise_id on routine_exercises (exercise_id);
create index if not exists idx_workouts_routine_id          on workouts (routine_id);
create index if not exists idx_workouts_started_at          on workouts (started_at desc);
create index if not exists idx_log_entries_workout_id       on log_entries (workout_id);
create index if not exists idx_log_entries_exercise_id      on log_entries (exercise_id);
-- Progressive-overload sparkline query: weight history per exercise over time.
create index if not exists idx_log_entries_exercise_created on log_entries (exercise_id, created_at desc);
create index if not exists idx_mobility_logs_logged_date    on mobility_logs (logged_date desc);
-- Taxonomy: the picker reads "canon + this gym's" on every load.
create index if not exists idx_taxonomy_kind_status on taxonomy_terms (kind, status);
create index if not exists idx_taxonomy_proposer    on taxonomy_terms (created_by_tenant_id);
create index if not exists idx_taxonomy_parent      on taxonomy_terms (parent_id);
create index if not exists idx_tenant_terms_tenant  on tenant_terms (tenant_id);
create index if not exists idx_tenant_terms_term    on tenant_terms (term_id);
-- Every picker/generator query filters archived_at is null.
create index if not exists idx_exercises_live on exercises (tenant_id) where archived_at is null;
create index if not exists idx_taxonomy_live  on taxonomy_terms (kind, status) where archived_at is null;

-- -----------------------------------------------------------------------------
-- Seed the canon muscle groups + the built-in tag registry as 'core' terms.
-- Mirrors CANON_MUSCLE_GROUPS and TAGS in lib/taxonomy.ts / lib/tags.ts.
-- -----------------------------------------------------------------------------
insert into taxonomy_terms (kind, name, normalized, status) values
  ('muscle_group', 'Arms',         'arms',         'core'),
  ('muscle_group', 'Back',         'back',         'core'),
  ('muscle_group', 'Calves',       'calves',       'core'),
  ('muscle_group', 'Chest',        'chest',        'core'),
  ('muscle_group', 'Conditioning', 'conditioning', 'core'),
  ('muscle_group', 'Core',         'core',         'core'),
  ('muscle_group', 'Full Body',    'full body',    'core'),
  ('muscle_group', 'Glutes',       'glutes',       'core'),
  ('muscle_group', 'Grip',         'grip',         'core'),
  ('muscle_group', 'Hamstrings',   'hamstrings',   'core'),
  ('muscle_group', 'Hip Flexors',  'hip flexors',  'core'),
  ('muscle_group', 'Hips',         'hips',         'core'),
  ('muscle_group', 'Legs',         'legs',         'core'),
  ('muscle_group', 'Quads',        'quads',        'core'),
  ('muscle_group', 'Rear Delts',   'rear delts',   'core'),
  ('muscle_group', 'Shoulders',    'shoulders',    'core'),
  ('muscle_group', 'Spine',        'spine',        'core'),
  ('muscle_group', 'T-Spine',      't spine',      'core'),
  ('muscle_group', 'Traps',        'traps',        'core')
on conflict (kind, normalized) do nothing;

insert into taxonomy_terms (kind, name, normalized, category, status) values
  ('tag', 'Physical Therapy',     'physical therapy', 'goal', 'core'),
  ('tag', 'Knee',                 'knee',           'area',    'core'),
  ('tag', 'Shoulder',             'shoulder',       'area',    'core'),
  ('tag', 'Ankle',                'ankle',          'area',    'core'),
  ('tag', 'Mobility',             'mobility',       'goal',    'core'),
  ('tag', 'Strength',             'strength',       'goal',    'core'),
  ('tag', 'Stability',            'stability',      'goal',    'core'),
  ('tag', 'Stage 1 · Early',      'stage 1',        'stage',   'core'),
  ('tag', 'Stage 2 · Progressing','stage 2',        'stage',   'core'),
  ('tag', 'Stage 3 · Strengthening','stage 3',      'stage',   'core'),
  ('tag', 'Knee flexion',         'knee flexion',   'pattern', 'core'),
  ('tag', 'Knee extension',       'knee extension', 'pattern', 'core'),
  ('tag', 'Stretch',              'stretch',        'pattern', 'core'),
  ('tag', 'Isometric',            'isometric',      'pattern', 'core'),
  ('tag', 'Balance',              'balance',        'pattern', 'core'),
  ('tag', 'Low impact',           'low impact',     'pattern', 'core'),
  ('tag', 'Seated / lying',       'seated lying',   'pattern', 'core'),
  ('tag', 'Weight bearing',       'weight bearing', 'pattern', 'core')
on conflict (kind, normalized) do nothing;
