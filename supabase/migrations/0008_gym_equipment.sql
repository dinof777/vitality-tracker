-- =============================================================================
-- 0008 — gym equipment (trainer's spec)
--
-- Widens exercises.equipment's CHECK constraint from the original 9 home-gym
-- values to 18, adding the machine/free-weight tier a commercial gym actually
-- has: stationary_bike, treadmill, stair_climber, rowing_machine, elliptical,
-- barbell, cable_machine, leg_press_machine, lat_pulldown_machine.
--
-- Required before the 43 new exercises (lib/exercises.ts) can sync to prod —
-- the sync insert was rejected by exercises_equipment_check until this runs.
--
-- ADD CONSTRAINT has no IF NOT EXISTS, so this uses drop-if-exists + re-add
-- (same shape as the existing constraint definition, just widened) rather than
-- the pg_constraint existence-guard 0006/0007 used — safe to re-run any number
-- of times; each run ends in the identical 18-value constraint.
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table exercises drop constraint if exists exercises_equipment_check;
alter table exercises add constraint exercises_equipment_check
  check (equipment in (
    'dumbbell', 'kettlebell', 'calisthenics', 'tube_band', 'loop_band', 'pullup_bar', 'medicine_ball', 'jump_rope', 'stretch',
    'stationary_bike', 'treadmill', 'stair_climber', 'rowing_machine', 'elliptical', 'barbell', 'cable_machine', 'leg_press_machine', 'lat_pulldown_machine'
  ));
