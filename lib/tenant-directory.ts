// Which public white-label tenants (/g/<slug>) the site is currently willing to
// serve, and which of those it is willing to ADVERTISE as a worked example.
//
// This module exists because those two facts used to live in two places that
// could not see each other: `middleware.ts` decided what the edge serves, and
// `app/llms.txt/route.ts` hardcoded which gym to show AI crawlers. They drifted
// — the manifest advertised /g/vitality, /g/vitality/exercises, /g/vitality/build
// and /g/vitality/poster for a month after the edge started answering all four
// with 410 Gone, while the one gym that was actually live (`ironforge`) was not
// mentioned anywhere. Both files now read this module, so a slug can never be
// advertised and retired at the same time.
//
// Edge-safe on purpose: no DB, no Node built-ins, no `next/*` imports, so
// `middleware.ts` can import it directly.

/**
 * Retired public tenant slugs. Served a cheap 410 at the EDGE so bot floods
 * never reach the serverless renderer — `/g/[slug]` costs 3 DB calls, a workout
 * build and an Observability Event per hit, and `/g/vitality` alone was ~10 req/s
 * of bot traffic and essentially the entire Vercel bill.
 *
 * This is the on/off switch for a public tenant. Removing a slug here brings the
 * gym back AND puts it back in /llms.txt in the same edit.
 */
export const RETIRED_TENANT_SLUGS: ReadonlySet<string> = new Set(['vitality']);

/** A tenant the marketing surfaces may cite as the worked example of a branded gym. */
export interface ShowcaseTenant {
  slug: string;
  /** Display name, used in the /llms.txt link titles. */
  name: string;
}

/**
 * Gyms we are willing to point AI crawlers at as a public example. Deliberately
 * curated rather than "every row in `tenants`" — a white-label customer's gym is
 * theirs, not our marketing collateral, and enumerating the table here would put
 * a DB round-trip on a crawler-hit route (the exact cost pattern the July 2026
 * incident was about).
 *
 * Retired slugs may stay listed; `liveShowcaseTenants()` filters them out, so the
 * list survives a gym being switched off and back on without an edit.
 */
export const SHOWCASE_TENANTS: readonly ShowcaseTenant[] = [
  { slug: 'ironforge', name: 'Iron Forge' },
  { slug: 'vitality', name: 'Vitality' },
];

/** True when `/g/<slug>` is switched off and answered 410 at the edge. */
export function isRetiredTenant(slug: string): boolean {
  return RETIRED_TENANT_SLUGS.has(slug.toLowerCase());
}

/** The tenant slug a public path addresses, or null if the path isn't a `/g/<slug>` one. */
export function tenantSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/g\/([^/]+)/);
  return m ? m[1].toLowerCase() : null;
}

/** Showcase gyms that are actually being served right now. */
export function liveShowcaseTenants(): readonly ShowcaseTenant[] {
  return SHOWCASE_TENANTS.filter((t) => !isRetiredTenant(t.slug));
}
