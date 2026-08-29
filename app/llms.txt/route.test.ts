import { describe, it, expect } from 'vitest';
import { GET } from './route';
import {
  SHOWCASE_TENANTS,
  isRetiredTenant,
  liveShowcaseTenants,
  tenantSlugFromPath,
} from '@/lib/tenant-directory';
import { SITE_URL } from '@/lib/site';

// /llms.txt is what AI crawlers read instead of the site. On 2026-08-29 it was
// advertising four /g/vitality pages that the edge middleware had been answering
// 410 Gone for a month, and did not mention `ironforge` — the one gym actually
// being served — at all. Wrong in both directions, because the manifest kept its
// own hardcoded copy of "which gym to show".
//
// These guards assert the manifest against lib/tenant-directory, the single
// switch the middleware also reads, so the two cannot drift again.

async function manifest(): Promise<string> {
  const res = await GET();
  return res.text();
}

/** Every absolute URL the manifest links to, as a pathname. */
function linkedPaths(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s)]+/g) ?? [];
  return urls
    .filter((u) => u.startsWith(SITE_URL))
    .map((u) => new URL(u).pathname);
}

describe('/llms.txt lists exactly the gyms that are actually live', () => {
  it('advertises no /g/<slug> the edge middleware answers 410 for', async () => {
    const retired = linkedPaths(await manifest())
      .filter((p) => {
        const slug = tenantSlugFromPath(p);
        return slug !== null && isRetiredTenant(slug);
      });

    expect(retired, 'these paths are advertised to crawlers but return 410 Gone').toEqual([]);
  });

  it('advertises every live showcase gym', async () => {
    const text = await manifest();
    const advertised = new Set(
      linkedPaths(text)
        .map(tenantSlugFromPath)
        .filter((s): s is string => s !== null),
    );

    const missing = liveShowcaseTenants()
      .map((t) => t.slug)
      .filter((slug) => !advertised.has(slug));

    expect(missing, 'these gyms are live but absent from the manifest').toEqual([]);
  });

  it('links a live gym by name, not by the hardcoded slug of a retired one', async () => {
    const text = await manifest();
    for (const tenant of liveShowcaseTenants()) {
      expect(text, `${tenant.slug} is live but its name is not in the manifest`).toContain(
        tenant.name,
      );
    }
    for (const tenant of SHOWCASE_TENANTS.filter((t) => isRetiredTenant(t.slug))) {
      expect(text, `${tenant.slug} is retired but still linked`).not.toContain(`/g/${tenant.slug}`);
    }
  });

  it('still holds the spec basics — plain text, H1, blockquote, absolute URLs', async () => {
    const res = await GET();
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

    const text = await res.text();
    const lines = text.split('\n');
    expect(lines[0]).toBe('# Live Elevated');
    expect(lines[2].startsWith('> ')).toBe(true);

    // No relative links: every markdown link target must be absolute.
    const targets = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((t) => !t.startsWith('http'))).toEqual([]);
  });
});
