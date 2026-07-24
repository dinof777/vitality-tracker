-- =============================================================================
-- 0013 — client_profiles + client_metrics: trainer-managed trainee enrichment
-- and biometric time series (Elena's scoping doc §2b:
-- 04_Agents_Workspace/Software_Dev/vitality-tracker-trainee-portal/
-- SCOPE_and_datasource.md).
--
-- Purely additive — no existing table touched. Both reference `clients`
-- (reconciled in 0012) and `tenants`.
--
-- client_profiles is 1:1 with clients (client_id is its own primary key, not
-- a separate uuid) — enrichment data (what the trainer knows about training
-- this person) is a distinct concern from the roster row (who they are), kept
-- out of `clients` so the existing roster query stays untouched.
--
-- portal_consent_at: settled product decision — the trainee-portal consent
-- tick must be persisted, not just a UI checkbox, so it's auditable. Stamped
-- server-side by POST /api/tenant/clients/[clientId]/portal-link, which
-- refuses to issue a token without consent:true in the request body.
--
-- client_metrics is a time series, not a snapshot — "starting" value is the
-- earliest row for a given client_id + metric_type, not a duplicated column
-- that could drift from the actual first entry (see lib/client-metrics.ts).
-- recorded_by defaults 'trainer' and MVP is trainer-entry-only (Elena §5);
-- the API forces it server-side regardless of what a request body sends.
--
-- Idempotent — safe to re-run.
-- =============================================================================

create table if not exists client_profiles (
  client_id        uuid primary key references clients(id) on delete cascade,
  tenant_id        uuid not null references tenants(id) on delete cascade,
  goals            text[] not null default '{}',
  equipment        text[] not null default '{}',
  notes            text,                              -- trainer-private; never in a trainee-facing read shape
  height_cm        numeric,
  goal_weight_kg   numeric,
  portal_token     text unique,                        -- null = no portal link issued yet
  portal_token_created_at timestamptz,
  portal_consent_at timestamptz,                        -- stamped only alongside a consented token issue
  syncrofit_user_scoped_id text,                        -- captured opportunistically; fallback-join logic is a later fast-follow
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_client_profiles_portal_token on client_profiles (portal_token);

create table if not exists client_metrics (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  metric_type  text not null check (metric_type in ('weight_kg', 'hrv_ms')),
  value        numeric not null,
  recorded_at  timestamptz not null default now(),
  recorded_by  text not null default 'trainer' check (recorded_by in ('trainer', 'trainee')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_client_metrics_client_type on client_metrics (client_id, metric_type, recorded_at desc);
