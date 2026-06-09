import { getSql } from './db';
import type { Equipment } from './database.types';

// One gym's effective exercise library: the global 168 + that gym's own custom
// moves, with the gym's local aliases applied to the display name. Server-only.

export interface LibraryExercise {
  id: string;
  name: string; // alias if set, else the real name
  real_name: string;
  muscle_group: string | null;
  equipment: Equipment | null;
  image_url: string | null;
  is_custom: boolean;
}

export async function tenantLibrary(tenantId: string): Promise<LibraryExercise[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select
      e.id,
      coalesce(a.name, e.name) as name,
      e.name                   as real_name,
      e.muscle_group,
      e.equipment,
      e.image_url,
      (e.tenant_id is not null) as is_custom
    from exercises e
    left join exercise_aliases a
      on a.exercise_id = e.id and a.tenant_id = ${tenantId}
    where e.is_global or e.tenant_id = ${tenantId}
    order by coalesce(a.name, e.name)
  `;
  return rows as LibraryExercise[];
}
