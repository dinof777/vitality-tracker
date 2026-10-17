import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  DUMP_FORMAT,
  backupFilename,
  buildInsertStatements,
  buildSelfRefUpdates,
  checksumTables,
  filesToPrune,
  normalizeValue,
  parseDump,
  planRestore,
  quoteIdent,
  summarizeDump,
  topoSortTables,
  unsafeColumns,
} from './lib-backup.mjs';

// The real foreign-key graph of this schema, as read out of
// supabase/schema.sql — the ordering has to hold for THIS database, not just
// for a toy example.
const REAL_TABLES = [
  'client_metrics',
  'client_profiles',
  'clients',
  'equipment_catalog',
  'exercise_aliases',
  'exercises',
  'log_entries',
  'mobility_logs',
  'routine_exercises',
  'routines',
  'schema_migrations',
  'share_links',
  'syncrofit_events',
  'taxonomy_terms',
  'tenant_equipment',
  'tenant_terms',
  'tenant_workouts',
  'tenants',
  'workouts',
];

const REAL_FKS = [
  { child: 'clients', parent: 'tenants' },
  { child: 'tenant_workouts', parent: 'tenants' },
  { child: 'share_links', parent: 'tenants' },
  { child: 'share_links', parent: 'clients' },
  { child: 'share_links', parent: 'tenant_workouts' },
  { child: 'client_profiles', parent: 'clients' },
  { child: 'client_profiles', parent: 'tenants' },
  { child: 'client_metrics', parent: 'clients' },
  { child: 'client_metrics', parent: 'tenants' },
  { child: 'equipment_catalog', parent: 'equipment_catalog' },
  { child: 'equipment_catalog', parent: 'tenants' },
  { child: 'exercises', parent: 'tenants' },
  { child: 'exercises', parent: 'equipment_catalog' },
  { child: 'taxonomy_terms', parent: 'taxonomy_terms' }, // merged_into
  { child: 'taxonomy_terms', parent: 'taxonomy_terms' }, // parent_id
  { child: 'taxonomy_terms', parent: 'tenants' },
  { child: 'tenant_terms', parent: 'tenants' },
  { child: 'tenant_terms', parent: 'taxonomy_terms' },
  { child: 'tenant_equipment', parent: 'tenants' },
  { child: 'tenant_equipment', parent: 'equipment_catalog' },
  { child: 'exercise_aliases', parent: 'tenants' },
  { child: 'exercise_aliases', parent: 'exercises' },
  { child: 'routine_exercises', parent: 'routines' },
  { child: 'routine_exercises', parent: 'exercises' },
  { child: 'workouts', parent: 'routines' },
  { child: 'log_entries', parent: 'workouts' },
  { child: 'log_entries', parent: 'exercises' },
];

describe('topoSortTables', () => {
  it('puts every parent before its child for the real schema', () => {
    const { order } = topoSortTables(REAL_TABLES, REAL_FKS);
    expect(order).toHaveLength(REAL_TABLES.length);
    expect([...order].sort()).toEqual([...REAL_TABLES].sort());
    for (const { child, parent } of REAL_FKS) {
      if (child === parent) continue;
      expect(order.indexOf(parent), `${parent} must precede ${child}`).toBeLessThan(order.indexOf(child));
    }
  });

  it('reports self-references instead of treating them as edges', () => {
    const { selfReferencing, cycles } = topoSortTables(REAL_TABLES, REAL_FKS);
    // taxonomy_terms (merged_into, parent_id) and equipment_catalog
    // (parent/canonical) point at themselves; neither is a cycle.
    expect(selfReferencing.sort()).toEqual(['equipment_catalog', 'taxonomy_terms']);
    expect(cycles).toEqual([]);
  });

  it('is deterministic run to run', () => {
    const a = topoSortTables(REAL_TABLES, REAL_FKS).order;
    const b = topoSortTables([...REAL_TABLES].reverse(), [...REAL_FKS].reverse()).order;
    expect(a).toEqual(b);
  });

  it('counts a duplicated foreign key once, so the table is still emitted', () => {
    const { order, cycles } = topoSortTables(['a', 'b'], [
      { child: 'b', parent: 'a' },
      { child: 'b', parent: 'a' },
    ]);
    expect(cycles).toEqual([]);
    expect(order).toEqual(['a', 'b']);
  });

  it('names a true cycle and still emits every table', () => {
    const { order, cycles } = topoSortTables(['x', 'y', 'z'], [
      { child: 'x', parent: 'y' },
      { child: 'y', parent: 'x' },
    ]);
    expect(cycles).toEqual(['x', 'y']);
    expect([...order].sort()).toEqual(['x', 'y', 'z']);
  });

  it('ignores an edge naming a table outside the dump', () => {
    const { order, cycles } = topoSortTables(['a'], [{ child: 'a', parent: 'gone' }]);
    expect(order).toEqual(['a']);
    expect(cycles).toEqual([]);
  });
});

