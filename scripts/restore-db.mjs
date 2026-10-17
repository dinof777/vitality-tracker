#!/usr/bin/env node
// Load a backup written by scripts/backup-db.mjs into a Postgres database.
//
//   npm run restore -- --file <path-to-backup.json.gz> [--dry-run] [--only table,table]
//
// SAFETY, deliberately blunt: this refuses to run unless RESTORE_DATABASE_URL
// is set, and it will not read DATABASE_URL. Pointing a restore at the live
// database by forgetting a flag is exactly the accident that loses data, so
// the live connection string simply is not a value this script can see.
//
// It writes inside ONE transaction. Any failure rolls the whole thing back —
// a half-restored database is worse than a failed restore, because it looks
// populated.
//
// It inserts ON CONFLICT DO NOTHING, so it tops up a partially-populated
// target rather than aborting, and never overwrites a row that already
// exists. To replace rather than top up, restore into a FRESH database
// (the documented procedure) — not into a live one.
//
// Run the schema first: psql < supabase/schema.sql, or npm run migrate.
// See docs/BACKUP_AND_RESTORE.md.

import { readFileSync } from 'node:fs';
import { Client } from '@neondatabase/serverless';
import { parseDump, planRestore, summarizeDump } from './lib-backup.mjs';

function parseArgs(argv) {
  const args = { file: undefined, dryRun: false, only: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--only') args.only = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!args.file) throw new Error('--file <path-to-backup.json.gz> is required.');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dump = parseDump(readFileSync(args.file));

  const counts = summarizeDump(dump);
  console.log(`· dump taken ${dump.takenAt}`);
  console.log(`· schema at migration ${dump.schemaMigrations.at(-1) ?? '(none recorded)'}`);
  console.log(`· ${Object.values(counts).reduce((a, b) => a + b, 0)} rows across ${Object.keys(counts).length} tables`);
  console.log('· checksum verified');

  if (dump.cycles.length) {
    console.warn(`! dump recorded a foreign-key cycle: ${dump.cycles.join(', ')} — watch for an FK error on those.`);
  }

  // Everything is planned BEFORE a connection is opened, so a planning bug
  // cannot leave a transaction open against a real database.
  const { statements: plan, tables, selfRefWrites } = planRestore(dump, { only: args.only });
  if (args.only) {
    console.log(`· --only: restoring ${tables.join(', ')} (parents of these must already be present)`);
  }
  console.log(`· restore order: ${tables.join(' → ')}`);
  for (const [t, n] of Object.entries(selfRefWrites)) {
    console.log(`· ${t}: ${n} self-reference(s) written in a second pass`);
  }

  if (args.dryRun) {
    console.log(`\n✓ dry run: ${plan.length} statement(s) planned, nothing executed.`);
    for (const s of plan.slice(0, 6)) console.log(`    ${s.text.slice(0, 110)}`);
    if (plan.length > 6) console.log(`    … and ${plan.length - 6} more`);
    return;
  }

  const url = process.env.RESTORE_DATABASE_URL;
  if (!url) {
    throw new Error(
      'RESTORE_DATABASE_URL is not set.\n' +
        '  This script deliberately ignores DATABASE_URL so a restore cannot hit the live\n' +
        '  database by accident. Set RESTORE_DATABASE_URL to the TARGET database and re-run,\n' +
        '  or pass --dry-run to see the plan without connecting.'
    );
  }

  const client = new Client(url);
  await client.connect();
  try {
    // Compare the dump's schema version against the target's, if the target
    // records one. A mismatch is a warning, not a refusal: restoring an older
    // dump into a newer schema is a legitimate thing to do deliberately.
    try {
      const { rows } = await client.query('select filename from schema_migrations order by filename');
      const target = rows.map((r) => r.filename);
      const missing = dump.schemaMigrations.filter((m) => !target.includes(m));
      const extra = target.filter((m) => !dump.schemaMigrations.includes(m));
      if (missing.length) console.warn(`! target is MISSING migration(s) the dump was taken at: ${missing.join(', ')}`);
      if (extra.length) console.warn(`! target has newer migration(s) than the dump: ${extra.join(', ')}`);
      if (!missing.length && !extra.length) console.log('· target schema matches the dump');
    } catch {
      console.warn('! target has no schema_migrations table — run the schema first (npm run migrate).');
    }

    await client.query('begin');
    let written = 0;
    for (const s of plan) {
      const res = await client.query(s.text, s.values);
      written += res.rowCount ?? 0;
    }
    await client.query('commit');
    console.log(`\n✓ restore committed: ${written} row(s) written by ${plan.length} statement(s).`);
    console.log('  Rows that already existed were left alone (on conflict do nothing).');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(`✗ restore FAILED (nothing was committed): ${e.message}`);
  process.exit(1);
});
