#!/usr/bin/env node
// Apply any supabase/migrations/*.sql files not yet recorded in the
// schema_migrations table, in filename order, and record each one it applies.
//
//   npm run migrate
//
// Safe to re-run: a migration already listed in schema_migrations is skipped.
// Migration files are idempotent by convention (see
// supabase/migrations/README.md), so re-applying one that already ran is also
// harmless — this script just avoids doing it needlessly.
//
// DATABASE_URL: read from the environment first, falling back to .env.local
// (same convention as scripts/sync-exercises-to-db.ts).

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@neondatabase/serverless';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  let env;
  try {
    env = readFileSync(join(repoRoot, '.env.local'), 'utf8');
  } catch {
    return undefined;
  }
  return env
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim()
    .replace(/^["']|["']$/g, '');
}

const url = loadDatabaseUrl();
if (!url) {
  console.error('✗ DATABASE_URL not found (checked env and .env.local).');
  process.exit(1);
}

async function main() {
  const client = new Client(url);
  await client.connect();

  try {
    // Bootstrap: guarantees this works even against a DB where 0003 (which
    // also creates this table) hasn't been applied yet.
    await client.query(`
      create table if not exists schema_migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query('select filename from schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    let ranCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`· ${file} — already applied, skipping`);
        continue;
      }
      console.log(`↻ ${file} — applying…`);
      const sqlText = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query(sqlText); // multi-statement script, no params
      await client.query('insert into schema_migrations (filename) values ($1) on conflict (filename) do nothing', [file]);
      console.log(`✓ ${file} — applied and recorded`);
      ranCount++;
    }

    console.log(
      ranCount === 0
        ? '\n✓ Nothing to do — every migration is already recorded.'
        : `\n✓ Applied ${ranCount} migration(s).`
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('✗ migration run failed:', e);
  process.exit(1);
});
