import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { currentTrainer } from '@/lib/current-tenant';

export const dynamic = 'force-dynamic';

// Protected trainer home. If the signed-in user belongs to a gym, show its
// management hub; otherwise prompt them to create one (or get invited).
export default async function Dashboard() {
  const t = await currentTrainer();
  const gym = t?.tenant;

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-label text-accent">VITALITY PRO</p>
            <h1 className="text-h1 text-text-primary">{gym ? (gym.branding.brandName ?? gym.name) : 'Dashboard'}</h1>
          </div>
          <UserButton />
        </div>

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
            <Link href={`/g/${gym.slug}`} className="mb-5 block text-caption text-accent">
              View your gym’s app — /g/{gym.slug} ›
            </Link>

            <Link
              href="/dashboard/exercises"
              className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
            >
              <span>
                <span className="block text-body font-semibold text-text-primary">Exercises</span>
                <span className="block text-caption text-text-muted">Custom moves + renames (shared gym library)</span>
              </span>
              <span className="text-text-faint">›</span>
            </Link>

            <Link
              href="/dashboard/equipment"
              className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
            >
              <span>
                <span className="block text-body font-semibold text-text-primary">Equipment</span>
                <span className="block text-caption text-text-muted">Gear your gym has (shared)</span>
              </span>
              <span className="text-text-faint">›</span>
            </Link>

            <Link
              href="/dashboard/clients"
              className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
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
                  className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
                >
                  <span>
                    <span className="block text-body font-semibold text-text-primary">Branding</span>
                    <span className="block text-caption text-text-muted">Logo, colors &amp; name</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
                <Link
                  href="/dashboard/trainers"
                  className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
                >
                  <span>
                    <span className="block text-body font-semibold text-text-primary">Trainers</span>
                    <span className="block text-caption text-text-muted">Invite &amp; manage your gym’s trainers</span>
                  </span>
                  <span className="text-text-faint">›</span>
                </Link>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
