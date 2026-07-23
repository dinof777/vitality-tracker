import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const ORIGIN = SITE_URL;

// Allow crawling the public app + tenant pages; keep the trainer admin, auth, and
// APIs out of the index. Points crawlers at the sitemap (and llms.txt lives at root).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/onboarding', '/api/', '/sign-in', '/sign-up'],
    },
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}
