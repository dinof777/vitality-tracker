-- =============================================================================
-- 0006 — parent/child grouping for muscle groups (regions)
--
-- Admin-managed regions ("Upper Body" → Chest / Back / Shoulders / …) so the
-- builder can offer a region tile that expands to its child muscle groups,
-- instead of every muscle group being a flat, equally-weighted tile.
--
-- Scoped deliberately narrow:
--   - parent_id lives on taxonomy_terms for EVERY kind, but is only ever set on
--     kind='muscle_group' rows — app code enforces that (see set-parent in
--     app/api/admin/taxonomy/route.ts), not a DB check, so this migration adds
--     no new kind. A region is just an ordinary muscle_group term that happens
--     to have children.
--   - Strictly 2 levels (no grandparents) — also enforced in app code, the same
--     way the existing merge same-kind check is: simpler to read, and the tree
--     is small enough that a DB trigger would be pure ceremony.
--   - No seed data. Ships empty; the admin builds the tree by hand.
--
-- Idempotent — safe to re-run.
-- =============================================================================

alter table taxonomy_terms
  add column if not exists parent_id uuid references taxonomy_terms(id) on delete set null;

-- Self-reference guard: a term can never be its own parent. ADD CONSTRAINT has
-- no IF NOT EXISTS, so guard it by name via pg_constraint — same reason 0005
-- had to drop-then-add its category check rather than assume a fresh table.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'taxonomy_terms_parent_not_self'
  ) then
    alter table taxonomy_terms
      add constraint taxonomy_terms_parent_not_self check (parent_id is distinct from id);
  end if;
end $$;

create index if not exists idx_taxonomy_parent on taxonomy_terms (parent_id);
