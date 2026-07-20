'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Persistent navigation for a gym's surfaces. Previously every /g/<slug> page was
// a dead end joined by ad-hoc back links — this gives clients one consistent way
// to move between Today, Build and the Library.
export default function TenantNav({ slug, name, logoUrl }: { slug: string; name: string; logoUrl?: string | null }) {
  const pathname = usePathname();
  const base = `/g/${slug}`;
  const initial = name.trim().charAt(0).toUpperCase();

  const tabs = [
    { href: base, label: 'Today' },
    { href: `${base}/build`, label: 'Build' },
    { href: `${base}/exercises`, label: 'Library' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="shell px-5">
        <Link href={base} className="flex items-center gap-2 pb-2 pt-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="h-7 w-7 rounded-md object-contain" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-caption font-extrabold text-on-accent">
              {initial}
            </span>
          )}
          <span className="truncate text-body font-bold text-text-primary">{name}</span>
        </Link>
        <nav className="flex gap-1">
          {tabs.map((t) => {
            const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-caption font-semibold transition-colors ${
                  active ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
