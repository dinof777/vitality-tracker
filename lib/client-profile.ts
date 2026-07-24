// Pure validation/clamping for client_profiles PUT bodies — no I/O. See
// lib/client-metrics.ts for the sibling module covering client_metrics.

export const GOALS_MAX_ITEMS = 20;
export const EQUIPMENT_MAX_ITEMS = 30;
export const ITEM_MAX_LEN = 80;
export const NOTES_MAX_LEN = 2000;

const HEIGHT_RANGE = { min: 50, max: 260 }; // cm
const GOAL_WEIGHT_RANGE = { min: 20, max: 400 }; // kg — mirrors client_metrics weight_kg bounds

function clampStringArray(raw: unknown, maxItems: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, ITEM_MAX_LEN))
    .filter(Boolean)
    .slice(0, maxItems);
}

export interface ProfilePatchInput {
  goals?: unknown;
  equipment?: unknown;
  notes?: unknown;
  heightCm?: unknown;
  goalWeightKg?: unknown;
}

export interface ProfilePatch {
  goals?: string[];
  equipment?: string[];
  notes?: string | null;
  heightCm?: number | null;
  goalWeightKg?: number | null;
}

export interface ProfileValidation {
  ok: boolean;
  patch?: ProfilePatch;
  error?: string;
}

/** Every field is optional (a PUT may touch just one); only fields actually
 * present as a key in the body are validated + included in the patch, so the
 * DB layer can distinguish "not sent" (leave alone) from "sent as null"
 * (clear it). */
export function validateProfilePatch(body: ProfilePatchInput): ProfileValidation {
  const patch: ProfilePatch = {};

  if (body.goals !== undefined) patch.goals = clampStringArray(body.goals, GOALS_MAX_ITEMS);
  if (body.equipment !== undefined) patch.equipment = clampStringArray(body.equipment, EQUIPMENT_MAX_ITEMS);

  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes).trim().slice(0, NOTES_MAX_LEN) || null;
  }

  if (body.heightCm !== undefined) {
    if (body.heightCm === null) {
      patch.heightCm = null;
    } else {
      const n = Number(body.heightCm);
      if (!Number.isFinite(n) || n < HEIGHT_RANGE.min || n > HEIGHT_RANGE.max) {
        return { ok: false, error: `heightCm must be between ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max}.` };
      }
      patch.heightCm = n;
    }
  }

  if (body.goalWeightKg !== undefined) {
    if (body.goalWeightKg === null) {
      patch.goalWeightKg = null;
    } else {
      const n = Number(body.goalWeightKg);
      if (!Number.isFinite(n) || n < GOAL_WEIGHT_RANGE.min || n > GOAL_WEIGHT_RANGE.max) {
        return {
          ok: false,
          error: `goalWeightKg must be between ${GOAL_WEIGHT_RANGE.min} and ${GOAL_WEIGHT_RANGE.max}.`,
        };
      }
      patch.goalWeightKg = n;
    }
  }

  return { ok: true, patch };
}
