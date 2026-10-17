#!/usr/bin/env node
// Export every table in the live Neon database to one timestamped, gzipped
// JSON file held OUTSIDE Neon.
//
//   npm run backup
//
// This is the second of two recovery layers, and the only one that survives
// losing the Neon account itself. The first layer is Neon's own branch
// restore — see docs/BACKUP_AND_RESTORE.md for when to reach for which.
//
// Where it writes: $BACKUP_DIR, defaulting to
//   ~/Library/Mobile Documents/com~apple~CloudDocs/Backups/vitality-tracker
// (iCloud Drive). NEVER a git repo and never a gist: the dump contains
// client body-measurement data — see "PII" in the doc.
//
// Retention: keeps the newest $BACKUP_KEEP files (default 12) and deletes
// older ones it wrote itself. It never touches a file it did not name.
//
// It fails LOUDLY. A table it cannot read, a column type it cannot promise to
// round-trip, a checksum that will not verify — any of those exits non-zero
// with the reason named, rather than writing a dump that looks fine and is not.
//
// DATABASE_URL: environment first, then .env.local (same convention as
// scripts/run-migrations.mjs).

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@neondatabase/serverless';
import {
  DUMP_FORMAT,
  topoSortTables,
  unsafeColumns,
  checksumTables,
  summarizeDump,
  backupFilename,
  filesToPrune,
  quoteIdent,
} from './lib-backup.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_DIR = join(
  homedir(),
  'Library',
  'Mobile Documents',
  'com~apple~CloudDocs',
  'Backups',
  'vitality-tracker'
);

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

const TABLES_SQL = `
  select table_name
    from information_schema.tables
   where table_schema = 'public'
     and table_type = 'BASE TABLE'
   order by table_name
`;

const COLUMNS_SQL = `
  select table_name, column_name, data_type, ordinal_position
    from information_schema.columns
   where table_schema = 'public'
   order by table_name, ordinal_position
`;

// pg_catalog rather than information_schema.constraint_column_usage: it names
// the referenced TABLE directly, with no join that can duplicate rows per
// column of a composite key.
const FKS_SQL = `
  select cl.relname::text as child, pa.relname::text as parent
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_class pa on pa.oid = c.confrelid
    join pg_namespace n on n.oid = cl.relnamespace
   where c.contype = 'f' and n.nspname = 'public'
`;

// Self-referencing FK columns, and whether each is nullable — the two-phase
// write only works if the column can legally hold NULL between the phases.
const SELF_FK_COLUMNS_SQL = `
  select cl.relname::text as table_name,
         att.attname::text as column_name,
         att.attnotnull as not_null
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join unnest(c.conkey) as k(attnum) on true
    join pg_attribute att on att.attrelid = c.conrelid and att.attnum = k.attnum
   where c.contype = 'f' and n.nspname = 'public' and c.conrelid = c.confrelid
`;

const PK_SQL = `
  select cl.relname::text as table_name, att.attname::text as column_name
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join unnest(c.conkey) as k(attnum) on true
    join pg_attribute att on att.attrelid = c.conrelid and att.attnum = k.attnum
   where c.contype = 'p' and n.nspname = 'public'
`;

