import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Triptactix stores, what it sends to third parties, and how to clear it.',
};

export default function PrivacyPage() {
  return (
    <>
      <AppShell width="narrow">
        <h1 className="text-display-sm text-ink">Privacy</h1>
        <p className="mt-4 text-sm text-ink-tertiary">Last updated 24 August 2026</p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="text-lg font-semibold text-ink">What we store</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              Saved trips, recent searches and price alerts are kept in your browser&rsquo;s local
              storage on this device. They are not uploaded to a server and are not tied to an
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">What we send to third parties</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              Routes, dates and search terms are sent to our flight-data and language-model
              providers so they can return results. We do not send your name, email address or
              payment details, because we do not collect them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Clearing your data</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              Clearing site data for this domain in your browser settings removes every saved
              trip, search and alert. There is nothing left on our side to delete.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Contact</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              For questions about this policy, reach out through the repository this project is
              published from.
            </p>
          </section>
        </div>
      </AppShell>
      <SiteFooter />
    </>
  );
}
