import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brandingToCssVars, fetchTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// Path-based tenant surface: /g/<slug>. Loads the tenant, re-themes the whole
// subtree from its branding, and renders a white-label landing. This is the
// Phase-0 proof that one app serves many branded gyms — the full app routes
// move under this theming wrapper in later phases.
export default async function TenantHome({ params }: { params: { slug: string } }) {
  const tenant = await fetchTenantBySlug(params.slug);
  if (!tenant) notFound();

  const name = tenant.branding.brandName ?? tenant.name;
  const initial = name.trim().charAt(0).toUpperCase();
  const sample = ['Goblet Squat', 'Push-Up', 'KB Swing', 'Plank', 'World’s Greatest Stretch'];

  return (
    <div style={brandingToCssVars(tenant.branding)} className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-16 pt-12">
        {/* Brand */}
        <div className="mb-10 flex items-center gap-3">
          {tenant.branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.logoUrl} alt={name} className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-h3 font-extrabold text-on-accent">
              {initial}
            </span>
          )}
          <span className="text-h3 font-bold text-text-primary">{name}</span>
        </div>

        {/* Hero */}
        <p className="text-label text-accent">YOUR TRAINING APP</p>
        <h1 className="mb-3 text-display text-text-primary">Train at {name}.</h1>
        <p className="mb-6 text-body text-text-muted">
          Your coach’s workouts, on your phone — built around your gear and time, ready to run with a tap.
        </p>
        <button
          type="button"
          className="mb-10 flex h-14 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent transition-all active:scale-[0.97] active:bg-accent-press"
        >
          START TODAY’S WORKOUT
        </button>
        <Link
          href={`/g/${tenant.slug}/exercises`}
          className="mb-10 -mt-7 flex h-12 w-full items-center justify-center rounded-md border border-border text-label text-text-primary active:bg-surface"
        >
          BROWSE THE LIBRARY
        </Link>

        {/* Sample workout card — shows the accent + surface theming */}
        <p className="mb-2 text-caption text-text-muted">TODAY · FULL BODY</p>
        <ul className="space-y-2">
          {sample.map((ex, i) => (
            <li key={ex} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 text-caption font-semibold text-accent">
                {i + 1}
              </span>
              <span className="text-body text-text-primary">{ex}</span>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-center text-caption text-text-faint">
          Powered by Vitality · white-label preview ({tenant.slug})
        </p>
      </main>
    </div>
  );
}
