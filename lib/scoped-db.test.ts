import { describe, it, expect } from 'vitest';
import { buildTenantSelect, buildTenantInsert, requireTenantTable } from './scoped-db';

// The regression net for multi-tenant isolation: prove every built query is
// always scoped to a tenant and that nothing un-whitelisted can be queried.

describe('buildTenantSelect', () => {
  it('always filters by tenant_id = $1 with the tenant as the first param', () => {
    const q = buildTenantSelect('routines', 'tenant-A');
    expect(q.text).toContain('where tenant_id = $1');
    expect(q.params[0]).toBe('tenant-A');
  });

  it('appends extra conditions and keeps tenant_id as $1', () => {
    const q = buildTenantSelect('routines', 'tenant-A', { where: 'day_of_week = $2', params: [3] });
    expect(q.text).toContain('where tenant_id = $1');
    expect(q.text).toContain('and (day_of_week = $2)');
    expect(q.params).toEqual(['tenant-A', 3]);
  });

  it('supports trusted columns / orderBy / limit', () => {
    const q = buildTenantSelect('exercises', 't1', { columns: 'id, name', orderBy: 'name', limit: 10 });
    expect(q.text).toBe('select id, name from exercises where tenant_id = $1 order by name limit 10');
  });

  it('throws on a non-tenant or unknown table (no leakage path)', () => {
    // @ts-expect-error — tenants is intentionally NOT a tenant-scoped table
    expect(() => buildTenantSelect('tenants', 't1')).toThrow(/non-tenant|unknown/);
    // @ts-expect-error — injection attempt
    expect(() => buildTenantSelect('routines; drop table routines', 't1')).toThrow();
  });

  it('throws when tenantId is missing/empty', () => {
    expect(() => buildTenantSelect('routines', '')).toThrow(/tenantId/);
    // @ts-expect-error — null tenant
    expect(() => buildTenantSelect('routines', null)).toThrow(/tenantId/);
  });
});

describe('buildTenantInsert', () => {
  it('injects tenant_id as the first column/param', () => {
    const q = buildTenantInsert('clients', 'tenant-9', { name: 'Bob', contact: 'bob@x.com' });
    expect(q.text).toBe('insert into clients (tenant_id, name, contact) values ($1, $2, $3) returning *');
    expect(q.params).toEqual(['tenant-9', 'Bob', 'bob@x.com']);
  });

  it('rejects illegal column names (injection via keys)', () => {
    expect(() => buildTenantInsert('clients', 't1', { 'name); drop table clients; --': 'x' })).toThrow(/illegal column/);
  });
});

describe('requireTenantTable', () => {
  it('accepts whitelisted tables and rejects others', () => {
    expect(() => requireTenantTable('workouts')).not.toThrow();
    expect(() => requireTenantTable('secrets')).toThrow();
  });
});
