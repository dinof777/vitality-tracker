import { getSql } from './db';
import { EQUIPMENT_LABEL } from './exercises';
import type { Equipment } from './database.types';

// What gear a gym actually has. Registered on /dashboard/equipment, and used to
// constrain what the builder can put in a workout — no point generating a
// kettlebell swing for a studio with no kettlebells.

// The core catalog rows are seeded with the same display names as EQUIPMENT_LABEL,
// so we can map a catalog name back to the exercise-library slug.
const SLUG_BY_LABEL = Object.fromEntries(
  Object.entries(EQUIPMENT_LABEL).map(([slug, label]) => [label.toLowerCase(), slug as Equipment]),
) as Record<string, Equipment>;

/**
 * The gym's core equipment as library slugs. An empty array means "not set up
 * yet" — callers should fall back to allowing everything rather than generating
 * an empty workout.
 */
export async function tenantEquipmentSlugs(tenantId: string): Promise<Equipment[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql`
      select c.name
      from tenant_equipment te
      join equipment_catalog c on c.id = te.catalog_id
      where te.tenant_id = ${tenantId} and c.status = 'core'
    `;
    return (rows as Array<{ name: string }>)
      .map((r) => SLUG_BY_LABEL[r.name.toLowerCase()])
      .filter(Boolean) as Equipment[];
  } catch {
    return [];
  }
}
