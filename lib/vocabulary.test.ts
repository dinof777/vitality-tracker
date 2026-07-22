import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { TAG_CATEGORY_LABEL, tagCategoryLabel, plural, SCOPE, EXERCISE, WORKOUT, ROUTINE } from './vocabulary';
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
//
// Round three reversed the "move" call from M2 — "exercise" is canonical again.
// The guard below still checks the same direction the rest of this file checks
// in (retired phrase → banned), just for the newly-retired word.

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

describe('the exercise noun (round three — reverses M2)', () => {
  it('EXERCISE says exercise/exercises, not move(s) — the retired M2 synonym', () => {
    expect(EXERCISE.one).toBe('exercise');
    expect(EXERCISE.many).toBe('exercises');
  });

  it('no surface reintroduces "move(s)" as the exercise noun — "movement" (the pattern-category label) is a different word and is never flagged here', () => {
    // These are the exact headings, labels, placeholders, aria-labels and error
    // strings this pass retired in favor of EXERCISE. "movement"/"Movement" is
    // deliberately absent from this list — it's the `pattern` tag-category label
    // (TAG_CATEGORY_LABEL.pattern) and MOVEMENT_FAMILIES, a different concept,
    // not the noun this guards. Route paths, JS identifiers ("move" as a
    // reorder-array-item helper), and "Remove"/".move(" are untouched on
    // purpose — see the sibling word-boundary carve-outs in this file's header.
    const offenders = findOffenders([
      '>Moves</h1>',
      'Moves →',
      "label: 'Moves'",
      "title: 'Moves'",
      '✚ PICK MY OWN MOVES',
      '+ ADD MOVE',
      'ADD MOVES',
      'RENAME A MOVE',
      'Move name',
      '>Move library<',
      'Moves, equipment, clients',
      'Your moves',
      'No custom moves yet',
      'No moves yet. Add your first one',
      'No moves match',
      'No library moves match',
      'Search moves',
      'It’s a different move',
      'Build from moves',
      'from the Moves tab',
      'Don’t like a move?',
      'aria-label="Remove move"',
      'calls out every move, set and rest',
      'calls out each move, set and rest',
      'Send move images',
      'move images (where available)',
      'No moves to save.',
      'No moves to share.',
      'Not your move.',
      'Unknown move.',
      'on one move.',
      'no moves here yet',
      'brand, moves, and equipment',
      'Gentler moves · fewer sets',
      'Explosive moves · high volume',
      '← Moves',
      '-move illustrated library',
      '-move library',
      "move{picked.length === 1 ? '' : 's'}",
      "MOVE{picked.length === 1 ? '' : 'S'}",
      '{count} MOVES</p>',
      'matching move{poolSource.length',
      '{workout.length} moves</span>',
      'for another move`}',
      'illustrated moves ·',
      'move’s equipment tags through',
      'Per-move images',
      'add my own moves and equipment',
      'add custom moves, rename library moves',
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
