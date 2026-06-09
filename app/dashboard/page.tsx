import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

// Protected (see middleware). The trainer admin home. Onboarding (create a gym →
// tenant + slug, wired to Clerk Organizations) is the next build; for now this
// proves auth works and points at it.
export default async function Dashboard() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? 'trainer';

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-md px-5 pb-20 pt-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-label text-accent">VITALITY PRO</p>
            <h1 className="text-h1 text-text-primary">Dashboard</h1>
          </div>
          <UserButton />
        </div>

        <p className="mb-6 text-body text-text-muted">
          Signed in as <span className="text-text-primary">{email}</span>.
        </p>

        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-1 text-h3 font-bold text-text-primary">Set up your gym</p>
          <p className="mb-4 text-body text-text-muted">
            Create your branded space — pick a name and we’ll grab your logo and colors from your
            website automatically.
          </p>
          <Link
            href="/onboarding"
            className="flex h-12 w-full items-center justify-center rounded-md bg-accent text-label text-on-accent"
          >
            CREATE MY GYM
          </Link>
        </div>

        <Link
          href="/dashboard/exercises"
          className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
        >
          <span>
            <span className="block text-body font-semibold text-text-primary">Your exercises</span>
            <span className="block text-caption text-text-muted">Add custom moves to your library</span>
          </span>
          <span className="text-text-faint">›</span>
        </Link>

        <Link
          href="/dashboard/equipment"
          className="mt-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4 active:bg-surface-raised"
        >
          <span>
            <span className="block text-body font-semibold text-text-primary">Your equipment</span>
            <span className="block text-caption text-text-muted">Add gear your gym has</span>
          </span>
          <span className="text-text-faint">›</span>
        </Link>
      </main>
    </div>
  );
}
