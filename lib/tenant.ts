import type { CSSProperties } from 'react';
import { unstable_cache } from 'next/cache';
import { getSql } from './db';

// A white-label tenant (gym / trainer). Branding overrides the default theme
// tokens (see app/globals.css) per tenant.
export interface Branding {
  brandName?: string;
  logoUrl?: string;
  accent?: string;
  accentPress?: string;
  onAccent?: string;
  background?: string;
  surface?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  branding: Branding;
  custom_domain: string | null;
  plan: string;
}

// Defaults mirror app/globals.css so an unbranded tenant looks like core Vitality.
export const DEFAULT_BRANDING: Required<Pick<Branding, 'accent' | 'accentPress' | 'onAccent' | 'background' | 'surface'>> = {
  accent: '#a3e635',
  accentPress: '#84cc16',
  onAccent: '#0b0b0c',
  background: '#121316',
  surface: '#1b1c20',
};

// Translate a tenant's branding into CSS custom properties. Spread onto a
// wrapping element's `style` to re-theme everything beneath it (Tailwind
// classes like bg-accent resolve to var(--accent)).
export function brandingToCssVars(branding: Branding): CSSProperties {
  const b = { ...DEFAULT_BRANDING, ...branding };
  return {
    '--accent': b.accent,
    '--accent-press': b.accentPress,
    '--on-accent': b.onAccent,
    '--background': b.background,
    '--surface': b.surface,
  } as CSSProperties;
}

async function loadTenantBySlug(slug: string): Promise<Tenant | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      select id, slug, name, branding, custom_domain, plan
      from tenants where slug = ${slug} limit 1
    `;
    return (rows[0] as Tenant) ?? null;
  } catch {
    return null;
  }
}

// Load a tenant by its URL slug (path-based: /g/<slug>). Server-only.
//
// Wrapped in unstable_cache so the `/g/[slug]/*` routes stop making a `no-store`
// Neon fetch on every request (lib/db.ts forces `cache: 'no-store'` on the driver
// itself, deliberately, for live reads elsewhere — this wraps the *return value*
// of the call, independent of that). A tag/keyPart derived from `slug` is created
// fresh per call (rather than statically at module scope) so `revalidateTag`
// can target one tenant's cache entry without touching every other tenant's —
// see app/api/tenants/[slug]/route.ts's PATCH handler for the invalidation hook.
export async function fetchTenantBySlug(slug: string): Promise<Tenant | null> {
  return unstable_cache(() => loadTenantBySlug(slug), ['tenant-by-slug', slug], {
    revalidate: 3600,
    tags: [`tenant-slug:${slug}`],
  })();
}

// Load a tenant by id (e.g. to theme a public share). Server-only.
export async function fetchTenantById(id: string): Promise<Tenant | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      select id, slug, name, branding, custom_domain, plan
      from tenants where id = ${id} limit 1
    `;
    return (rows[0] as Tenant) ?? null;
  } catch {
    return null;
  }
}
