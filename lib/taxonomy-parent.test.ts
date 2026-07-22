import { describe, it, expect } from 'vitest';
import { checkSetParent } from './taxonomy';

// Parent/child grouping for muscle groups (regions). Strictly 2 levels,
// same-kind only, no cycles — mirrors the style of lib/lifecycle.test.ts's
// checkScopeMove suite: pure rule, DB-free, one behaviour per test.

const term = (over: Partial<{ id: string; name: string; kind: 'muscle_group' | 'tag' | 'equipment'; hasChildren: boolean }> = {}) => ({
  id: 'term-chest',
  name: 'Chest',
  kind: 'muscle_group' as const,
  hasChildren: false,
  ...over,
});

describe('checkSetParent', () => {
  it('clearing to top-level (null parent) is always allowed', () => {
    expect(checkSetParent(term(), null).allowed).toBe(true);
    expect(checkSetParent(term({ hasChildren: true }), null).allowed).toBe(true);
  });

  it('allows a plain top-level muscle group to become a child of a top-level region', () => {
    const r = checkSetParent(term(), { id: 'term-upper', kind: 'muscle_group', hasParent: false });
    expect(r.allowed).toBe(true);
  });

  it('blocks a term from becoming its own parent', () => {
    const r = checkSetParent(term({ id: 'x' }), { id: 'x', kind: 'muscle_group', hasParent: false });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('own parent');
  });

  it('blocks parenting across kinds — tag/equipment never get a parent UI, but the rule holds regardless', () => {
    const r1 = checkSetParent(term({ kind: 'tag' }), { id: 'term-upper', kind: 'muscle_group', hasParent: false });
    expect(r1.allowed).toBe(false);
    expect(r1.reason).toContain('only applies to muscle groups');

    const r2 = checkSetParent(term(), { id: 'term-upper', kind: 'tag', hasParent: false });
    expect(r2.allowed).toBe(false);
  });

  it('blocks nesting under a term that is itself already a child — no grandparents', () => {
    const r = checkSetParent(term(), { id: 'term-upper', kind: 'muscle_group', hasParent: true });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('two levels deep');
  });

  it('blocks a region (has its own children) from being nested under another region', () => {
    const r = checkSetParent(term({ hasChildren: true }), { id: 'term-upper', kind: 'muscle_group', hasParent: false });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('nested under another');
  });

  it('a childless, parentless region can freely re-parent to another top-level region', () => {
    const r = checkSetParent(
      term({ id: 'term-back', name: 'Back' }),
      { id: 'term-lower', kind: 'muscle_group', hasParent: false },
    );
    expect(r.allowed).toBe(true);
  });
});
