import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Neon serverless Postgres. DATABASE_URL is a SERVER-only secret (never
// NEXT_PUBLIC) — all DB access happens in API routes, never the browser.
// Until DATABASE_URL is set, getSql() returns null and routes respond 503 so
// the app still runs (logger/Daily 5 stay on-device).

const url = process.env.DATABASE_URL;

export const isDbConfigured = Boolean(url);

let sql: NeonQueryFunction<false, false> | null = null;
let sqlCacheable: NeonQueryFunction<false, false> | null = null;

// The client for every LIVE read — this is what every route/lib module
// should reach for by default.
export function getSql(): NeonQueryFunction<false, false> | null {
  if (!url) return null;
  // The Neon HTTP driver queries via fetch; Next.js caches fetch by default,
  // which would freeze query results. Force no-store so every query reads live.
  if (!sql) sql = neon(url, { fetchOptions: { cache: 'no-store' } });
  return sql;
}

// A SEPARATE client, deliberately `force-cache` instead of `no-store`, for
// the small set of reads that are wrapped in `unstable_cache()` and live on
// an ISR route (lib/tenant.ts#fetchTenantBySlug, lib/tenant-library.ts,
// lib/tenant-equipment.ts — see .design/g-slug-caching/DECISION.md). A
// `no-store` fetch cannot appear ANYWHERE in a route Next is attempting to
// statically generate: it unconditionally throws DYNAMIC_SERVER_USAGE, even
// nested inside `unstable_cache()`, which does NOT shield the inner fetch's
// cache mode from that detection — confirmed against production and a local
// `next build` (2026-07-25/26 incident, app/g/[slug] 500s). Freshness for
// reads on this client is governed entirely by the wrapping
// `unstable_cache()`'s own `revalidate`/`tags` plus the `revalidateTag` calls
// after a write (e.g. app/api/tenants/[slug]/route.ts's PATCH) — NOT by this
// fetch's own cache mode, so there's no staleness regression from the switch.
//
// Do not reach for this for a read that needs to be live on every request —
// that's what getSql() is for, and it is unchanged.
export function getSqlCacheable(): NeonQueryFunction<false, false> | null {
  if (!url) return null;
  if (!sqlCacheable) sqlCacheable = neon(url, { fetchOptions: { cache: 'force-cache' } });
  return sqlCacheable;
}
