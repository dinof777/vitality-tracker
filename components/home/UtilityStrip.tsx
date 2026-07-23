import Link from 'next/link';

// The one, singular secondary path to Pro from a consumer-facing screen —
// extracted verbatim from app/page.tsx so /welcome doesn't hand-copy the
// same JSX. See DESIGN.md §7 "Home utility strip". No props: both links are
// static, and this renders identically on every host.
export default function UtilityStrip() {
  return (
    <div className="mb-2 flex items-center justify-end gap-6">
      <Link
        href="/pro"
        className="flex h-12 items-center text-caption text-text-muted active:text-text-primary"
      >
        For gyms &amp; trainers
      </Link>
      <Link
        href="/sign-in"
        className="flex h-12 items-center text-caption font-semibold text-accent active:text-accent-press"
      >
        Trainer log in
      </Link>
    </div>
  );
}
