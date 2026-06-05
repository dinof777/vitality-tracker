import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Neon serverless Postgres. DATABASE_URL is a SERVER-only secret (never
// NEXT_PUBLIC) — all DB access happens in API routes, never the browser.
// Until DATABASE_URL is set, getSql() returns null and routes respond 503 so
// the app still runs (logger/Daily 5 stay on-device).

const url = process.env.DATABASE_URL;

export const isDbConfigured = Boolean(url);

let sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> | null {
  if (!url) return null;
  // The Neon HTTP driver queries via fetch; Next.js caches fetch by default,
  // which would freeze query results. Force no-store so every query reads live.
  if (!sql) sql = neon(url, { fetchOptions: { cache: 'no-store' } });
  return sql;
}
