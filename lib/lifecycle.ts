// Lifecycle rules — what add / update / delete / move-scope mean for anything a
// trainer or admin owns, and who is allowed to do which.
//
// Two rules decide almost everything here:
//
//   DELETE  — unused records are really deleted; in-use records are ARCHIVED.
//             Nothing you delete can cost you history. `exercises` cascades to
//             log_entries and routine_exercises, so a hard delete of a used move
//             destroys the training record it's the evidence for.
//
//   SCOPE   — moving something DOWN (global → one gym) is blocked while anyone
//             else depends on it. You can't silently pull a tag out from under
//             another gym's library; merge it first, then move.
//
// The counting logic lives here (pure, tested); the queries are in lifecycle-db.

/** What currently points at a record. Zero across the board = safe to destroy. */
export interface Usage {
  /** Routines that program this exercise. */
  routines: number;
  /** Logged sets — the irreplaceable one. */
  logEntries: number;
  /** Gyms that renamed it locally. */
  aliases: number;
  /** Exercises carrying this tag / muscle group. */
  exercises: number;
  /** Gyms that have this term in their vocabulary. */
  gyms: number;
}

export const NO_USAGE: Usage = { routines: 0, logEntries: 0, aliases: 0, exercises: 0, gyms: 0 };

export function isInUse(u: Usage): boolean {
  return u.routines + u.logEntries + u.aliases + u.exercises + u.gyms > 0;
}

/** What a delete will actually do, so the UI can say so before it happens. */
export type DeleteEffect = 'deleted' | 'archived';

export function deleteEffect(u: Usage): DeleteEffect {
  return isInUse(u) ? 'archived' : 'deleted';
}

const PLURAL: Array<[keyof Usage, string, string]> = [
  ['logEntries', 'logged set', 'logged sets'],
  ['routines', 'routine', 'routines'],
  ['exercises', 'exercise', 'exercises'],
  ['aliases', 'local rename', 'local renames'],
  ['gyms', 'gym', 'gyms'],
];

/** "112 logged sets · 3 routines" — ordered by how much it would hurt to lose. */
export function usageSummary(u: Usage): string {
  const parts = PLURAL.filter(([k]) => u[k] > 0).map(
    ([k, one, many]) => `${u[k]} ${u[k] === 1 ? one : many}`,
  );
  return parts.join(' · ');
}

/** The sentence shown on the confirm, tuned to what will really happen. */
export function deleteMessage(name: string, u: Usage): string {
  if (!isInUse(u)) return `Delete “${name}”? Nothing uses it, so it will be removed completely.`;
  return (
    `“${name}” is used by ${usageSummary(u)}. ` +
    `It will be archived instead of deleted — it disappears from pickers and new workouts, ` +
    `but everything already using it keeps working. You can restore it any time.`
  );
}

// ── Scope ────────────────────────────────────────────────────────────────────

export type Scope = 'global' | 'tenant';

export interface ScopeMove {
  from: Scope;
  to: Scope;
}

/** Moving down = narrowing who can see it. That's the direction that can break others. */
export function isDemotion(move: ScopeMove): boolean {
  return move.from === 'global' && move.to === 'tenant';
}

export interface ScopeCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Can this scope move proceed?
 *
 * Promoting (gym → global) is always safe: strictly more people can see it.
 * Demoting is blocked while gyms other than the new owner depend on it — the
 * caller passes those gym names so the refusal can say exactly who.
 */
export function checkScopeMove(move: ScopeMove, otherDependents: string[]): ScopeCheck {
  if (!isDemotion(move)) return { allowed: true };
  if (otherDependents.length === 0) return { allowed: true };
  const names = otherDependents.slice(0, 5).join(', ');
  const more = otherDependents.length > 5 ? ` and ${otherDependents.length - 5} more` : '';
  return {
    allowed: false,
    reason:
      `Still used by ${names}${more}. Making it gym-only would take it away from ` +
      `${otherDependents.length === 1 ? 'that gym' : 'those gyms'}. Merge it into another term first, then move it.`,
  };
}
