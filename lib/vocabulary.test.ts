import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TAG_CATEGORY_LABEL, tagCategoryLabel, plural, SCOPE } from './vocabulary';
import { TAGS } from './tags';

// Drift guard for user-facing wording.
//
// The same concept was named differently per screen: the tag category stored as
// `pattern` rendered as "MOVEMENT" on the workout builder and the trainer
// dashboard, but as the raw "pattern" in admin. Nobody had a shared word for it.
//
// Rule: no surface may hardcode a tag-category label — import from lib/vocabulary.

const ROOT = join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.design', 'public', 'screenshots']);
const ALLOWED = new Set(['lib/vocabulary.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

describe('tag category labels', () => {
  it('covers every category the registry actually uses', () => {
    for (const tag of TAGS) {
      expect(TAG_CATEGORY_LABEL[tag.category]).toBeTruthy();
    }
  });

  it('never shows the raw stored value to a human', () => {
    expect(tagCategoryLabel('pattern')).toBe('Movement');
    expect(tagCategoryLabel('goal')).toBe('Goal');
    expect(tagCategoryLabel('stage')).toBe('Stage');
  });

  it('degrades gracefully on an unknown category rather than rendering blank', () => {
    expect(tagCategoryLabel('experimental')).toBe('experimental');
    expect(tagCategoryLabel(null)).toBe('');
  });

  it('no surface hardcodes a category label — they import from lib/vocabulary', () => {
    // Catches the exact regression: a page typing 'Movement' / 'MOVEMENT' inline
    // and drifting from what the other screens say.
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file);
      if (ALLOWED.has(rel)) continue;
      const src = readFileSync(file, 'utf8');
      for (const m of Array.from(src.matchAll(/['"`](MOVEMENT|Movement)['"`]/g))) {
        offenders.push(`${rel}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('plural', () => {
  it('agrees with the count', () => {
    expect(plural(1, 'routine')).toBe('1 routine');
    expect(plural(3, 'routine')).toBe('3 routines');
    expect(plural(0, 'gym')).toBe('0 gyms');
  });

  it('takes an explicit plural for irregular words', () => {
    expect(plural(2, 'move', 'moves')).toBe('2 moves');
  });
});

describe('scope wording', () => {
  it('says the same thing on a badge and in a selector', () => {
    expect(SCOPE.global.badge).toBe('Shared');
    expect(SCOPE.global.long).toContain('every gym');
    expect(SCOPE.tenant.long('Iron House')).toBe('Only Iron House');
  });
});
