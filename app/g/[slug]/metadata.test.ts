import { describe, it, expect, vi } from 'vitest';
import type { Metadata } from 'next';
import { SHOWCASE_TENANTS, showcaseTenantName } from '@/lib/tenant-directory';

// A branded gym page put the PLATFORM's name in the browser tab: on 2026-08-29
// the live /g/ironforge — a page that says "Iron Forge" everywhere else —
// served `<title>Live Elevated</title>`, because no /g/<slug> route exported
// generateMetadata and every one of them inherited app/layout.tsx's platform
// defaults. The tab is visible in every open window and every bookmark, so on a
// white-label product it is the most public place the branding can break.
//
// These guards assert the gym's own name on each branded surface, and assert
// the platform's name is absent from it. They fail against the pre-fix code
// (no generateMetadata -> undefined title).

const IRON_FORGE = {
  id: 't1',
  slug: 'ironforge',
  name: 'Iron Forge',
  branding: { brandName: 'Iron Forge' },
  custom_domain: null,
  plan: 'pro',
};

vi.mock('@/lib/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant')>();
  return {
    ...actual,
    fetchTenantBySlug: vi.fn(async (slug: string) => (slug === 'ironforge' ? IRON_FORGE : null)),
  };
});

/** The title string out of a Metadata object, however Next allows it to be shaped. */
function titleOf(meta: Metadata): string {
  const t = meta.title;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object' && 'absolute' in t && typeof t.absolute === 'string') return t.absolute;
  if (t && typeof t === 'object' && 'default' in t && typeof t.default === 'string') return t.default;
  return '';
}

type MetaRoute = { generateMetadata?: (a: { params: { slug: string } }) => Metadata | Promise<Metadata> };

const SURFACES: { label: string; load: () => Promise<MetaRoute>; section?: string }[] = [
  { label: 'gym home', load: () => import('./page') },
  { label: 'exercise library', load: () => import('./exercises/page'), section: 'Exercise library' },
  { label: 'workout builder', load: () => import('./build/page'), section: 'Build a workout' },
  { label: 'QR poster', load: () => import('./poster/page'), section: 'QR poster' },
  { label: 'branding settings', load: () => import('./branding/layout'), section: 'Branding' },
];

async function metaFor(load: () => Promise<MetaRoute>, slug = 'ironforge'): Promise<Metadata> {
  const mod = await load();
  expect(typeof mod.generateMetadata, 'route must export generateMetadata').toBe('function');
  return mod.generateMetadata!({ params: { slug } });
}

// Generous: each case dynamic-imports a whole route module and its graph (the
// 291-exercise library, the taxonomy, the workout generator). On a cold,
// contended run — `prebuild` runs this suite before `next build` — the build
// page's first import measured just over vitest's 5s default and failed the
// build. The work is import cost, not the assertion.
const IMPORT_TIMEOUT = 30_000;

describe('a branded gym page carries the GYM name, not the platform name', () => {
  for (const { label, load, section } of SURFACES) {
    it(`titles the ${label} with the gym's name`, async () => {
      const title = titleOf(await metaFor(load));
      expect(title).toContain('Iron Forge');
      expect(title).not.toContain('Live Elevated');
      if (section) expect(title).toBe(`Iron Forge — ${section}`);
      else expect(title).toBe('Iron Forge');
    }, IMPORT_TIMEOUT);
  }

  it("keeps the platform's name out of the description and Open Graph title too", async () => {
    const meta = await metaFor(SURFACES[0].load);
    expect(meta.description ?? '').toContain('Iron Forge');
    expect(meta.description ?? '').not.toContain('Live Elevated');
    expect(String(meta.openGraph?.title ?? '')).toBe('Iron Forge');
    expect(meta.openGraph?.siteName).toBe('Iron Forge');
  }, IMPORT_TIMEOUT);

  it('reads the gym name from the shared tenant directory, not a second hardcoded list', () => {
    // lib/tenant-directory.ts is the one switch /llms.txt and middleware.ts
    // already share; the metadata fallback is its third consumer.
    expect(showcaseTenantName('ironforge')).toBe('Iron Forge');
    expect(showcaseTenantName('IRONFORGE')).toBe('Iron Forge');
    expect(showcaseTenantName('no-such-gym')).toBeNull();
    expect(SHOWCASE_TENANTS.some((t) => t.slug === 'ironforge')).toBe(true);
  });

  it('leaves the platform defaults alone for a slug that is not a gym', async () => {
    expect(await metaFor(SURFACES[0].load, 'no-such-gym')).toEqual({});
  }, IMPORT_TIMEOUT);
});
