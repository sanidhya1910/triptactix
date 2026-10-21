'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { List, X } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavbarProps {
  showGetStarted?: boolean;
}

const navItems = [
  { href: '/search', label: 'Search' },
  { href: '/itinerary', label: 'AI itinerary' },
  { href: '/planner', label: 'Budget planner' },
  { href: '/dashboard', label: 'My trips' },
  { href: '/ml-dashboard', label: 'Fare data' },
];

export function Navbar({ showGetStarted = true }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on navigation, including back and forward, not only on link clicks.
  useEffect(() => setMobileOpen(false), [pathname]);

  // While open: focus moves into the menu, and Escape closes it and returns focus to the
  // button, so keyboard users are never left behind the overlay.
  useEffect(() => {
    if (!mobileOpen) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMobileOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Active state is derived, not passed in, so it cannot drift from the route.
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
        >
          <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="text-lg font-semibold tracking-[-0.01em] text-ink">Triptactix</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                isActive(item.href)
                  ? 'font-medium text-ink'
                  : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
              )}
            >
              {item.label}
            </Link>
          ))}
          {showGetStarted && (
            <Button asChild size="sm" className="ml-3">
              <Link href="/search">Check a fare</Link>
            </Button>
          )}
        </div>

        <div className="md:hidden">
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" ref={menuRef} className="border-b border-line bg-canvas/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-5 py-4 sm:px-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-3 py-2.5 text-sm transition-colors',
                  isActive(item.href)
                    ? 'bg-surface-sunken font-medium text-ink'
                    : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
                )}
              >
                {item.label}
              </Link>
            ))}
            {showGetStarted && (
              <Button asChild className="mt-3 w-full">
                <Link href="/search" onClick={() => setMobileOpen(false)}>
                  Check a fare
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
