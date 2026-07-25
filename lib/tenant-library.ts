import { unstable_cache } from 'next/cache';
import { getSql } from './db';
import type { Equipment } from './database.types';

// One gym's effective exercise library: the global 227 + that gym's own custom
// moves, with the gym's local aliases applied to the display name. Server-only.

export interface LibraryExercise {
  id: string;
  name: string; // alias if set, else the real name
  real_name: string;
  muscle_group: string | null;
  equipment: Equipment | null;
  custom_equip_name: string | null; // when the move uses the gym's own equipment
  image_url: string | null;
  is_custom: boolean;
  default_cue: string | null;
  tags: string[];
}

async function loadTenantLibrary(tenantId: string): Promise<LibraryExercise[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select
      e.id,
      coalesce(a.name, e.name) as name,
      e.name                   as real_name,
      e.muscle_group,
      e.equipment,
      ec.name                  as custom_equip_name,
      e.image_url,
      e.default_cue,
      coalesce(e.tags, '{}')   as tags,
      (e.tenant_id is not null) as is_custom
    from exercises e
    left join exercise_aliases a
      on a.exercise_id = e.id and a.tenant_id = ${tenantId}
    left join equipment_catalog ec
      on ec.id = e.equipment_catalog_id
    where (e.is_global or e.tenant_id = ${tenantId})
      -- Archived moves stay resolvable for existing routines and logs, but drop
      -- out of the library the gym builds new workouts from.
      and e.archived_at is null
    order by coalesce(a.name, e.name)
  `;
  return rows as LibraryExercise[];
}

// Tagged `tenant:<id>` (this gym's own edits — aliases, custom exercises,
// equipment) and `tenant-library` (a global-library edit via the admin routes,
// which can change every tenant's effective library at once). See the
// `revalidateTag` calls in app/api/tenant/{aliases,exercises,equipment}/route.ts
// and app/api/admin/{exercises,equipment}/route.ts.
export async function tenantLibrary(tenantId: string): Promise<LibraryExercise[]> {
  return unstable_cache(() => loadTenantLibrary(tenantId), ['tenant-library', tenantId], {
    revalidate: 3600,
    tags: [`tenant:${tenantId}`, 'tenant-library'],
  })();
}
