-- =============================================================================
-- 0007 — the muscle drill-down tree (goals-first focus picker)
--
-- Rose/Elena's goals-first rework replaces the flat focus picker with a
-- parent→child drill-down (lib/profile.ts#muscleDrillDownNodes,
-- components/workout/MuscleDrillDown.tsx). This migration is the DB side:
--
--   (a) three new canon muscle groups the exercise re-tag (lib/exercises.ts)
--       now uses — Biceps, Triceps, Obliques — seeded the same way 0001 seeded
--       the rest of CANON_MUSCLE_GROUPS.
--   (b) parent_id links for the full tree, using the SAME parent/child
--       mechanism 0006 added (taxonomy_terms.parent_id, muscle_group kind
--       only, strictly 2 levels):
--
--         Core      → Obliques
--         Back      → Spine, T-Spine
--         Shoulders → Rear Delts, Traps
--         Arms      → Biceps, Triceps, Grip
--         Legs      → Quads, Hamstrings, Glutes, Calves, Hip Flexors, Hips
--
--       Chest, Full Body and Conditioning stay leaves (no children) — Full
--       Body and Conditioning are non-anatomical and were never part of a
--       region; Chest has no sub-groups in the library.
--
-- Every child term above is being ASSIGNED to a parent for the first time
-- (0006 shipped with no seed data), so this only ever moves a child OUT of
-- top-level, never re-parents one that's already grouped elsewhere — no
-- destructive re-link case to guard against.
--
-- Idempotent — safe to re-run. Not run against prod by this migration; the
-- reviewer runs it.
-- =============================================================================

-- (a) seed the three new canon muscle groups, same pattern as 0001 ----------
insert into taxonomy_terms (kind, name, normalized, status) values
  ('muscle_group', 'Biceps',   'biceps',   'core'),
  ('muscle_group', 'Triceps',  'triceps',  'core'),
  ('muscle_group', 'Obliques', 'obliques', 'core')
on conflict (kind, normalized) do nothing;

-- (b) parent/child links -----------------------------------------------------
-- Guarded by `parent_id is null` so re-running never clobbers a parent an
-- admin has since changed by hand via /admin/taxonomy.
with tree (child_normalized, parent_normalized) as (
  values
    ('obliques',    'core'),
    ('spine',       'back'),
    ('t spine',     'back'),
    ('rear delts',  'shoulders'),
    ('traps',       'shoulders'),
    ('biceps',      'arms'),
    ('triceps',     'arms'),
    ('grip',        'arms'),
    ('quads',       'legs'),
    ('hamstrings',  'legs'),
    ('glutes',      'legs'),
    ('calves',      'legs'),
    ('hip flexors', 'legs'),
    ('hips',        'legs')
)
update taxonomy_terms child
set parent_id = parent.id
from tree, taxonomy_terms parent
where child.kind = 'muscle_group'
  and child.normalized = tree.child_normalized
  and child.parent_id is null
  and parent.kind = 'muscle_group'
  and parent.normalized = tree.parent_normalized;
