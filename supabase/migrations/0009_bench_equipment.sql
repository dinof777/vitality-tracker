-- =============================================================================
-- 0009 — bench equipment (trainer's spec)
--
-- Widens exercises.equipment's CHECK constraint from 18 to 19 values, adding
-- `bench` — its own equipment value (not folded into `barbell`) so bench-press
-- and bench-supported lifts (DB Bench Press, Barbell Hip Thrust, etc.) can be
-- filtered by bench regardless of whether the load is a barbell or dumbbells.
--
-- Required before the 21 new heavy-lift exercises (lib/exercises.ts) can sync
-- to prod — the sync insert is rejected by exercises_equipment_check until
-- this runs.
--
-- ADD CONSTRAINT has no IF NOT EXISTS, so this uses drop-if-exists + re-add
-- (same shape as 0008), not the pg_constraint existence-guard 0006/0007 used —
-- safe to re-run any number of times; each run ends in the identical 19-value
-- constraint.
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table exercises drop constraint if exists exercises_equipment_check;
alter table exercises add constraint exercises_equipment_check
  check (equipment in (
    'dumbbell', 'kettlebell', 'calisthenics', 'tube_band', 'loop_band', 'pullup_bar', 'medicine_ball', 'jump_rope', 'stretch',
    'stationary_bike', 'treadmill', 'stair_climber', 'rowing_machine', 'elliptical', 'barbell', 'cable_machine', 'leg_press_machine', 'lat_pulldown_machine',
    'bench'
  ));
