import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SAMPLE_EXERCISES, EQUIPMENT_ORDER } from './exercises';

// Drift guard for the library counts.
//
// "188 moves" and "9 equipment types" appear in marketing copy, the dashboard,
// SITE.md and /llms.txt. They went stale once already — the app shipped 188
// moves while four places still advertised 168 — because each was typed by hand.
//
// Two rules, checked here so the next person can't reintroduce it:
//   1. Code must DERIVE the count from lib/exercises, never hardcode it.
//   2. Markdown can't compute, so its hardcoded counts must at least be current.

const ROOT = join(__dirname, '..');
const MOVES = SAMPLE_EXERCISES.length;
const EQUIP = EQUIPMENT_ORDER.length;

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.design', 'public', 'screenshots']);

// The source of truth itself, and this test, are allowed to say the number.
const ALLOWED = new Set(['lib/exercises.ts', 'lib/library-counts.test.ts']);

function walk(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, ext, out);
    else if (ext.test(entry)) out.push(full);
  }
  return out;
}

/** e.g. "188-move", "188 moves", "9 equipment types", "188 illustrated" */
const COUNT_PHRASE = /(\d{1,4})[\s-](moves?|exercises|movements|illustrated|equipment types)\b/gi;

function countPhrases(text: string): Array<{ n: number; noun: string; phrase: string }> {
  return Array.from(text.matchAll(COUNT_PHRASE)).map((m) => ({
    n: Number(m[1]),
    noun: m[2].toLowerCase(),
    phrase: m[0],
  }));
}

describe('library counts never drift', () => {
  it('code derives the counts instead of hardcoding them', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT, /\.tsx?$/)) {
      const rel = relative(ROOT, file);
      if (ALLOWED.has(rel)) continue;
      for (const { phrase } of countPhrases(readFileSync(file, 'utf8'))) {
        offenders.push(`${rel}: "${phrase}"`);
      }
    }
    // Import the count from lib/exercises (SAMPLE_EXERCISES.length /
    // EQUIPMENT_ORDER.length) rather than typing it — see app/llms.txt/route.ts.
    expect(offenders).toEqual([]);
  });

  it('markdown quotes the current counts', () => {
    const stale: string[] = [];
    for (const file of walk(ROOT, /\.md$/)) {
      const rel = relative(ROOT, file);
      if (ALLOWED.has(rel)) continue;
      for (const { n, noun, phrase } of countPhrases(readFileSync(file, 'utf8'))) {
        const expected = noun === 'equipment types' ? EQUIP : MOVES;
        if (n !== expected) stale.push(`${rel}: "${phrase}" — should be ${expected}`);
      }
    }
    expect(stale).toEqual([]);
  });
});
