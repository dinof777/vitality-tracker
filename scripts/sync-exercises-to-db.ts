// Sync the canonical TS exercise library (lib/exercises.ts) into the Neon
// `exercises` table. SAMPLE_EXERCISES is the source of truth; the DB mirrors it
// so tenant-facing surfaces (a gym's library, the /g/<slug> builder) see the same
// movements and tags.
//
//   npx tsx scripts/sync-exercises-to-db.ts
//
// Idempotent: inserts missing global rows, refreshes tags/cue/image on existing
// ones. Never touches tenant-owned custom exercises (tenant_id is not null).

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { SAMPLE_EXERCISES } from '../lib/exercises';

const env = readFileSync('.env.local', 'utf8');
const url = env
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))
  ?.split('=')
  .slice(1)
  .join('=')
  .trim()
  .replace(/^["']|["']$/g, '');

if (!url) {
  console.error('✗ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(url);

async function main() {
let inserted = 0;
let updated = 0;

for (const e of SAMPLE_EXERCISES) {
  const tags = e.tags ?? [];
  const rows = await sql`
    insert into exercises (id, name, muscle_group, default_cue, equipment, image_url, is_global, tenant_id, tags)
    values (${e.id}, ${e.name}, ${e.muscle_group}, ${e.default_cue}, ${e.equipment}, ${e.image_url}, true, null, ${tags})
    on conflict (id) do update
      set name = excluded.name,
          muscle_group = excluded.muscle_group,
          default_cue = excluded.default_cue,
          equipment = excluded.equipment,
          image_url = excluded.image_url,
          tags = excluded.tags
    returning (xmax = 0) as was_insert
  `;
  if (rows[0]?.was_insert) inserted++;
  else updated++;
}

const [{ total, tagged }] = (await sql`
  select count(*) as total, count(*) filter (where cardinality(tags) > 0) as tagged
  from exercises where tenant_id is null
`) as Array<{ total: string; tagged: string }>;

console.log(`✓ synced ${SAMPLE_EXERCISES.length} exercises — ${inserted} inserted, ${updated} updated`);
console.log(`  DB global rows: ${total} (${tagged} tagged)`);
}

main().catch((e) => {
  console.error('✗ sync failed:', e);
  process.exit(1);
});
