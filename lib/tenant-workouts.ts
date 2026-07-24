import { getSql } from './db';
import type { SharePayload } from './share';

// A gym's saved workout circuits — the durable library a trainer builds up and
// reuses. Share links are created FROM these (share_links.workout_id), so a
// circuit's shares, opens and completions roll up to it.

export interface TenantWorkout {
  id: string;
  tenant_id: string;
  owner_user_id: string | null;
  name: string;
  payload: SharePayload;
  created_at: string;
}

export interface TenantWorkoutSummary extends TenantWorkout {
  moves: number;
  shares: number;
  opens: number;
  completions: number;
}

/** Per-trainer: their own circuits, or every trainer's if they own the gym. */
export async function listWorkouts(
  tenantId: string,
  userId: string,
  isOwner: boolean,
): Promise<TenantWorkoutSummary[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select w.id, w.tenant_id, w.owner_user_id, w.name, w.payload, w.created_at,
      coalesce(jsonb_array_length(w.payload->'exercises'), 0) as moves,
      (select count(*) from share_links sl where sl.workout_id = w.id)                        as shares,
      (select coalesce(sum(sl.opens), 0) from share_links sl where sl.workout_id = w.id)      as opens,
      (select count(*) from syncrofit_events se
         join share_links sl on sl.token = se.circuit_id
        where sl.workout_id = w.id and se.event = 'circuit.completed')                        as completions
    from tenant_workouts w
    where w.tenant_id = ${tenantId} and (${isOwner} or w.owner_user_id = ${userId})
    order by w.created_at desc
  `;
  return rows as TenantWorkoutSummary[];
}

export async function getWorkout(
  id: string,
  tenantId: string,
  userId: string,
  isOwner: boolean,
): Promise<TenantWorkout | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    select id, tenant_id, owner_user_id, name, payload, created_at
    from tenant_workouts
    where id = ${id} and tenant_id = ${tenantId} and (${isOwner} or owner_user_id = ${userId})
    limit 1
  `;
  return (rows[0] as TenantWorkout) ?? null;
}

export async function createWorkout(
  tenantId: string,
  ownerUserId: string,
  name: string,
  payload: SharePayload,
): Promise<TenantWorkout | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    insert into tenant_workouts (tenant_id, owner_user_id, name, payload)
    values (${tenantId}, ${ownerUserId}, ${name}, ${JSON.stringify(payload)}::jsonb)
    returning id, tenant_id, owner_user_id, name, payload, created_at
  `;
  return (rows[0] as TenantWorkout) ?? null;
}

/** Renames a saved circuit in place — the "Rename" affordance after a
 *  one-tap Save circuit (StartSheet), which saves under the workout's
 *  existing name up front rather than making naming a required first step. */
export async function renameWorkout(
  id: string,
  tenantId: string,
  userId: string,
  isOwner: boolean,
  name: string,
): Promise<TenantWorkout | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    update tenant_workouts
    set name = ${name}
    where id = ${id} and tenant_id = ${tenantId} and (${isOwner} or owner_user_id = ${userId})
    returning id, tenant_id, owner_user_id, name, payload, created_at
  `;
  return (rows[0] as TenantWorkout) ?? null;
}

export async function deleteWorkout(id: string, tenantId: string, userId: string, isOwner: boolean): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    delete from tenant_workouts
    where id = ${id} and tenant_id = ${tenantId} and (${isOwner} or owner_user_id = ${userId})
  `;
}

export interface WorkoutShare {
  token: string;
  name: string;
  created_at: string;
  opens: number;
  client_name: string | null;
  completions: number;
}

/** Every share link created from a saved circuit, newest first. */
export async function workoutShares(workoutId: string): Promise<WorkoutShare[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select sl.token, sl.name, sl.created_at, sl.opens,
      c.name as client_name,
      (select count(*) from syncrofit_events se
        where se.circuit_id = sl.token and se.event = 'circuit.completed') as completions
    from share_links sl
    left join clients c on c.id = sl.client_id
    where sl.workout_id = ${workoutId}
    order by sl.created_at desc
  `;
  return rows as WorkoutShare[];
}
