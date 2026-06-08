'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const I = (path: string) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {path.split('|').map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const TABS: Tab[] = [
  { href: '/', label: 'Home', icon: I('M3 11l9-8 9 8|M5 10v10h14V10') },
  { href: '/exercises', label: 'Exercises', icon: I('M2 12h20|M5 8v8|M8 6v12|M16 6v12|M19 8v8') },
  { href: '/daily5', label: 'Daily 5', icon: I('M20 6L9 17l-5-5') },
  { href: '/settings', label: 'Profile', icon: I('M12 7a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4|M5.5 20c0-3.6 3-5.6 6.5-5.6s6.5 2 6.5 5.6') },
];

// Hidden on the focus screens (active workout) so logging is distraction-free.
const HIDE_ON = ['/workout/'];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-border bg-surface/95 backdrop-blur">
      <ul className="flex h-16 items-stretch pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-accent' : 'text-text-faint'
                }`}
              >
                {tab.icon}
                <span className="text-[0.6875rem] font-semibold tracking-wide">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
