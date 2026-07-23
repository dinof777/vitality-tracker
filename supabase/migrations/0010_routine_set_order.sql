-- =============================================================================
-- 0010 — routine set order
--
-- SyncroFit v2 alignment: adds the routine-level circuit/straight-sets toggle
-- a trainer can pick when building a routine. Default 'straightSets' — Vitality
-- routines are set-by-set structured (finish exercise 1's sets, then exercise
-- 2's), not classic circuit interleaving, so the default matches existing
-- behavior for every routine that predates this column.
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table routines add column if not exists set_order text not null default 'straightSets'
  check (set_order in ('circuit', 'straightSets'));
