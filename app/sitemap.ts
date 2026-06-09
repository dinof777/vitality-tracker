import type { MetadataRoute } from 'next';

const ORIGIN = 'https://vitality-tracker-mauve.vercel.app';

// Canonical public routes. Per-tenant /g/<slug> pages are dynamic and not
// enumerated here; trainer admin + auth are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/exercises', '/routines', '/plan', '/daily5'];
  return routes.map((r) => ({
    url: `${ORIGIN}${r}`,
    changeFrequency: 'weekly' as const,
    priority: r === '' ? 1 : 0.7,
  }));
}
