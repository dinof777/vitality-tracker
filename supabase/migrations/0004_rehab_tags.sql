-- =============================================================================
-- 0004 — shoulder & ankle rehab tags
--
-- The personal-trainer + physical-therapist coverage audit added shoulder-pt
-- and ankle-pt rehab arcs to the library (lib/exercises.ts) and two new clinical
-- goal tags to lib/tags.ts. Seed those tags into the governed vocabulary as
-- `core` so they show in /admin/taxonomy and validate on write, mirroring how
-- 0001 seeded knee-pt and the rest.
--
-- Idempotent — safe to re-run.
-- =============================================================================

insert into taxonomy_terms (kind, name, normalized, category, status) values
  ('tag', 'Shoulder PT', 'shoulder pt', 'goal', 'core'),
  ('tag', 'Ankle PT',    'ankle pt',    'goal', 'core')
on conflict (kind, normalized) do nothing;
