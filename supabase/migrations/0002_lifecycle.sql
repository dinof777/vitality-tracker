-- =============================================================================
-- 0002 — lifecycle: archive instead of destroy
--
-- Deleting an exercise hard-deleted the row, and routine_exercises + log_entries
-- both cascade off it — so removing a move silently destroyed every logged set
-- ever performed against it. Same shape of problem for a tag on 40 exercises.
--
-- archived_at is the "retired, not gone" state: hidden from pickers, generation
-- and filters, but every routine and logged set still resolves. A genuinely
-- unused record is still hard-deleted; only in-use records archive.
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table exercises      add column if not exists archived_at timestamptz;
alter table taxonomy_terms add column if not exists archived_at timestamptz;

-- Who archived it, so the admin log reads sensibly.
alter table exercises      add column if not exists archived_by text;
alter table taxonomy_terms add column if not exists archived_by text;

-- Every picker/generator query filters archived_at is null — index for it.
create index if not exists idx_exercises_live
  on exercises (tenant_id) where archived_at is null;
create index if not exists idx_taxonomy_live
  on taxonomy_terms (kind, status) where archived_at is null;
