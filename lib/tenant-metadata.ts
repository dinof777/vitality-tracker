// The <title>, description and Open Graph tags for a branded gym surface
// (`/g/<slug>/*`).
//
// Why this module exists: every `/g/<slug>` page inherited the root layout's
// metadata, so a white-label gym's browser tab, its og:title and its
// description all read "Live Elevated" — the platform's name on the one
// surface whose entire promise is "your gym, your branding". The tab is
// visible on every open window and in every bookmark, which makes it the most
// public place that promise could break.
//
// It is shared rather than repeated per route for the same reason
// `lib/tenant-directory.ts` exists: the gym's name must be derived in ONE
// place, from the same sources every other consumer reads, so a second gym
// list can never drift into being.
//
// Server-only: it reads the tenant from the DB. `lib/tenant-directory.ts`
// stays edge-safe and is imported here, never the other way round.

import type { Metadata } from 'next';
import { fetchTenantBySlug } from './tenant';
import { showcaseTenantName } from './tenant-directory';

/**
 * The platform's own name. Correct on the platform's own pages (see
 * `app/layout.tsx`) and wrong on a branded gym page — which is the whole point
 * of this module.
 */
export const PLATFORM_NAME = 'Live Elevated';

/**
 * A branded surface's tab title: the GYM's name, and the section on sub-pages.
 * Never suffixed with the platform's name — appending "· Live Elevated" would
 * reintroduce exactly the leak this module removes, in the exact place a gym's
 * customer sees it. The em-dash separator matches the link titles the same
 * gyms already get in `/llms.txt`.
 */
export function tenantPageTitle(gymName: string, section?: string): string {
  const name = gymName.trim() || PLATFORM_NAME;
  return section ? `${name} — ${section}` : name;
}

/** The public branded surfaces, and what each one's description says. */
export const TENANT_SURFACES = {
  home: {
    section: undefined,
    describe: (gym: string) => `${gym}'s workout app — today's session, built from the gym's own exercise library.`,
  },
  exercises: {
    section: 'Exercise library',
    describe: (gym: string) => `Every exercise ${gym} trains with, including the gym's own custom moves.`,
  },
  build: {
    section: 'Build a workout',
    describe: (gym: string) => `Build a workout from ${gym}'s library and send it straight to your phone.`,
  },
  poster: {
    section: 'QR poster',
    describe: (gym: string) => `A print-ready QR poster for ${gym} — scan it to open the gym's workout app.`,
  },
  branding: {
    section: 'Branding',
    describe: (gym: string) => `Set ${gym}'s name, logo and colours.`,
  },
} as const satisfies Record<string, { section: string | undefined; describe: (gym: string) => string }>;

export type TenantSurface = keyof typeof TENANT_SURFACES;

/**
 * The gym's display name for `slug`. The tenants table is the source of truth;
 * `showcaseTenantName` (the shared directory) is the fallback when the DB is
 * unreachable, so a branded page degrades to the gym's name rather than to the
 * platform's. Returns null only for a slug we know nothing about at all.
 */
export async function tenantDisplayName(slug: string): Promise<string | null> {
  const tenant = await fetchTenantBySlug(slug);
  if (tenant) return tenant.branding.brandName?.trim() || tenant.name;
  return showcaseTenantName(slug);
}

/** Metadata for one branded gym surface. Call from a route's generateMetadata. */
export async function tenantMetadata(slug: string, surface: TenantSurface): Promise<Metadata> {
  const gym = await tenantDisplayName(slug);
  // Unknown slug: the page itself is about to notFound(), so leave the
  // platform defaults rather than invent a name from the URL.
  if (!gym) return {};

  const { section, describe } = TENANT_SURFACES[surface];
  const title = tenantPageTitle(gym, section);
  const description = describe(gym);

  return {
    title,
    description,
    applicationName: gym,
    openGraph: { title, description, siteName: gym, url: `/g/${slug}` },
    twitter: { card: 'summary', title, description },
    appleWebApp: { title: gym },
  };
}