describe('buildInsertStatements', () => {
  it('writes one parameterised multi-row insert', () => {
    const [stmt, ...rest] = buildInsertStatements('workouts', ['id', 'name'], [
      { id: 'w1', name: 'Upper' },
      { id: 'w2', name: 'Lower' },
    ]);
    expect(rest).toEqual([]);
    expect(stmt.text).toBe(
      'insert into "workouts" ("id", "name") values ($1, $2), ($3, $4) on conflict do nothing'
    );
    expect(stmt.values).toEqual(['w1', 'Upper', 'w2', 'Lower']);
  });

  it('nulls the self-referencing column on the first pass', () => {
    const [stmt] = buildInsertStatements(
      'taxonomy_terms',
      ['id', 'name', 'parent_id'],
      [{ id: 't2', name: 'Chest', parent_id: 't1' }],
      { nullColumns: ['parent_id'] }
    );
    expect(stmt.values).toEqual(['t2', 'Chest', null]);
    // …and left alone when it is not declared self-referencing.
    const [plain] = buildInsertStatements('taxonomy_terms', ['id', 'parent_id'], [
      { id: 't2', parent_id: 't1' },
    ]);
    expect(plain.values).toEqual(['t2', 't1']);
  });

  it('batches so a wide table cannot exceed the parameter ceiling', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ a: i, b: i, c: i }));
    const stmts = buildInsertStatements('t', ['a', 'b', 'c'], rows, { maxParams: 9 });
    expect(stmts).toHaveLength(4); // 3 rows per batch => 3,3,3,1
    expect(stmts.every((s) => s.values.length <= 9)).toBe(true);
    expect(stmts.flatMap((s) => s.values)).toHaveLength(30);
  });

  it('emits nothing for an empty table', () => {
    expect(buildInsertStatements('t', ['a'], [])).toEqual([]);
  });

  it('turns a Date into an ISO string Postgres accepts', () => {
    const [stmt] = buildInsertStatements('t', ['at'], [{ at: new Date('2026-10-08T09:30:00.000Z') }]);
    expect(stmt.values).toEqual(['2026-10-08T09:30:00.000Z']);
  });

  it('passes an array through as an array, not a string', () => {
    const [stmt] = buildInsertStatements('exercises', ['tags'], [{ tags: ['push', 'chest'] }]);
    expect(stmt.values).toEqual([['push', 'chest']]);
  });
});

describe('buildSelfRefUpdates', () => {
  it('writes only the rows that actually have a self-reference', () => {
    const rows = [
      { id: 't1', parent_id: null, merged_into: null },
      { id: 't2', parent_id: 't1', merged_into: null },
      { id: 't3', parent_id: 't1', merged_into: 't2' },
    ];
    const stmts = buildSelfRefUpdates('taxonomy_terms', 'id', ['parent_id', 'merged_into'], rows);
    expect(stmts).toHaveLength(2);
    expect(stmts[0].text).toBe('update "taxonomy_terms" set "parent_id" = $1 where "id" = $2');
    expect(stmts[0].values).toEqual(['t1', 't2']);
    expect(stmts[1].text).toBe(
      'update "taxonomy_terms" set "parent_id" = $1, "merged_into" = $2 where "id" = $3'
    );
    expect(stmts[1].values).toEqual(['t1', 't2', 't3']);
  });

  it('is a no-op when no row references another', () => {
    expect(buildSelfRefUpdates('t', 'id', ['parent_id'], [{ id: 'a', parent_id: null }])).toEqual([]);
  });
});

