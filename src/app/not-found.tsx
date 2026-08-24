import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <>
      <AppShell width="narrow">
        <div className="py-12">
          <p className="font-mono text-sm text-ink-tertiary">404</p>
          <h1 className="mt-4 text-display-sm text-ink">This page does not exist.</h1>
          <p className="mt-4 text-ink-secondary prose-measure">
            The link may be out of date, or the trip it pointed at was cleared from this device.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/search">Check a fare</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>

          <nav className="mt-14 border-t border-line pt-8" aria-label="Other pages">
            <h2 className="text-sm font-semibold text-ink">Try one of these</h2>
            <ul className="mt-4 space-y-3">
              {[
                { href: '/itinerary', label: 'Plan a trip with the AI planner' },
                { href: '/dashboard', label: 'Your saved trips and price alerts' },
                { href: '/ml-dashboard', label: 'Fare data behind the predictions' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-secondary underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </AppShell>
      <SiteFooter />
    </>
  );
}
