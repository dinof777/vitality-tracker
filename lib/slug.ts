// Tenant slug helpers (path-based tenancy: /g/<slug>). Pure + testable.

// Routes/words a gym slug must never collide with.
export const RESERVED_SLUGS = new Set([
  'sign-in', 'sign-up', 'dashboard', 'onboarding', 'api', 'g', '_next',
  'favicon', 'manifest', 'icon', 'apple-icon', 'robots', 'sitemap', 'llms',
  'settings', 'exercises', 'routines', 'plan', 'daily5', 'log', 'workout', 'setup',
  'admin', 'app', 'www',
]);

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');
}

// 2–32 chars, lowercase alphanumeric + internal hyphens, not reserved.
export function isValidSlug(slug: string): boolean {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])$/.test(slug)) return false;
  if (slug.includes('--')) return false;
  return !RESERVED_SLUGS.has(slug);
}