describe('round trip', () => {
  it('insert-then-update reproduces every self-reference from the dump', () => {
    // Stands in for the database: apply the planned statements to a plain
    // object store and check the end state matches what was dumped.
    const rows = [
      { id: 't1', name: 'Upper Body', parent_id: null },
      { id: 't2', name: 'Chest', parent_id: 't1' },
      { id: 't3', name: 'Back', parent_id: 't1' },
    ];
    const columns = ['id', 'name', 'parent_id'];
    const store = new Map();

    for (const s of buildInsertStatements('taxonomy_terms', columns, rows, { nullColumns: ['parent_id'] })) {
      for (let i = 0; i < s.values.length; i += columns.length) {
        const tuple = s.values.slice(i, i + columns.length);
        const row = Object.fromEntries(columns.map((c, j) => [c, tuple[j]]));
        // The FK is satisfiable at insert time precisely because it is null.
        expect(row.parent_id).toBeNull();
        store.set(row.id, row);
      }
    }
    for (const s of buildSelfRefUpdates('taxonomy_terms', 'id', ['parent_id'], rows)) {
      const [parentId, id] = s.values;
      expect(store.has(parentId), 'the parent row exists by the time it is referenced').toBe(true);
      store.get(id).parent_id = parentId;
    }

    expect([...store.values()]).toEqual(rows);
  });
});

// A dump shaped exactly as scripts/backup-db.mjs writes one, over a realistic
// slice of this schema: a parent/child taxonomy term (self-reference), an
// exercise with a text[] column, and a workout with its log entries.
function makeDump(overrides = {}) {
  const tables = {
    schema_migrations: [{ filename: '0013_client_profiles_metrics.sql', applied_at: '2026-08-01T00:00:00.000Z' }],
    tenants: [{ id: 'g1', slug: 'ironforge', name: 'Iron Forge' }],
    taxonomy_terms: [
      { id: 't1', kind: 'muscle_group', name: 'Upper Body', parent_id: null, merged_into: null },
      { id: 't2', kind: 'muscle_group', name: 'Chest', parent_id: 't1', merged_into: null },
    ],
    exercises: [{ id: 'e1', name: 'Incline DB Press', tags: ['push', 'chest'], tenant_id: null }],
    workouts: [{ id: 'w1', routine_id: null, created_at: '2026-10-01T12:00:00.000Z' }],
    log_entries: [{ id: 'l1', workout_id: 'w1', exercise_id: 'e1', weight: '47.5', reps: 8 }],
  };
  const { order, selfReferencing, cycles } = topoSortTables(Object.keys(tables), [
    { child: 'taxonomy_terms', parent: 'taxonomy_terms' },
    { child: 'taxonomy_terms', parent: 'tenants' },
    { child: 'exercises', parent: 'tenants' },
    { child: 'log_entries', parent: 'workouts' },
    { child: 'log_entries', parent: 'exercises' },
  ]);
  return {
    format: DUMP_FORMAT,
    takenAt: '2026-10-08T09:30:00.000Z',
    schemaMigrations: ['0013_client_profiles_metrics.sql'],
    restoreOrder: order,
    selfReferencing: Object.fromEntries(selfReferencing.map((t) => [t, ['parent_id', 'merged_into']])),
    primaryKeys: Object.fromEntries(
      Object.keys(tables).map((t) => [t, t === 'schema_migrations' ? ['filename'] : ['id']])
    ),
    columns: Object.fromEntries(Object.entries(tables).map(([t, rows]) => [t, Object.keys(rows[0])])),
    cycles,
    checksum: checksumTables(tables),
    tables,
    ...overrides,
  };
}

const gzipDump = (dump) => gzipSync(Buffer.from(JSON.stringify(dump)));

describe('parseDump', () => {
  it('reads a gzipped dump and verifies its checksum', () => {
    const dump = parseDump(gzipDump(makeDump()));
    expect(dump.takenAt).toBe('2026-10-08T09:30:00.000Z');
    expect(Object.keys(dump.tables)).toHaveLength(6);
  });

  it('reads an ungzipped dump too, for inspection by hand', () => {
    expect(parseDump(Buffer.from(JSON.stringify(makeDump()))).format).toBe(DUMP_FORMAT);
  });

  it('REFUSES a dump whose rows were edited after it was written', () => {
    const tampered = makeDump();
    tampered.tables.log_entries[0].weight = '999';
    expect(() => parseDump(gzipDump(tampered))).toThrow(/checksum mismatch/);
  });

  it('REFUSES a truncated file rather than restoring part of it', () => {
    const bytes = gzipDump(makeDump());
    expect(() => parseDump(bytes.subarray(0, Math.floor(bytes.length / 2)))).toThrow();
  });

  it('REFUSES a future dump format', () => {
    expect(() => parseDump(gzipDump(makeDump({ format: 99 })))).toThrow(/is not 1/);
  });

  it('REFUSES something that is not a backup at all', () => {
    expect(() => parseDump(Buffer.from('{"hello":"world"}'))).toThrow(/is not 1/);
    expect(() => parseDump(Buffer.from('not json'))).toThrow(/not readable as JSON/);
  });
});

