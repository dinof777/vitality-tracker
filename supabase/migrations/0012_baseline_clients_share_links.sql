-- =============================================================================
-- 0012 — baseline: reconcile clients, tenant_workouts, share_links into
-- version control
--
-- Schema drift repair — the same failure mode 0001 repaired for
-- exercises.tags (see supabase/migrations/README.md). `clients` and
-- `share_links` exist in production and are queried throughout
-- app/api/tenant/clients/*, app/api/share/route.ts and lib/share.ts, but were
-- never captured in schema.sql or any prior migration file. Cross-checking
-- every table referenced by that code turned up a third: `tenant_workouts`
-- (lib/tenant-workouts.ts, referenced from app/api/share/route.ts and
-- share_links.workout_id) — same drift, same repair, folded in here rather
-- than left half-fixed.
--
-- DDL below was read directly off production (`\d <table>` /
-- information_schema + pg_catalog) on 2026-07-24 and reproduces the live
-- shape exactly — this is NOT new schema, it's committing what already
-- exists. Production's columns matched every assumption the query sites
-- make; no gaps found.
--
-- Dependency order: clients and tenant_workouts don't depend on each other,
-- only on tenants (already in schema.sql); share_links depends on both
-- (client_id -> clients, workout_id -> tenant_workouts), so it's declared
-- last.
--
-- Idempotent — safe to re-run. On production, every `create table if not
-- exists` / `create index if not exists` below is a no-op (the objects
-- already exist); on a fresh database it reproduces production's shape.
-- =============================================================================

-- clients: a trainer's/gym's roster of trainees. owner_user_id scopes rows to
-- the trainer who created them; the gym owner (isOwner) sees every trainer's.
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  contact       text,
  owner_user_id text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_clients_tenant on clients (tenant_id, created_at desc);
create index if not exists idx_clients_owner  on clients (tenant_id, owner_user_id);

-- tenant_workouts: a gym's saved/reusable workout circuits (the durable
-- library a trainer builds up), each shareable via share_links.workout_id.
create table if not exists tenant_workouts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  owner_user_id text,
  name          text not null,
  payload       jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_tenant_workouts_tenant on tenant_workouts (tenant_id, created_at desc);
create index if not exists idx_tenant_workouts_owner  on tenant_workouts (tenant_id, owner_user_id);

-- share_links: a tokenized, public share of a workout (see lib/share.ts).
-- client_id / workout_id are both nullable (a share can be created ad hoc,
-- without an assigned client or a saved circuit) and SET NULL on delete so
-- removing a client/circuit doesn't destroy the share's own history.
create table if not exists share_links (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name          text not null,
  payload       jsonb not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,
  opens         integer not null default 0,
  client_id     uuid references clients(id) on delete set null,
  owner_user_id text,
  workout_id    uuid references tenant_workouts(id) on delete set null
);
create index if not exists idx_share_links_tenant  on share_links (tenant_id, created_at desc);
create index if not exists idx_share_links_owner   on share_links (tenant_id, owner_user_id);
create index if not exists idx_share_links_client  on share_links (client_id);
create index if not exists idx_share_links_workout on share_links (workout_id);
