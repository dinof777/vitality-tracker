import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TAG_CATEGORY_LABEL, tagCategoryLabel, plural, SCOPE, MOVE, WORKOUT, ROUTINE } from './vocabulary';
import { TAGS } from './tags';

// Drift guard for user-facing wording.
//
// The same concept was named differently per screen: the tag category stored as
// `pattern` rendered as "MOVEMENT" on the workout builder and the trainer
// dashboard, but as the raw "pattern" in admin. Nobody had a shared word for it.
//
// Rule: no surface may hardcode a tag-category label — import from lib/vocabulary.
//
// M2 found the same disease elsewhere ("exercises" vs "moves", "gear"/"kit" vs
// "equipment", a saved workout called a "circuit" on some screens). Each of
// those retired words gets its own guard below: a literal-phrase check, not a
// blanket word ban, so SyncroFit's own "circuit" (a different concept — see
// lib/vocabulary.ts) is never falsely flagged.

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

/** Every file that contains any of `phrases`, formatted for a failure message. */
function findOffenders(phrases: string[]): string[] {
  const offenders: string[] = [];
  for (const file of walk(ROOT)) {
    const rel = relative(ROOT, file);
    if (ALLOWED.has(rel)) continue;
    const src = readFileSync(file, 'utf8');
    for (const phrase of phrases) {
      if (src.includes(phrase)) offenders.push(`${rel}: "${phrase}"`);
    }
  }
  return offenders;
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

describe('the move noun (M2)', () => {
  it('MOVE says move/moves, not exercise(s) — the pre-M2 synonym', () => {
    expect(MOVE.one).toBe('move');
    expect(MOVE.many).toBe('moves');
  });

  it('no surface reintroduces "exercise(s)" where "move(s)" is now the word', () => {
    // These are the exact headings, labels, placeholders and error strings this
    // M2 pass retired in favor of MOVE. The word "exercise" survives elsewhere on
    // purpose — route paths (/exercises), module names (lib/exercises.ts), the
    // Exercise TS type, and DB column/table names all keep it; this list only
    // targets the specific user-facing strings that drifted.
    const offenders = findOffenders([
      '>Exercises<',
      'Your exercises',
      'Exercise library',
      'Exercise name',
      'Search exercises',
      'No exercises match',
      'No custom exercises yet',
      'Build from exercises',
      'Exercises tab',
      'own exercises and equipment',
      'Custom exercises &amp; equipment',
      'ADD EXERCISE',
      'Remove exercise',
      'No exercises yet. Add your first movement',
      'no exercises here yet',
      'Send exercise images',
      'exercise images (where available)',
      'Not your exercise.',
      'Unknown exercise.',
      'No exercises to save.',
      'No exercises to share.',
      '← Exercises',
    ]);
    expect(offenders).toEqual([]);
  });
});

describe('equipment, not gear or kit (M2)', () => {
  it('no surface reintroduces "gear" or "kit" as a synonym for equipment', () => {
    const offenders = findOffenders([
      'Your gear',
      'set your gear',
      'use gear you',
      'your kit is',
      'Gear your gym has',
      "gear you've got",
      'gear you actually have',
      'Level &amp; gear',
      "gear tags through",
    ]);
    expect(offenders).toEqual([]);
  });
});

describe('workout vs SyncroFit circuit (M2)', () => {
  it('WORKOUT says workout/workouts for a trainer’s saved session', () => {
    expect(WORKOUT.one).toBe('workout');
    expect(WORKOUT.many).toBe('workouts');
    expect(ROUTINE.one).toBe('routine');
  });

  it('no Vitality-native surface calls a saved workout a "circuit" — that word is reserved for describing SyncroFit’s side of a hand-off', () => {
    const offenders = findOffenders([
      'Your circuits',
      'MY CIRCUITS',
      'Name this circuit',
      'Save this circuit',
      'No saved circuits',
      'Give the circuit a name',
      'shareable circuits',
    ]);
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
