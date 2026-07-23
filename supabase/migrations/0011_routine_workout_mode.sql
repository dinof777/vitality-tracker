-- =============================================================================
-- 0011 — routine workout mode
--
-- SyncroFit v2 alignment: a routine can be run as Intervals (default, timed
-- work/rest), For Time, AMRAP, or EMOM. These are handoff-first — Vitality
-- doesn't build a native AMRAP/EMOM/for-time clock this pass; we pick the
-- style + minutes and SyncroFit runs it. amrap_minutes/emom_minutes only
-- apply when mode is amrap/emom respectively, default 12 either way.
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table routines add column if not exists mode text not null default 'intervals'
  check (mode in ('intervals', 'forTime', 'amrap', 'emom'));
alter table routines add column if not exists amrap_minutes int not null default 12
  check (amrap_minutes between 1 and 60);
alter table routines add column if not exists emom_minutes int not null default 12
  check (emom_minutes between 1 and 60);
