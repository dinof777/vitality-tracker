import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { currentTrainer } from '@/lib/current-tenant';
import { tenantEquipmentSlugs } from '@/lib/tenant-equipment';
import { EQUIPMENT_LABEL, SAMPLE_EXERCISES } from '@/lib/exercises';
import { isAdmin } from '@/lib/is-admin';

export const dynamic = 'force-dynamic';

// The platform-admin surfaces — global, across every gym. Distinct from a gym
// OWNER (t.isOwner): admin is the platform gate (isAdmin / ADMIN_EMAILS), owner
// is per-gym. The /admin pages and their APIs enforce isAdmin server-side too;
// hiding the link is convenience + defense-in-depth, not the only gate.
const ADMIN_LINKS = [
  { href: '/admin/exercises', title: 'Exercises', hint: 'Every gym’s exercises + the shared library' },
  { href: '/admin/taxonomy', title: 'Muscle groups & tags', hint: 'The governed vocabulary, all gyms' },
  { href: '/admin/equipment', title: 'Equipment', hint: 'Approve, reject or merge proposed gear' },
];

// Protected trainer home. If the signed-in user belongs to a gym, show its
// management hub; otherwise prompt them to create one (or get invited).
export default async function Dashboard() {
  const t = await currentTrainer();
  const gym = t?.tenant;
  const gear = gym ? await tenantEquipmentSlugs(gym.id) : [];
  const admin = await isAdmin();

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="shell px-5 pb-20 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-label text-accent">LIVE ELEVATED PRO</p>
            <h1 className="text-h1 text-text-primary">{gym ? (gym.branding.brandName ?? gym.name) : 'Dashboard'}</h1>
          </div>
          <UserButton />
        </div>

        {/* Platform admin — global scope, only rendered for an admin. Sits above
            the per-gym content because it spans every gym, not just this one. */}
        {admin && (
          <div className="mb-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
            <p className="mb-1 text-label text-accent">GLOBAL ADMIN</p>
            <p className="mb-3 text-caption text-text-muted">
              The shared library and vocabulary across every gym — not just yours.
            </p>
            <div className="space-y-2">
              {ADMIN_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised"
                >
                  <span>
                    <span className="block text-body font-semibold text-text-primary">{l.title}</span>
                    <span className="block text-caption text-text-muted">{l.hint}</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!gym ? (
          <>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="mb-1 text-h3 font-bold text-text-primary">Set up your gym</p>
              <p className="mb-4 text-body text-text-muted">
                Create your branded space — pick a name and we’ll grab your logo and colors from your website
                automatically.
              </p>
              <Link
                href="/onboarding"
                className="flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent"
              >
                CREATE MY GYM
              </Link>
            </div>
            <p className="mt-3 px-1 text-caption text-text-faint">
              Already invited to a gym? Accept the invite from your email, then refresh.
            </p>
          </>
        ) : (
          <>
            {/* Start here — the three things a new trainer actually needs to do. */}
            <div className="mb-6 rounded-xl border border-accent/40 bg-surface p-4">
              <p className="mb-1 text-label text-accent">START HERE</p>
              <p className="mb-3 text-caption text-text-muted">Your app is live at /g/{gym.slug}.</p>
              <div className="space-y-2">
                <Link
                  href="/dashboard/equipment"
                  className={`flex items-center justify-between rounded-lg border p-3 active:bg-surface-raised ${
                    gear.length ? 'border-border bg-background' : 'border-accent/50 bg-accent/5'
                  }`}
                >
                  <span>
                    <span className="block text-body font-semibold text-text-primary">
                      {gear.length ? '✓ ' : ''}1. Tell us your equipment
                    </span>
                    <span className="block text-caption text-text-muted">
                      {gear.length
                        ? gear.map((e) => EQUIPMENT_LABEL[e]).join(', ')
                        : 'Workouts only use equipment you actually have — set this first'}
                    </span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
                <Link href={`/g/${gym.slug}`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
                  <span>
                    <span className="block text-body font-semibold text-text-primary">2. See your app</span>
                    <span className="block text-caption text-text-muted">Exactly what your clients see — try it out</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
                <Link href={`/g/${gym.slug}/build`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
                  <span>
                    <span className="block text-body font-semibold text-text-primary">3. Build a workout</span>
                    <span className="block text-caption text-text-muted">Generate one, share by link or QR, push to SyncroFit</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
                <Link href="/dashboard/embed" className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
                  <span>
                    <span className="block text-body font-semibold text-text-primary">4. Add it to your website</span>
                    <span className="block text-caption text-text-muted">Copy-paste a button, an embed, or a QR code</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
                <Link href={`/g/${gym.slug}/poster`} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 active:bg-surface-raised">
                  <span>
                    <span className="block text-body font-semibold text-text-primary">5. Print a QR poster</span>
                    <span className="block text-caption text-text-muted">For the front desk or a flyer — scan to open your app</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
              </div>
            </div>

            <p className="mb-2 text-label text-text-faint">MANAGE</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/dashboard/exercises"
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
              >
                <span>
                  <span className="block text-body font-semibold text-text-primary">Exercises</span>
                  <span className="block text-caption text-text-muted">Custom exercises + renames (shared gym library)</span>
                </span>
                <span className="text-text-faint">›</span>
              </Link>

              <Link
                href="/dashboard/equipment"
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
              >
                <span>
                  <span className="block text-body font-semibold text-text-primary">Equipment</span>
                  <span className="block text-caption text-text-muted">Equipment your gym has (shared)</span>
                </span>
                <span className="text-text-faint">›</span>
              </Link>

              <Link
                href="/dashboard/workouts"
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
              >
                <span>
                  <span className="block text-body font-semibold text-text-primary">Your workouts</span>
                  <span className="block text-caption text-text-muted">Saved — re-share, print, embed</span>
                </span>
                <span className="text-text-faint">›</span>
              </Link>

              <Link
                href="/dashboard/clients"
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
              >
                <span>
                  <span className="block text-body font-semibold text-text-primary">Your clients</span>
                  <span className="block text-caption text-text-muted">
                    {t?.isOwner ? 'Every trainer’s clients & engagement' : 'Your clients & engagement'}
                  </span>
                </span>
                <span className="text-text-faint">›</span>
              </Link>

              {t?.isOwner && (
                <>
                  <Link
                    href={`/g/${gym.slug}/branding`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
                  >
                    <span>
                      <span className="block text-body font-semibold text-text-primary">Branding</span>
                      <span className="block text-caption text-text-muted">Logo, colors &amp; name</span>
                    </span>
                    <span className="text-text-faint">›</span>
                  </Link>
                  <Link
                    href="/dashboard/trainers"
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
                  >
                    <span>
                      <span className="block text-body font-semibold text-text-primary">Trainers</span>
                      <span className="block text-caption text-text-muted">Invite &amp; manage your gym’s trainers</span>
                    </span>
                    <span className="text-text-faint">›</span>
                  </Link>
                </>
              )}
            </div>
          </>
        )}

        {/* Not everyone here is a trainer — make the personal app an obvious door. */}
        <div className="mt-8 rounded-xl border border-border bg-surface p-4">
          <p className="text-body font-semibold text-text-primary">Just want workouts for yourself?</p>
          <p className="mb-3 text-caption text-text-muted">
            You don&rsquo;t need a gym set up — the full training app is yours either way.
          </p>
          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent active:scale-[0.98]"
          >
            START TODAY&rsquo;S WORKOUT
          </Link>
          <Link href="/exercises" className="mt-2 block text-center text-caption text-text-muted">
            or browse all {SAMPLE_EXERCISES.length} exercises ›
          </Link>
        </div>
      </main>
    </div>
  );
}
