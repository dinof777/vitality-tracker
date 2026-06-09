import type { MetadataRoute } from 'next';

const ORIGIN = 'https://vitality-tracker-mauve.vercel.app';

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
