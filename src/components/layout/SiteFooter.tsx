import Link from 'next/link';
import Image from 'next/image';

const product = [
  { href: '/search', label: 'Search and compare' },
  { href: '/itinerary', label: 'AI planner' },
  { href: '/dashboard', label: 'My trips' },
  { href: '/ml-dashboard', label: 'Fare data' },
];

const legal = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

/**
 * Light footer. The page commits to one theme, so this does not invert to a
 * black band the way the previous footer did.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-sunken px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="text-lg font-semibold tracking-[-0.01em] text-ink">Triptactix</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-secondary">
              Fare prediction and trip planning for domestic travel in India.
            </p>
          </div>

          <nav className="md:col-span-3 md:col-start-8" aria-labelledby="footer-product">
            <h2 id="footer-product" className="text-sm font-semibold text-ink">
              Product
            </h2>
            <ul className="mt-4 space-y-3">
              {product.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-secondary transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="text-sm font-semibold text-ink">
              Legal
            </h2>
            <ul className="mt-4 space-y-3">
              {legal.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-secondary transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-line pt-8">
          <p className="text-sm text-ink-tertiary">
            &copy; {new Date().getFullYear()} Triptactix. Fare predictions are estimates, not
            guarantees.
          </p>
        </div>
      </div>
    </footer>
  );
}