describe('planRestore', () => {
  it('plans parents before children and self-references last within a table', () => {
    const dump = parseDump(gzipDump(makeDump()));
    const { statements, tables, selfRefWrites } = planRestore(dump);

    expect(tables.indexOf('tenants')).toBeLessThan(tables.indexOf('exercises'));
    expect(tables.indexOf('workouts')).toBeLessThan(tables.indexOf('log_entries'));
    expect(selfRefWrites).toEqual({ taxonomy_terms: 1 });

    const texts = statements.map((s) => s.text);
    const insertTaxonomy = texts.findIndex((t) => t.startsWith('insert into "taxonomy_terms"'));
    const updateTaxonomy = texts.findIndex((t) => t.startsWith('update "taxonomy_terms"'));
    expect(insertTaxonomy).toBeGreaterThanOrEqual(0);
    expect(updateTaxonomy).toBeGreaterThan(insertTaxonomy);

    // Every write is parameterised — no row value is ever interpolated into SQL.
    expect(texts.every((t) => !t.includes('Incline DB Press'))).toBe(true);
    expect(statements.flatMap((s) => s.values)).toContain('Incline DB Press');
  });

  it('restores the dumped rows exactly, run against a stand-in store', () => {
    const dump = parseDump(gzipDump(makeDump()));
    const { statements } = planRestore(dump);

    // Apply the plan to plain objects, enforcing the one rule a real database
    // would: a foreign key must already point at a row that exists.
    const store = Object.fromEntries(dump.restoreOrder.map((t) => [t, new Map()]));
    const fkChecks = {
      exercises: [],
      log_entries: [
        ['workout_id', 'workouts'],
        ['exercise_id', 'exercises'],
      ],
      taxonomy_terms: [['parent_id', 'taxonomy_terms']],
    };

    for (const s of statements) {
      const table = s.text.match(/^(?:insert into|update) "([a-z_]+)"/)[1];
      const cols = dump.columns[table];
      if (s.text.startsWith('insert into')) {
        for (let i = 0; i < s.values.length; i += cols.length) {
          const row = Object.fromEntries(cols.map((c, j) => [c, s.values[i + j]]));
          for (const [col, parent] of fkChecks[table] ?? []) {
            if (row[col] !== null) expect(store[parent].has(row[col]), `${table}.${col}`).toBe(true);
          }
          store[table].set(row[dump.primaryKeys[table][0]], row);
        }
      } else {
        const pk = s.values.at(-1);
        const setCols = [...s.text.matchAll(/"([a-z_]+)" = \$\d+/g)].map((m) => m[1]);
        setCols.forEach((col, i) => {
          const [, parent] = (fkChecks[table] ?? []).find(([c]) => c === col) ?? [];
          if (parent) expect(store[parent].has(s.values[i])).toBe(true);
          store[table].get(pk)[col] = s.values[i];
        });
      }
    }

    for (const table of dump.restoreOrder) {
      expect([...store[table].values()], table).toEqual(dump.tables[table]);
    }
  });

  it('--only narrows the plan', () => {
    const dump = parseDump(gzipDump(makeDump()));
    const { tables } = planRestore(dump, { only: ['exercises', 'workouts'] });
    expect(tables).toEqual(expect.arrayContaining(['exercises', 'workouts']));
    expect(tables).toHaveLength(2);
  });

  it('--only rejects a table that is not in the dump', () => {
    const dump = parseDump(gzipDump(makeDump()));
    expect(() => planRestore(dump, { only: ['nope'] })).toThrow(/not in the dump/);
  });

  it('refuses a composite-key table that also self-references', () => {
    const dump = makeDump();
    dump.primaryKeys.taxonomy_terms = ['kind', 'name'];
    expect(() => planRestore(parseDump(gzipDump(dump)))).toThrow(/single-column key/);
  });
});

