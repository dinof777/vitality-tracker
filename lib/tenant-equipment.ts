import { unstable_cache } from 'next/cache';
import { getSql } from './db';
import type { Equipment } from './database.types';

// What gear a gym has. The catalog uses SyncroFit's canonical equipment names
// (contracts/syncrofit.json → equipmentTaxonomy) so the two apps speak the same
// vocabulary. The exercise library still carries its own 9 slugs, so this maps
// between them.
//
// Many-to-one is expected: SyncroFit has one "Resistance bands", we distinguish
// tube vs loop bands — a gym with resistance bands unlocks both.

export const SYNCROFIT_EQUIPMENT_TO_SLUGS: Record<string, Equipment[]> = {
  'No equipment': ['calisthenics'],
  Dumbbells: ['dumbbell'],
  Kettlebell: ['kettlebell'],
  'Resistance bands': ['tube_band', 'loop_band'],
  'Pull-up bar': ['pullup_bar'],
  'Yoga mat': ['stretch'],
  'Medicine ball': ['medicine_ball'],
  'Jump rope': ['jump_rope'],
  // Gear SyncroFit knows about that the library has no movements for (yet).
  // A gym can still declare it; it just won't unlock any exercises.
  Barbell: [],
  Bench: [],
  'Stability ball': [],
  'Foam roller': [],
  'TRX / suspension': [],
  'Boxing gloves': [],
  Treadmill: [],
  'Stationary bike': [],
  'Rowing machine': [],
};

/** Does selecting this catalog item unlock any library exercises? */
export function unlocksExercises(catalogName: string): boolean {
  return (SYNCROFIT_EQUIPMENT_TO_SLUGS[catalogName] ?? []).length > 0;
}

/**
 * The gym's equipment as library slugs.
 *
 * Bodyweight is ALWAYS included: you can't not have your own body, so excluding
 * push-ups because nobody ticked "No equipment" is never the right answer.
 *
 * An empty result means "not set up yet" — callers fall back to allowing
 * everything rather than generating an empty workout.
 */
async function loadTenantEquipmentSlugs(tenantId: string): Promise<Equipment[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql`
      select c.name
      from tenant_equipment te
      join equipment_catalog c on c.id = te.catalog_id
      where te.tenant_id = ${tenantId}
    `;
    const picked = rows as Array<{ name: string }>;
    if (picked.length === 0) return [];

    const slugs = new Set<Equipment>();
    for (const r of picked) {
      for (const s of SYNCROFIT_EQUIPMENT_TO_SLUGS[r.name] ?? []) slugs.add(s);
    }
    // Bodyweight and stretching need nothing — always available once set up.
    slugs.add('calisthenics');
    slugs.add('stretch');
    return Array.from(slugs);
  } catch {
    return [];
  }
}

// Tagged the same way as tenantLibrary — `tenant:<id>` for this gym's own
// equipment edits, `tenant-equipment` for a global equipment-catalog change
// (approve/reject/merge in app/api/admin/equipment/route.ts) that can shift
// what every tenant's picks resolve to.
export async function tenantEquipmentSlugs(tenantId: string): Promise<Equipment[]> {
  return unstable_cache(() => loadTenantEquipmentSlugs(tenantId), ['tenant-equipment', tenantId], {
    revalidate: 3600,
    tags: [`tenant:${tenantId}`, 'tenant-equipment'],
  })();
}
