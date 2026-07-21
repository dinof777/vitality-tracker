-- =============================================================================
-- 0001 — governed taxonomy for trainer-extensible vocabulary
--
-- (a) Repairs schema drift: exercises.tags shipped to production but was never
--     added to schema.sql.
-- (b) Adds taxonomy_terms + tenant_terms — the governed vocabulary behind the
--     fields a trainer can extend (muscle groups, tags), using the same
--     canon/propose/merge model equipment_catalog already used.
-- (c) Seeds the canon: every muscle group in use across the 188-move library,
--     and the built-in tag registry.
--
-- Idempotent — safe to re-run.
-- =============================================================================

-- (a) drift repair -----------------------------------------------------------
alter table exercises add column if not exists tags text[] not null default '{}';

-- (b) taxonomy ---------------------------------------------------------------
create table if not exists taxonomy_terms (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('muscle_group', 'tag', 'equipment')),
  name        text not null,
  normalized  text not null,
  category    text check (category in ('goal', 'stage', 'pattern')),
  status      text not null default 'pending'
                check (status in ('core', 'approved', 'pending', 'rejected', 'merged')),
  merged_into uuid references taxonomy_terms(id) on delete set null,
  created_by_tenant_id uuid references tenants(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (kind, normalized),
  constraint tag_needs_category check (kind <> 'tag' or category is not null)
);

create table if not exists tenant_terms (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  term_id    uuid not null references taxonomy_terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tenant_id, term_id)
);

create index if not exists idx_taxonomy_kind_status on taxonomy_terms (kind, status);
create index if not exists idx_taxonomy_proposer    on taxonomy_terms (created_by_tenant_id);
create index if not exists idx_tenant_terms_tenant  on tenant_terms (tenant_id);
create index if not exists idx_tenant_terms_term    on tenant_terms (term_id);

-- (c) seed the canon ---------------------------------------------------------
insert into taxonomy_terms (kind, name, normalized, status) values
  ('muscle_group', 'Arms',         'arms',         'core'),
  ('muscle_group', 'Back',         'back',         'core'),
  ('muscle_group', 'Calves',       'calves',       'core'),
  ('muscle_group', 'Chest',        'chest',        'core'),
  ('muscle_group', 'Conditioning', 'conditioning', 'core'),
  ('muscle_group', 'Core',         'core',         'core'),
  ('muscle_group', 'Full Body',    'full body',    'core'),
  ('muscle_group', 'Glutes',       'glutes',       'core'),
  ('muscle_group', 'Grip',         'grip',         'core'),
  ('muscle_group', 'Hamstrings',   'hamstrings',   'core'),
  ('muscle_group', 'Hip Flexors',  'hip flexors',  'core'),
  ('muscle_group', 'Hips',         'hips',         'core'),
  ('muscle_group', 'Legs',         'legs',         'core'),
  ('muscle_group', 'Quads',        'quads',        'core'),
  ('muscle_group', 'Rear Delts',   'rear delts',   'core'),
  ('muscle_group', 'Shoulders',    'shoulders',    'core'),
  ('muscle_group', 'Spine',        'spine',        'core'),
  ('muscle_group', 'T-Spine',      't spine',      'core'),
  ('muscle_group', 'Traps',        'traps',        'core')
on conflict (kind, normalized) do nothing;

insert into taxonomy_terms (kind, name, normalized, category, status) values
  ('tag', 'Knee PT',              'knee pt',        'goal',    'core'),
  ('tag', 'Mobility',             'mobility',       'goal',    'core'),
  ('tag', 'Strength',             'strength',       'goal',    'core'),
  ('tag', 'Stability',            'stability',      'goal',    'core'),
  ('tag', 'Stage 1 · Early',      'stage 1',        'stage',   'core'),
  ('tag', 'Stage 2 · Progressing','stage 2',        'stage',   'core'),
  ('tag', 'Stage 3 · Strengthening','stage 3',      'stage',   'core'),
  ('tag', 'Knee flexion',         'knee flexion',   'pattern', 'core'),
  ('tag', 'Knee extension',       'knee extension', 'pattern', 'core'),
  ('tag', 'Stretch',              'stretch',        'pattern', 'core'),
  ('tag', 'Isometric',            'isometric',      'pattern', 'core'),
  ('tag', 'Balance',              'balance',        'pattern', 'core'),
  ('tag', 'Low impact',           'low impact',     'pattern', 'core'),
  ('tag', 'Seated / lying',       'seated lying',   'pattern', 'core'),
  ('tag', 'Weight bearing',       'weight bearing', 'pattern', 'core')
on conflict (kind, normalized) do nothing;