describe('checksumTables', () => {
  it('is stable regardless of the order tables were read in', () => {
    const a = { x: [{ id: 1 }], y: [{ id: 2 }] };
    const b = { y: [{ id: 2 }], x: [{ id: 1 }] };
    expect(checksumTables(a)).toBe(checksumTables(b));
  });

  it('changes when a single value changes', () => {
    expect(checksumTables({ x: [{ id: 1 }] })).not.toBe(checksumTables({ x: [{ id: 2 }] }));
  });

  it('does not confuse a row moving between tables', () => {
    expect(checksumTables({ ab: [], c: [{ id: 1 }] })).not.toBe(checksumTables({ a: [], bc: [{ id: 1 }] }));
  });
});

describe('unsafeColumns', () => {
  it('passes the types this schema actually uses', () => {
    const cols = [
      { table: 'exercises', column: 'id', dataType: 'uuid' },
      { table: 'exercises', column: 'name', dataType: 'text' },
      { table: 'exercises', column: 'tags', dataType: 'ARRAY' },
      { table: 'log_entries', column: 'weight', dataType: 'numeric' },
      { table: 'workouts', column: 'created_at', dataType: 'timestamp with time zone' },
      { table: 'syncrofit_events', column: 'payload', dataType: 'jsonb' },
      { table: 'routines', column: 'day_of_week', dataType: 'integer' },
      { table: 'clients', column: 'active', dataType: 'boolean' },
      { table: 'client_metrics', column: 'measured_on', dataType: 'date' },
    ];
    expect(unsafeColumns(cols)).toEqual([]);
  });

  it('flags a type that would not survive the JSON round trip', () => {
    const flagged = unsafeColumns([{ table: 't', column: 'blob', dataType: 'bytea' }]);
    expect(flagged).toHaveLength(1);
    expect(flagged[0].column).toBe('blob');
  });
});

describe('filesToPrune', () => {
  const names = [
    'vitality-backup-20260901T0900Z.json.gz',
    'vitality-backup-20260908T0900Z.json.gz',
    'vitality-backup-20260915T0900Z.json.gz',
  ];

  it('keeps the newest N and deletes the rest', () => {
    expect(filesToPrune(names, 2)).toEqual(['vitality-backup-20260901T0900Z.json.gz']);
  });

  it('deletes nothing when there are fewer than N', () => {
    expect(filesToPrune(names, 12)).toEqual([]);
  });

  it('never touches a file it did not write', () => {
    const withStrangers = [...names, 'notes.txt', 'Important Tax Return.pdf', '.DS_Store'];
    expect(filesToPrune(withStrangers, 1)).toEqual([
      'vitality-backup-20260901T0900Z.json.gz',
      'vitality-backup-20260908T0900Z.json.gz',
    ]);
  });

  it('refuses to prune everything when keep is zero or negative', () => {
    expect(filesToPrune(names, 0)).toEqual([]);
    expect(filesToPrune(names, -1)).toEqual([]);
  });
});

describe('backupFilename', () => {
  it('is UTC, sortable, and matches the prune pattern', () => {
    expect(backupFilename(new Date('2026-10-08T09:30:12.345Z'))).toBe('vitality-backup-20261008T0930Z.json.gz');
  });

  it('sorts lexicographically in time order', () => {
    const a = backupFilename(new Date('2026-09-30T23:59:00Z'));
    const b = backupFilename(new Date('2026-10-01T00:01:00Z'));
    expect([b, a].sort()).toEqual([a, b]);
  });
});

describe('quoteIdent', () => {
  it('quotes a plain identifier', () => {
    expect(quoteIdent('log_entries')).toBe('"log_entries"');
  });

  it('refuses anything that is not plain snake_case', () => {
    for (const bad of ['log entries', 'Log', 'a"b', 'drop table x;--', '']) {
      expect(() => quoteIdent(bad)).toThrow(/refusing to quote/);
    }
  });
});

describe('misc', () => {
  it('normalizeValue maps undefined to null and leaves null alone', () => {
    expect(normalizeValue(undefined)).toBeNull();
    expect(normalizeValue(null)).toBeNull();
    expect(normalizeValue(0)).toBe(0);
    expect(normalizeValue('')).toBe('');
  });

  it('summarizeDump reports row counts in name order', () => {
    expect(summarizeDump({ tables: { workouts: [{}, {}], clients: [{}] } })).toEqual({
      clients: 1,
      workouts: 2,
    });
  });

  it('pins the dump format, so a change to the on-disk shape is a deliberate act', () => {
    expect(DUMP_FORMAT).toBe(1);
  });
});
