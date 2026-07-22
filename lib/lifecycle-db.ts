import { getSql } from './db';
import { NO_USAGE, type Usage } from './lifecycle';

// The reference counts behind the lifecycle rules. Server-only.
//
// Note on payload references: tenant_workouts and share_links embed a workout as
// jsonb rather than by foreign key, so they can't cascade and aren't counted as
// blocking. Archiving (rather than deleting) is what keeps those payloads
// resolvable, which is the other reason archive is the default for in-use rows.

/** What points at an exercise. */
export async function exerciseUsage(exerciseId: string): Promise<Usage> {
  const sql = getSql();
  if (!sql) return NO_USAGE;
  const rows = await sql`
    select
      (select count(*) from routine_exercises where exercise_id = ${exerciseId})::int as routines,
      (select count(*) from log_entries      where exercise_id = ${exerciseId})::int as log_entries,
      (select count(*) from exercise_aliases where exercise_id = ${exerciseId})::int as aliases
  `;
  const r = rows[0] ?? {};
  return {
    routines: r.routines ?? 0,
    logEntries: r.log_entries ?? 0,
    aliases: r.aliases ?? 0,
    exercises: 0,
    gyms: 0,
    children: 0,
  };
}

/** What points at a taxonomy term. */
export async function termUsage(termId: string): Promise<Usage> {
  const sql = getSql();
  if (!sql) return NO_USAGE;
  const term = (await sql`select kind, name, normalized from taxonomy_terms where id = ${termId}`)[0];
  if (!term) return NO_USAGE;

  const gyms = (await sql`select count(*)::int n from tenant_terms where term_id = ${termId}`)[0]?.n ?? 0;

  // Exercises store the display value for a muscle group and the slug for a tag.
  let exercises = 0;
  if (term.kind === 'muscle_group') {
    exercises =
      (await sql`select count(*)::int n from exercises where muscle_group = ${term.name}`)[0]?.n ?? 0;
  } else if (term.kind === 'tag') {
    const slug = String(term.normalized).replace(/ /g, '-');
    exercises = (await sql`select count(*)::int n from exercises where ${slug} = any(tags)`)[0]?.n ?? 0;
  }

  // A region (a muscle_group with children) counting them here is what makes
  // isInUse() treat it as in-use — deleting it archives instead of orphaning
  // whatever's still parented to it.
  const children =
    (await sql`select count(*)::int n from taxonomy_terms where parent_id = ${termId} and archived_at is null`)[0]
      ?.n ?? 0;

  return { routines: 0, logEntries: 0, aliases: 0, exercises, gyms, children };
}

/**
 * Gyms depending on a term, excluding the one about to take ownership.
 * Feeds checkScopeMove so a refusal can name them.
 */
export async function termDependents(termId: string, exceptTenantId?: string): Promise<string[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select t.name from tenant_terms tt
    join tenants t on t.id = tt.tenant_id
    where tt.term_id = ${termId}
      and (${exceptTenantId ?? null}::uuid is null or tt.tenant_id <> ${exceptTenantId ?? null}::uuid)
    order by t.name
  `;
  return rows.map((r) => String(r.name));
}

/**
 * Gyms depending on a global exercise, excluding the one about to take it.
 * A gym depends on it if it renamed it locally — the signal we have that the
 * move is part of that gym's library rather than incidental.
 */
export async function exerciseDependents(exerciseId: string, exceptTenantId?: string): Promise<string[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await sql`
    select distinct t.name from exercise_aliases a
    join tenants t on t.id = a.tenant_id
    where a.exercise_id = ${exerciseId}
      and (${exceptTenantId ?? null}::uuid is null or a.tenant_id <> ${exceptTenantId ?? null}::uuid)
    order by t.name
  `;
  return rows.map((r) => String(r.name));
}
