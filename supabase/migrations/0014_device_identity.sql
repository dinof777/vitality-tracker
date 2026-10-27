-- =============================================================================
-- 0014 — device_id: per-visitor identity for the four consumer tables.
--
-- WHY. The public app at liveelevated.fit has no account and no login, and
-- until this migration `routines`, `workouts`, `log_entries` and
-- `mobility_logs` had NO owner column at all. Every visitor wrote into one
-- shared pile: GET /api/workouts returned strangers' sessions, the overload
-- sparkline blended everyone's weights, two people on the same calendar day
-- overwrote each other's Daily 5 (mobility_logs had a UNIQUE on logged_date
-- alone, so there could only ever be ONE row per day for the whole internet),
-- and an unauthenticated DELETE /api/routines wiped the weekly plan for all
-- users. Full write-up in SECURITY.md.
--
-- Dino chose option A on MC card 99e9dadb (2026-10-08): anonymous per-device
-- identity, keeping the no-account promise. `device_id` is the uuid in the
-- httpOnly `vt_device` cookie (lib/device.ts), minted server-side on a
-- visitor's first write. It is an identity, not a credential: it scopes one
-- browser's data away from another's, and it is NOT an authorization boundary
-- against someone who steals the cookie value. Documented as such.
--
-- NULLABLE, DELIBERATELY. Rows already in these tables are the pre-identity
-- shared pile — a blend of Dino's own training and strangers'. There is no
-- column, timestamp or join that can separate them, so they are left with
-- device_id = NULL and every scoped query (`device_id = $1`) therefore matches
-- none of them: NULL = nobody's, invisible to everyone. Rejected: backfilling
-- them all to one id, which would hand strangers' logged sets to whichever
-- browser got that id. Nothing is deleted — the rows stay, so a later card
-- could still adopt a date range into a device if Dino wants his own history
-- back.
--
-- routine_exercises gets no device_id: it is scoped through its parent routine
-- (PUT /api/routines/[routineId]/exercises checks the routine's device_id
-- before touching it).
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table routines      add column if not exists device_id text;
alter table workouts      add column if not exists device_id text;
alter table log_entries   add column if not exists device_id text;
alter table mobility_logs add column if not exists device_id text;

-- Every scoped read filters on device_id first, so it leads each index.
create index if not exists idx_routines_device      on routines      (device_id, sort_order);
create index if not exists idx_workouts_device      on workouts      (device_id, started_at desc);
create index if not exists idx_log_entries_device   on log_entries   (device_id, exercise_id, created_at desc);
create index if not exists idx_mobility_logs_device on mobility_logs (device_id, logged_date);

-- The Daily 5 upsert's conflict target moves from (logged_date) to
-- (device_id, logged_date). The old table-wide UNIQUE on logged_date is the
-- bug that let two visitors overwrite each other, so it must go, not just be
-- supplemented. Named constraint if 0001 created it inline, plus the implicit
-- index name Postgres would have chosen, so this works either way.
alter table mobility_logs drop constraint if exists mobility_logs_logged_date_key;
drop index if exists mobility_logs_logged_date_key;

-- One row per device per day. A partial unique index (device_id not null) so
-- the orphaned pre-identity rows above, which all have device_id = NULL, are
-- not dragged into it.
create unique index if not exists uq_mobility_logs_device_date
  on mobility_logs (device_id, logged_date)
  where device_id is not null;
