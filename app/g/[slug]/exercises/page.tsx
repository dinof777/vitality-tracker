import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';
import { tenantMetadata } from '@/lib/tenant-metadata';
import TenantNav from '@/components/layout/TenantNav';
import { tenantLibrary } from '@/lib/tenant-library';
import { EQUIPMENT_LABEL, EQUIPMENT_ORDER } from '@/lib/exercises';
import ExerciseThumb from '@/components/workout/ExerciseThumb';
import type { Equipment } from '@/lib/database.types';

// ISR, per .design/g-slug-caching/DECISION.md — restored after the
// 2026-07-25/26 production incident (DYNAMIC_SERVER_USAGE 500s), which was a
// DB-layer defect (lib/tenant.ts / lib/tenant-library.ts's unstable_cache-
// wrapped reads were using the `no-store` Neon client) not a problem with
// this render strategy. Fixed in lib/db.ts#getSqlCacheable — see
// app/g/[slug]/page.tsx's matching comment for the full explanation.
//
// A dynamic App Router segment is only ISR-eligible if it exports generateStaticParams;
// `revalidate` alone is silently inert without it (the route falls through to full SSR, no CDN
// cache). We pre-build zero slugs and rely on dynamicParams=true (the default) so every tenant
// page is generated + cached on first hit, then served from the edge until the revalidate window
// (or an on-demand revalidateTag from an admin edit). This is the piece that makes the
// unstable_cache DB layer observable as a cache HIT.
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

// The gym's name in the tab, not the platform's — see lib/tenant-metadata.ts.
export function generateMetadata({ params }: { params: { slug: string } }) {
  return tenantMetadata(params.slug, 'exercises');
}

// Public, themed: the gym's effective library (global + their custom moves, with
// their local renames applied). The first tenant-aware content surface.
export default async function TenantExercises({ params }: { params: { slug: string } }) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();
  const exercises = await tenantLibrary(tenant.id);
  const name = tenant.branding.brandName ?? tenant.name;
  const customCount = exercises.filter((e) => e.is_custom).length;

  // Core equipment groups (canonical order) + any custom-equipment groups (the
  // gym's own gear) appended after.
  const coreGroups = EQUIPMENT_ORDER.map((eq) => ({
    label: EQUIPMENT_LABEL[eq as Equipment],
    items: exercises.filter((e) => e.equipment === eq),
  })).filter((g) => g.items.length > 0);
  const customByName = new Map<string, typeof exercises>();
  for (const e of exercises) {
    if (!e.equipment && e.custom_equip_name) {
      const arr = customByName.get(e.custom_equip_name) ?? [];
      arr.push(e);
      customByName.set(e.custom_equip_name, arr);
    }
  }
  const customGroups = Array.from(customByName.entries()).map(([label, items]) => ({ label, items }));
  const groups = [...coreGroups, ...customGroups];

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <TenantNav slug={tenant.slug} name={name} logoUrl={tenant.branding.logoUrl} />

      <main className="shell px-5 pb-16 pt-10">
        <Link href={`/g/${tenant.slug}`} className="text-caption text-text-muted">
          ← {name}
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Exercise library</h1>
        <p className="mb-6 text-body text-text-muted">
          {exercises.length} exercises{customCount > 0 ? ` · ${customCount} custom to ${name}` : ''}.
        </p>

        {groups.map((g) => (
          <section key={g.label} className="mb-6">
            <p className="mb-2 text-label text-accent">{g.label.toUpperCase()}</p>
            <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0 lg:grid-cols-3">
              {g.items.map((ex) => (
                <li key={ex.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <ExerciseThumb equipment={ex.equipment} imageUrl={ex.image_url} name={ex.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-text-primary">{ex.name}</span>
                    <span className="block text-caption text-text-muted">
                      {[ex.muscle_group, ex.custom_equip_name ?? (ex.equipment && EQUIPMENT_LABEL[ex.equipment])]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {ex.is_custom && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-caption font-semibold text-accent">
                      custom
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-8 text-center text-caption text-text-faint">Powered by Live Elevated</p>
      </main>
    </div>
  );
}
