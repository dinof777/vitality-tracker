#!/usr/bin/env node
// Is our vendored SyncroFit contract stale? Compares the hosted canonical contract
// against contracts/syncrofit.json and reports drift. Read-only — never writes.
//
//   npm run check:syncrofit            # informational, exit 0 even when stale
//   npm run check:syncrofit -- --strict # exit 1 when stale (for a cron/CI alert)
//
// Deliberately NOT part of the build: a network hiccup must never fail a deploy.
// Run it on a cadence (or before touching the integration) to learn that SyncroFit
// moved, then `npm run sync:syncrofit` to pull the change in.

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const URL_SRC = process.env.SYNCROFIT_CONTRACT_URL || 'https://www.mysyncrofit.com/.well-known/syncrofit-integration.json';
const REPO = process.env.SYNCROFIT_REPO || join(homedir(), 'dev', 'syncrofit');
const LOCAL_SRC = join(REPO, 'integration-contract.json');
const strict = process.argv.includes('--strict');

const vendoredPath = new URL('../contracts/syncrofit.json', import.meta.url).pathname;
const vendored = JSON.parse(readFileSync(vendoredPath, 'utf8'));

async function canonical() {
  try {
    const res = await fetch(URL_SRC, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const text = await res.text();
      return { data: JSON.parse(text), from: 'hosted' };
    }
    if (res.status === 404) console.log(`· Not published yet at ${URL_SRC} (HTTP 404).`);
    else console.log(`· Hosted contract returned HTTP ${res.status}.`);
  } catch (err) {
    console.log(`· Hosted contract unreachable: ${err.message}`);
  }
  if (existsSync(LOCAL_SRC)) {
    return { data: JSON.parse(readFileSync(LOCAL_SRC, 'utf8')), from: 'local repo' };
  }
  return null;
}

const found = await canonical();
if (!found) {
  console.log('⚠️  No canonical contract reachable (hosted or local). Nothing to compare.');
  process.exit(0);
}

const { data, from } = found;
const same = JSON.stringify(data) === JSON.stringify(vendored);

if (same) {
  console.log(`✓ In sync with the ${from} contract (v${vendored.version}).`);
  process.exit(0);
}

console.log(`⚠️  Vendored contract is STALE vs the ${from} contract.`);
console.log(`   vendored: v${vendored.version}   canonical: v${data.version}`);

const keys = (o) => new Set(Object.keys(o ?? {}));
const diff = (a, b) => ({ added: [...b].filter((k) => !a.has(k)), removed: [...a].filter((k) => !b.has(k)) });
const report = (label, d) => {
  if (d.added.length) console.log(`   + ${label} added: ${d.added.join(', ')}`);
  if (d.removed.length) console.log(`   - ${label} removed: ${d.removed.join(', ')}`);
};
report('circuit field', diff(keys(vendored.outbound?.circuit?.fields), keys(data.outbound?.circuit?.fields)));
report('exercise field', diff(keys(vendored.outbound?.circuit?.exercise?.fields), keys(data.outbound?.circuit?.exercise?.fields)));
report('equipment', diff(new Set(vendored.equipmentTaxonomy), new Set(data.equipmentTaxonomy)));
console.log('\n→ Run `npm run sync:syncrofit` to pull it in.');

process.exit(strict ? 1 : 0);