async function main() {
  const url = loadDatabaseUrl();
  if (!url) {
    throw new Error('DATABASE_URL not found (checked env and .env.local).');
  }

  const outDir = process.env.BACKUP_DIR || DEFAULT_DIR;
  const keep = Number(process.env.BACKUP_KEEP ?? 12);
  if (!Number.isInteger(keep) || keep < 1) {
    throw new Error(`BACKUP_KEEP must be a positive integer, got ${JSON.stringify(process.env.BACKUP_KEEP)}`);
  }

  const client = new Client(url);
  await client.connect();

  let dump;
  try {
    const tables = (await client.query(TABLES_SQL)).rows.map((r) => r.table_name);
    if (!tables.length) {
      throw new Error('no tables found in schema "public" — refusing to write an empty backup.');
    }

    const allColumns = (await client.query(COLUMNS_SQL)).rows.map((r) => ({
      table: r.table_name,
      column: r.column_name,
      dataType: r.data_type,
    }));

    // Gate BEFORE reading a single row: a type we cannot round-trip means the
    // dump would be quietly lossy, and a lossy backup is the failure this
    // whole script exists to prevent.
    const unsafe = unsafeColumns(allColumns.filter((c) => tables.includes(c.table)));
    if (unsafe.length && process.env.BACKUP_ALLOW_UNKNOWN_TYPES !== '1') {
      const list = unsafe.map((c) => `${c.table}.${c.column} (${c.dataType})`).join(', ');
      throw new Error(
        `column type(s) this script cannot promise to restore: ${list}\n` +
          '  Add the type to SAFE_DATA_TYPES in scripts/lib-backup.mjs once you have\n' +
          '  checked it round-trips, or set BACKUP_ALLOW_UNKNOWN_TYPES=1 to accept a\n' +
          '  possibly-lossy dump for this run.'
      );
    }

    const fks = (await client.query(FKS_SQL)).rows.map((r) => ({ child: r.child, parent: r.parent }));
    const { order, selfReferencing, cycles } = topoSortTables(tables, fks);
    if (cycles.length) {
      console.warn(
        `! foreign-key cycle between: ${cycles.join(', ')} — these are appended last in restoreOrder ` +
          'and may need inserting by hand. Recorded in the manifest.'
      );
    }

    const selfFkRows = (await client.query(SELF_FK_COLUMNS_SQL)).rows;
    const notNullSelfFk = selfFkRows.filter((r) => r.not_null);
    if (notNullSelfFk.length) {
      const list = notNullSelfFk.map((r) => `${r.table_name}.${r.column_name}`).join(', ');
      throw new Error(
        `NOT NULL self-referencing column(s): ${list}\n` +
          '  The restore writes self-references in two phases, which needs the column to\n' +
          '  hold NULL in between. Restoring this table needs its rows ordered by hand.'
      );
    }
    const selfRefColumns = {};
    for (const r of selfFkRows) {
      (selfRefColumns[r.table_name] ??= []).push(r.column_name);
    }

    const pks = {};
    for (const r of (await client.query(PK_SQL)).rows) {
      (pks[r.table_name] ??= []).push(r.column_name);
    }

    // Read every table, in restore order, newest-first inside each table is
    // irrelevant — ordered by primary key so two dumps of unchanged data are
    // byte-identical and the checksum is meaningful.
    const columnsByTable = {};
    const data = {};
    for (const table of order) {
      const cols = allColumns.filter((c) => c.table === table).map((c) => c.column);
      columnsByTable[table] = cols;
      const pk = pks[table] ?? [];
      const orderBy = pk.length ? ` order by ${pk.map(quoteIdent).join(', ')}` : '';
      const { rows } = await client.query(
        `select ${cols.map(quoteIdent).join(', ')} from ${quoteIdent(table)}${orderBy}`
      );
      data[table] = rows;
    }

    dump = {
      format: DUMP_FORMAT,
      takenAt: new Date().toISOString(),
      // Which migrations the dump matches. Restore compares this against the
      // target so you cannot load last month's rows into a newer schema and
      // find out later.
      schemaMigrations: (data.schema_migrations ?? []).map((r) => r.filename).sort(),
      restoreOrder: order,
      selfReferencing: selfRefColumns,
      primaryKeys: pks,
      columns: columnsByTable,
      cycles,
      checksum: '',
      tables: data,
    };
    dump.checksum = checksumTables(data);
  } finally {
    await client.end();
  }

  mkdirSync(outDir, { recursive: true });
  const name = backupFilename(new Date(dump.takenAt));
  const path = join(outDir, name);
  const gz = gzipSync(Buffer.from(JSON.stringify(dump)), { level: 9 });
  writeFileSync(path, gz);

  // Read it straight back and re-verify, so "the backup was written" means the
  // file on disk parses and its rows hash to what we saved — not that a write
  // call returned.
  const reread = JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
  if (checksumTables(reread.tables) !== dump.checksum) {
    throw new Error(`verification FAILED: ${path} does not hash to the data that was dumped.`);
  }

  const counts = summarizeDump(dump);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const bytes = statSync(path).size;

  console.log(`✓ backup written and verified: ${path}`);
  console.log(`  ${(bytes / 1024).toFixed(1)} KiB gzipped · ${total} rows across ${Object.keys(counts).length} tables`);
  console.log(`  sha256(data) ${dump.checksum.slice(0, 16)}… · schema at ${dump.schemaMigrations.at(-1) ?? '(none recorded)'}`);
  for (const [t, n] of Object.entries(counts)) console.log(`    ${String(n).padStart(6)}  ${t}`);

  const pruned = filesToPrune(readdirSync(outDir), keep);
  for (const old of pruned) rmSync(join(outDir, old));
  if (pruned.length) console.log(`  pruned ${pruned.length} older backup(s), keeping the newest ${keep}`);
}

main().catch((e) => {
  console.error(`✗ backup FAILED: ${e.message}`);
  process.exit(1);
});
