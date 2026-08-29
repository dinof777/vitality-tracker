import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';
import { tenantMetadata } from '@/lib/tenant-metadata';
import { tenantLibrary } from '@/lib/tenant-library';
import { tenantEquipmentSlugs } from '@/lib/tenant-equipment';
import { generateWorkout } from '@/lib/workout-generator';
import { type Profile } from '@/lib/profile';
import { EQUIPMENT_ORDER } from '@/lib/exercises';
import { hashString, seededRng } from '@/lib/seed';
import TenantNav from '@/components/layout/TenantNav';
import TodaySuggestion, { type PoolExercise } from '@/components/workout/TodaySuggestion';

// ISR, per .design/g-slug-caching/DECISION.md. The 2026-07-25/26 production
// incident (DYNAMIC_SERVER_USAGE 500s on /g/ironforge) was a DB-layer defect,
// not a problem with this render strategy: lib/tenant.ts, lib/tenant-library.ts,
// and lib/tenant-equipment.ts's unstable_cache-wrapped reads were using the
// same `no-store` Neon client as every live read, and a `no-store` fetch
// cannot appear in a route Next is statically generating — see
// lib/db.ts#getSqlCacheable, the fix. Restored here now that those three
// reads use the cacheable driver instead.
//
// A dynamic App Router segment is only ISR-eligible if it exports
// generateStaticParams; `revalidate` alone is silently inert without it (the
// route falls through to full SSR, no CDN cache — see
// app/g/[slug]/exercises/page.tsx, which proved this mechanism first). We
// pre-build zero slugs and rely on dynamicParams=true (the default) so every
// tenant page is generated + cached on first hit, then served from the edge
// until the revalidate window (or an on-demand revalidateTag from an admin
// edit — see app/api/tenants/[slug]/route.ts's PATCH handler).
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

// The tab, the bookmark and the share card carry the GYM's name, not the
// platform's — see lib/tenant-metadata.ts.
export function generateMetadata({ params }: { params: { slug: string } }) {
  return tenantMetadata(params.slug, 'home');
}

// A gym's front door. Everything shown here is REAL: the suggestion below is
// generated from this gym's own library and the equipment they've registered,
// seeded by the date so it's stable for the day.
//
// This Server Component deliberately does NOT read searchParams — that's what
// makes it ISR-eligible (see .design/g-slug-caching/DECISION.md). It renders
// only the canonical default (variant 1, no swaps); the `?v=`/`?sw=` refresh
// and swap interactivity lives entirely client-side in <TodaySuggestion>,
// which reuses these same pure functions in the browser to reproduce the
// identical output for any variant/swap combination the URL carries.
export default async function TenantHome({ params }: { params: { slug: string } }) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();

  const name = tenant.branding.brandName ?? tenant.name;
  const library = await tenantLibrary(tenant.id);
  const gear = await tenantEquipmentSlugs(tenant.id);
  const allowed = gear.length ? gear : EQUIPMENT_ORDER;

  const pool: Exercise[] = library
    .filter((e) => e.equipment && allowed.includes(e.equipment))
    .map((e) => ({
      id: e.id,
      name: e.real_name,
      muscle_group: e.muscle_group,
      default_cue: null,
      equipment: e.equipment,
      image_url: e.image_url,
      created_at: '',
      tags: e.tags,
    }));
  // Trimmed payload actually shipped to the client — default_cue/created_at
  // aren't read by generateWorkout's output consumers here, so they're
  // reconstructed as constants client-side instead of sent over the wire.
  const poolSlim: PoolExercise[] = pool.map(({ id, name: n, muscle_group, equipment, image_url, tags }) => ({
    id,
    name: n,
    muscle_group,
    equipment,
    image_url,
    tags,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const variant = 1;
  const rng = seededRng(hashString(`${tenant.slug}|${today}|${variant}`));
  const profile: Profile = { equipment: allowed, focus: 'full', intensity: 'moderate' };
  const workout = generateWorkout(profile, { focus: 'full', count: 5, pool, rng });

  const byId = new Map(library.map((e) => [e.id, e]));
  // Alias-display names for every exercise a client-side swap could ever land
  // on — the whole pool, not just today's initial 5, since Swap draws its
  // replacement from any pool exercise not already shown.
  const libraryById: Record<string, { name: string }> = {};
  for (const ex of pool) {
    const entry = byId.get(ex.id);
    if (entry) libraryById[ex.id] = { name: entry.name };
  }
  const initialWorkout: PoolExercise[] = workout.map(
    ({ id, name: n, muscle_group, equipment, image_url, tags }) => ({
      id,
      name: byId.get(id)?.name ?? n,
      muscle_group,
      equipment,
      image_url,
      tags,
    }),
  );

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <TenantNav slug={tenant.slug} name={name} logoUrl={tenant.branding.logoUrl} />

      <main className="shell px-5 pb-16 pt-6">
        {/* Hero */}
        <p className="text-label text-accent">YOUR TRAINING APP</p>
        <h1 className="mb-2 text-h2 text-text-primary">Train at {name}.</h1>
        <p className="mb-4 text-body text-text-muted">Your coach’s workouts, built around your equipment and time.</p>
        <Link
          href={`/g/${tenant.slug}/build`}
          className="flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press"
        >
          BUILD A WORKOUT
        </Link>
        <Link
          href={`/g/${tenant.slug}/exercises`}
          className="mb-7 mt-2 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
        >
          BROWSE THE LIBRARY
        </Link>

        {/* A real suggestion from this gym's library — not a placeholder. The
            interactive refresh/swap surface is a client component (see its
            header comment) so this page never reads searchParams. */}
        <TodaySuggestion
          slug={tenant.slug}
          name={name}
          today={today}
          pool={poolSlim}
          libraryById={libraryById}
          initialWorkout={initialWorkout}
          profile={profile}
        />

        <p className="mt-12 text-center text-caption text-text-faint">Powered by Live Elevated</p>
      </main>
    </div>
  );
}
