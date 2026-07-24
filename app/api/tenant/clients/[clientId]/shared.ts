import type { ClientProfile } from '@/lib/client-portal-db';

// Shared response shaping for the /api/tenant/clients/[clientId]/* routes.
// Not a route itself — Next's App Router only treats files literally named
// route.ts as endpoints, so this file is safely importable without adding a
// stray HTTP surface.
//
// The DB layer (lib/client-portal-db.ts) stays snake_case, matching every
// other table in this codebase. This file is the one deliberate transform
// point into the camelCase shape published in the API contract (goals,
// equipment, notes, heightCm, goalWeightKg, portalToken, …) — see
// 04_Agents_Workspace/Software_Dev/vitality-tracker-trainee-portal/
// API_CONTRACT_client_profiles.md.

export interface ProfileJson {
  clientId: string;
  goals: string[];
  equipment: string[];
  notes: string | null;
  heightCm: number | null;
  goalWeightKg: number | null;
  portalToken: string | null;
  portalTokenCreatedAt: string | null;
  portalConsentAt: string | null;
  syncrofitUserScopedId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** null when the client has no profile row yet (nothing saved for them). */
export function toProfileJson(profile: ClientProfile | null): ProfileJson | null {
  if (!profile) return null;
  return {
    clientId: profile.client_id,
    goals: profile.goals,
    equipment: profile.equipment,
    notes: profile.notes,
    heightCm: profile.height_cm === null ? null : Number(profile.height_cm),
    goalWeightKg: profile.goal_weight_kg === null ? null : Number(profile.goal_weight_kg),
    portalToken: profile.portal_token,
    portalTokenCreatedAt: profile.portal_token_created_at,
    portalConsentAt: profile.portal_consent_at,
    syncrofitUserScopedId: profile.syncrofit_user_scoped_id,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}
