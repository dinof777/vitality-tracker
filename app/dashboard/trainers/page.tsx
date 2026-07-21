'use client';

import Link from 'next/link';
import { OrganizationProfile, OrganizationSwitcher } from '@clerk/nextjs';

// Manage the gym's trainers via Clerk Organizations (invite by email, set roles,
// remove). Everyone invited becomes a member of the gym's org → resolves to the
// same tenant. The owner (admin) sees every trainer's clients & workouts; each
// trainer sees only their own.
export default function Trainers() {
  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-10">
        <Link href="/dashboard" className="text-caption text-text-muted">
          ← Dashboard
        </Link>
        <h1 className="mb-1 mt-2 text-h1 text-text-primary">Trainers</h1>
        <p className="mb-4 text-body text-text-muted">
          Invite trainers to your gym and manage access. Each trainer sees only their own clients &amp; workouts; you,
          the owner, see everyone’s. The gym’s brand, moves, and equipment are shared.
        </p>
        <div className="mb-4">
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard/trainers" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <OrganizationProfile routing="hash" />
        </div>
      </main>
    </div>
  );
}
