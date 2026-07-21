-- =============================================================================
-- 0003 — schema_migrations: track which migrations have been applied
--
-- Until now, "was this migration applied?" was answered by memory or by
-- re-reading the SQL — 0001 and 0002 were both pasted into the Neon SQL
-- editor by hand, with no record of it anywhere. This table is that record.
--
-- Back-fills rows for 0001 and 0002 (already applied to prod by hand, before
-- this table existed) so it reflects reality the moment it's created. See
-- supabase/migrations/README.md for the process this enables going forward.
--
-- Idempotent — safe to re-run.
-- =============================================================================

create table if not exists schema_migrations (
  filename   text primary key,       -- e.g. '0001_taxonomy.sql'
  applied_at timestamptz not null default now()
);

insert into schema_migrations (filename) values
  ('0001_taxonomy.sql'),
  ('0002_lifecycle.sql')
on conflict (filename) do nothing;
