// The MANDATORY gateway for tenant-owned tables. Every query against a tenant
// table must be built here so a forgotten `tenant_id` filter can never leak one
// gym's data into another — the #1 multi-tenant risk. Phase 1 adds tenant_id
// columns to these tables and routes their queries through these builders.
//
// Table/column names are whitelisted (they can't be parameterized in SQL), so
// only known identifiers are ever interpolated — values always go through $n
// placeholders.

export const TENANT_TABLES = [
  'exercises',
  'routines',
  'workouts',
  'log_entries',
  'clients',
  'share_links',
] as const;
export type TenantTable = (typeof TENANT_TABLES)[number];

export interface ScopedQuery {
  text: string;
  params: unknown[];
}

const IDENT = /^[a-z_][a-z0-9_]*$/i;

export function requireTenantTable(table: string): asserts table is TenantTable {
  if (!(TENANT_TABLES as readonly string[]).includes(table)) {
    throw new Error(`scoped-db: refusing to query unknown or non-tenant table "${table}"`);
  }
}

function requireTenantId(tenantId: string): void {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('scoped-db: tenantId is required for a tenant-scoped query');
  }
}

export interface SelectOpts {
  columns?: string; // trusted (not user input) — e.g. 'id, name'
  where?: string; // extra condition referencing $2, $3, … (NOT $1)
  params?: unknown[]; // values for the extra placeholders, in order
  orderBy?: string; // trusted
  limit?: number;
}

// SELECT … FROM <table> WHERE tenant_id = $1 [AND (<where>)] …
export function buildTenantSelect(table: TenantTable, tenantId: string, opts: SelectOpts = {}): ScopedQuery {
  requireTenantTable(table);
  requireTenantId(tenantId);
  const params: unknown[] = [tenantId, ...(opts.params ?? [])];
  let text = `select ${opts.columns ?? '*'} from ${table} where tenant_id = $1`;
  if (opts.where) text += ` and (${opts.where})`;
  if (opts.orderBy) text += ` order by ${opts.orderBy}`;
  if (opts.limit != null) text += ` limit ${Number(opts.limit)}`;
  return { text, params };
}

// INSERT INTO <table> (tenant_id, …row) VALUES ($1, …) RETURNING *
export function buildTenantInsert(table: TenantTable, tenantId: string, row: Record<string, unknown>): ScopedQuery {
  requireTenantTable(table);
  requireTenantId(tenantId);
  const keys = Object.keys(row);
  for (const k of keys) {
    if (!IDENT.test(k)) throw new Error(`scoped-db: illegal column name "${k}"`);
  }
  const cols = ['tenant_id', ...keys];
  const params = [tenantId, ...keys.map((k) => row[k])];
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  return {
    text: `insert into ${table} (${cols.join(', ')}) values (${placeholders}) returning *`,
    params,
  };
}
