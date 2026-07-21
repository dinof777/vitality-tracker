#!/usr/bin/env node
// Pull SyncroFit's canonical integration contract into this repo's vendored copy
// (contracts/syncrofit.json) and report what changed.
//
//   npm run sync:syncrofit
//
// Source resolution (first that works wins):
//   1. The hosted contract  — SYNCROFIT_CONTRACT_URL, default:
//      https://www.mysyncrofit.com/.well-known/syncrofit-integration.json
//   2. The local SyncroFit repo — SYNCROFIT_REPO/www/integration-contract.json
//      (default ~/dev/syncrofit), used until the URL is published.
//
// We sync here rather than fetching at build/test time on purpose: the build stays
// hermetic (no network dependency in CI), while contracts/syncrofit.json remains the
// single artifact the conformance test validates against.
//
// After syncing, `npm test` fails the version pin in syncrofit-contract.test.ts until
// you review the diff and bump EXPECTED_CONTRACT_VERSION — that's the point.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const URL_SRC = process.env.SYNCROFIT_CONTRACT_URL || 'https://www.mysyncrofit.com/.well-known/syncrofit-integration.json';
const REPO = process.env.SYNCROFIT_REPO || join(homedir(), 'dev', 'syncrofit');
const LOCAL_SRC = join(REPO, 'www', 'integration-contract.json');
const dest = new URL('../contracts/syncrofit.json', import.meta.url).pathname;

async function loadCanonical() {
  try {
    const res = await fetch(URL_SRC, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const text = await res.text();
      JSON.parse(text); // reject HTML error pages masquerading as 200
      return { text, from: `hosted ${URL_SRC}` };
    }
    console.log(`· hosted contract not available (HTTP ${res.status}) — falling back to the local repo`);
  } catch (err) {
    console.log(`· hosted contract unreachable (${err.message}) — falling back to the local repo`);
  }
  if (!existsSync(LOCAL_SRC)) {
    console.error(`✗ No contract found. Publish ${URL_SRC}, or set SYNCROFIT_REPO (looked in ${LOCAL_SRC}).`);
    process.exit(1);
  }
  return { text: readFileSync(LOCAL_SRC, 'utf8'), from: `local ${LOCAL_SRC}` };
}

const { text: incoming, from } = await loadCanonical();
console.log(`Source: ${from}`);

const current = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
if (incoming.trim() === current.trim()) {
  console.log(`✓ Already up to date (contract v${JSON.parse(incoming).version}).`);
  process.exit(0);
}

const before = current
  ? JSON.parse(current)
  : { version: '—', outbound: { circuit: { fields: {}, exercise: { fields: {} } } }, equipmentTaxonomy: [] };
const after = JSON.parse(incoming);

const keys = (o) => new Set(Object.keys(o ?? {}));
const diff = (a, b) => ({ added: [...b].filter((k) => !a.has(k)), removed: [...a].filter((k) => !b.has(k)) });

const cf = diff(keys(before.outbound?.circuit?.fields), keys(after.outbound?.circuit?.fields));
const ef = diff(keys(before.outbound?.circuit?.exercise?.fields), keys(after.outbound?.circuit?.exercise?.fields));
const eq = diff(new Set(before.equipmentTaxonomy), new Set(after.equipmentTaxonomy));

writeFileSync(dest, incoming);

console.log(`↻ Synced contract: v${before.version} → v${after.version}`);
const report = (label, d) => {
  if (d.added.length) console.log(`  + ${label} added: ${d.added.join(', ')}`);
  if (d.removed.length) console.log(`  - ${label} removed: ${d.removed.join(', ')}`);
};
report('circuit field', cf);
report('exercise field', ef);
report('equipment', eq);
if (![cf, ef, eq].some((d) => d.added.length || d.removed.length)) {
  console.log('  (no field/equipment changes — wording or version-only bump)');
}
console.log('\nNext: review, update lib/syncrofit.ts if fields changed, then bump');
console.log('EXPECTED_CONTRACT_VERSION in lib/syncrofit-contract.test.ts and run `npm test`.');
