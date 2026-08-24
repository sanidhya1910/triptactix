import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms',
  description:
    'How to read fare predictions and generated itineraries, and what this service does not do.',
};

export default function TermsPage() {
  return (
    <>
      <AppShell width="narrow">
        <h1 className="text-display-sm text-ink">Terms</h1>
        <p className="mt-4 text-sm text-ink-tertiary">Last updated 24 August 2026</p>

        <div className="mt-12 space-y-10">
          <section>
            <h2 className="text-lg font-semibold text-ink">Fare predictions are estimates</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              Predicted fares come from a model trained on historical bookings. They describe what
              a fare is likely to do, not what it will do. Airlines reprice for reasons the model
              cannot see. Treat every prediction as one input into your decision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Itineraries are drafts</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              Generated itineraries are starting points. Opening hours, prices and availability
              change. Confirm anything time-sensitive or costly with the venue before you rely
              on it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">Availability</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              This service depends on third-party flight, hotel and language-model APIs. When one
              is unavailable, parts of the product fall back to estimates, which are labelled as
              such where they appear.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">No booking relationship</h2>
            <p className="mt-3 leading-relaxed text-ink-secondary prose-measure">
              Triptactix compares and predicts prices. It does not sell tickets, take payment, or
              act as a party to any booking you make elsewhere.
            </p>
          </section>
        </div>
      </AppShell>
      <SiteFooter />
    </>
  );
}
