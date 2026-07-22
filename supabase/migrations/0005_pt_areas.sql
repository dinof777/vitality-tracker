-- =============================================================================
-- 0005 — nest Physical Therapy by body area
--
-- Rehab was three flat goal tags (knee-pt / shoulder-pt / ankle-pt). This
-- collapses them into ONE goal tag `physical-therapy` crossed with a new tag
-- `category = 'area'` (knee / shoulder / ankle), so a rehab move is
-- goal=physical-therapy + area=<joint> + stage-N. Matches lib/tags.ts.
--
-- The exercises themselves are re-tagged in code (lib/exercises.ts) and pushed
-- by the exercise sync; this migration only updates the governed vocabulary.
-- Idempotent — safe to re-run.
-- =============================================================================

-- Allow the new 'area' category.
alter table taxonomy_terms drop constraint if exists taxonomy_terms_category_check;
alter table taxonomy_terms add constraint taxonomy_terms_category_check
  check (category in ('goal', 'stage', 'pattern', 'area'));

-- Retire the per-joint PT goal tags — collapsed into physical-therapy + area.
-- Safe: they're core tags with no tenant_terms references, and exercises key on
-- the tags text[] (re-synced), not a foreign key.
delete from taxonomy_terms where kind = 'tag' and normalized in ('knee pt', 'shoulder pt', 'ankle pt');

-- Seed the umbrella goal + the three area tags as core.
insert into taxonomy_terms (kind, name, normalized, category, status) values
  ('tag', 'Physical Therapy', 'physical therapy', 'goal', 'core'),
  ('tag', 'Knee',             'knee',             'area', 'core'),
  ('tag', 'Shoulder',         'shoulder',         'area', 'core'),
  ('tag', 'Ankle',            'ankle',            'area', 'core')
on conflict (kind, normalized) do nothing;
