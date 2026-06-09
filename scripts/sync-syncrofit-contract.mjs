#!/usr/bin/env node
// Pull SyncroFit's canonical integration-contract.json into this repo's vendored
// copy (contracts/syncrofit.json) and report what changed. Run after SyncroFit
// bumps the contract version.
//
//   npm run sync:syncrofit
//   SYNCROFIT_REPO=/path/to/IntervalTimer-Source npm run sync:syncrofit
//
// After syncing, `npm test` will fail the version pin in syncrofit-contract.test.ts
// until you review the diff and bump EXPECTED_CONTRACT_VERSION — that's the point.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const repo = process.env.SYNCROFIT_REPO || join(homedir(), 'Developer', 'IntervalTimer-Source');
const src = join(repo, 'integration-contract.json');
const dest = new URL('../contracts/syncrofit.json', import.meta.url).pathname;

if (!existsSync(src)) {
  console.error(`✗ Canonical contract not found at ${src}`);
  console.error('  Set SYNCROFIT_REPO to the SyncroFit repo path.');
  process.exit(1);
}

const incoming = readFileSync(src, 'utf8');
const current = existsSync(dest) ? readFileSync(dest, 'utf8') : '';

if (incoming === current) {
  const v = JSON.parse(incoming).version;
  console.log(`✓ Already up to date (contract v${v}).`);
  process.exit(0);
}

const before = current ? JSON.parse(current) : { version: '—', outbound: { circuit: { fields: {}, exercise: { fields: {} } } }, equipmentTaxonomy: [] };
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
if (!cf.added.length && !cf.removed.length && !ef.added.length && !ef.removed.length && !eq.added.length && !eq.removed.length) {
  console.log('  (no field/equipment changes — likely a wording or version-only bump)');
}
console.log('\nNext: review the changes, update lib/syncrofit.ts if needed, then bump');
console.log('EXPECTED_CONTRACT_VERSION in lib/syncrofit-contract.test.ts and run `npm test`.');
