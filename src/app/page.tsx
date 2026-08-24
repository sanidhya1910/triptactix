import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MagnifyingGlass, TrendUp, Compass } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Section, SectionHeading } from '@/components/ui/section';
import { Stat } from '@/components/ui/stat';
import { Reveal } from '@/components/ui/reveal';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: 'Book at the right price, not the panic price',
  description:
    'Fare predictions trained on 600,000 real bookings across six Indian metros, plus flight and hotel comparison and AI-generated itineraries.',
};

const proof = [
  { value: '600K+', label: 'Fares in the training set' },
  { value: '6', label: 'Metro routes covered' },
  { value: '0.97', label: 'Model R² on held-out fares' },
  { value: '<1s', label: 'Median prediction time' },
];

/** Sample output, not live pricing. Illustrates the fare-level scale. */
const fareStrip = [
  { day: 'Mon', price: '4,180', level: 'pos' },
  { day: 'Tue', price: '4,650', level: 'pos' },
  { day: 'Wed', price: '6,240', level: 'caution' },
  { day: 'Thu', price: '6,890', level: 'caution' },
  { day: 'Fri', price: '9,470', level: 'neg' },
  { day: 'Sat', price: '8,120', level: 'neg' },
  { day: 'Sun', price: '5,330', level: 'caution' },
] as const;

const levelClass = {
  pos: 'bg-pos text-pos-fg',
  caution: 'bg-caution text-caution-fg',
  neg: 'bg-neg text-neg-fg',
} as const;

const steps = [
  {
    verb: 'Search',
    copy: 'Pick a route and your dates. Six metro pairs are covered by the model today.',
  },
  {
    verb: 'Compare',
    copy: 'Flights, trains and hotels for the same trip, priced side by side.',
  },
  {
    verb: 'Plan',
    copy: 'Turn the booking into a day-by-day itinerary with costs attached.',
  },
];

const sampleDay = [
  { time: '08:30', name: 'Fort Aguada, north end', tag: 'Sightseeing', cost: '₹0' },
  { time: '12:15', name: 'Lunch at Gunpowder, Assagao', tag: 'Food', cost: '₹1,400' },
  { time: '16:00', name: 'Sunset kayak, Nerul river', tag: 'Outdoors', cost: '₹2,200' },
];

export default function HomePage() {
  return (
    <>
      <Navbar showGetStarted={false} />

      <main id="main">
        {/* 1. Hero: asymmetric split, image carries the right half. */}
        <section className="px-5 pb-16 pt-24 sm:px-8 md:pb-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:min-h-[34rem] lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <h1 className="text-display pb-1 leading-[1.1] text-ink">
                Book at the right price,
                <br />
                not the <span className="italic">panic</span> price.
              </h1>

              <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-secondary">
                Fare predictions trained on 600,000 real bookings across six Indian metros. Plus
                AI itineraries for the rest.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/search">
                    Check a fare
                    <ArrowRight className="h-4 w-4" weight="bold" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/itinerary">Plan a trip</Link>
                </Button>
              </div>
            </div>

            {/* Offset breaks the symmetry of a straight 50/50 split. */}
            <div className="lg:col-span-6 lg:col-start-7 lg:mt-12">
              <div className="relative overflow-hidden rounded-xl border border-line">
                <Image
                  src="/hero.jpg"
                  alt="A villa terrace and infinity pool above turquoise shallows"
                  width={1400}
                  height={1050}
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Proof band: the one genuinely differentiated thing this product has. */}
        <section className="border-y border-line bg-surface-sunken px-5 py-12 sm:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 md:divide-x md:divide-line">
            {proof.map((item, i) => (
              <Reveal key={item.label} index={i} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <Stat value={item.value} label={item.label} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* 3. Capabilities: three items, exactly three cells, deliberately unequal. */}
        <Section width="wide">
          <SectionHeading
            title="Three tools, one trip."
            lead="Fare prediction is the core of this. Search and itinerary planning sit on top of it."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-5 lg:grid-rows-2">
            {/* Tall cell, carries the real data visual. */}
            <Reveal className="lg:col-span-3 lg:row-span-2">
              <article className="flex h-full flex-col rounded-lg border border-line bg-surface p-8 md:p-10">
                <TrendUp className="h-6 w-6 text-brand" weight="bold" />
                <h3 className="mt-6 text-xl font-semibold text-ink">Know before you book</h3>
                <p className="mt-3 max-w-md leading-relaxed text-ink-secondary">
                  The model scores today&rsquo;s fare against what it expects for your route and
                  date, then tells you whether to book now or hold.
                </p>

                <div className="mt-auto pt-10">
                  <div className="grid grid-cols-7 gap-1.5">
                    {fareStrip.map((d) => (
                      <div
                        key={d.day}
                        className={`rounded-md px-1 py-3 text-center ${levelClass[d.level]}`}
                      >
                        <div className="text-[0.625rem] font-medium uppercase tracking-[0.06em] opacity-70">
                          {d.day}
                        </div>
                        <div className="mt-1 font-mono text-xs font-medium [font-variant-numeric:tabular-nums]">
                          {d.price}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink-tertiary">
                    Sample output for Delhi to Goa. Green is below the predicted fare, red is
                    above.
                  </p>
                </div>
              </article>
            </Reveal>

            {/* Tinted cell. */}
            <Reveal index={1} className="lg:col-span-2">
              <article className="flex h-full flex-col rounded-lg border border-line bg-brand-soft p-8">
                <MagnifyingGlass className="h-6 w-6 text-brand" weight="bold" />
                <h3 className="mt-6 text-xl font-semibold text-ink">Compare in one place</h3>
                <p className="mt-3 leading-relaxed text-ink-secondary">
                  Flights, trains and hotels for the same trip, priced side by side instead of
                  across six open tabs.
                </p>
              </article>
            </Reveal>

            {/* Photographic cell. */}
            <Reveal index={2} className="lg:col-span-2">
              <article className="relative flex h-full min-h-[15rem] flex-col justify-end overflow-hidden rounded-lg border border-line bg-ink p-8">
                <Image
                  src="https://picsum.photos/seed/triptactix-itinerary-coast/900/700"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 30vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/10" />
                <div className="relative">
                  <Compass className="h-6 w-6 text-surface" weight="bold" />
                  <h3 className="mt-5 text-xl font-semibold text-surface">
                    Days planned around you
                  </h3>
                  <p className="mt-2 leading-relaxed text-surface/80">
                    Budget, pace and interests in. A day-by-day plan with costs attached out.
                  </p>
                </div>
              </article>
            </Reveal>
          </div>
        </Section>

        {/* 4. How it works: three verbs on a rail. No step numbers. */}
        <Section tone="sunken" width="wide" className="border-y border-line">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <SectionHeading title="How a trip comes together" className="lg:col-span-4" />
            <ol className="lg:col-span-8">
              {steps.map((step, i) => (
                <Reveal as="li" key={step.verb} index={i}>
                  <div className="flex flex-col gap-2 border-t border-line py-7 sm:flex-row sm:gap-10">
                    <h3 className="w-32 shrink-0 text-lg font-semibold text-ink">{step.verb}</h3>
                    <p className="leading-relaxed text-ink-secondary prose-measure">{step.copy}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </Section>

        {/* 5. Sample output, rendered in the real primitives rather than mocked. */}
        <Section width="wide">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading
                title="A day, already costed"
                lead="Every activity the planner returns carries a time, a category and a rupee figure, so the budget adds up before you leave."
              />
              <Button variant="outline" className="mt-8" asChild>
                <Link href="/itinerary">
                  Plan a trip
                  <ArrowRight className="h-4 w-4" weight="bold" />
                </Link>
              </Button>
            </div>

            <Reveal className="lg:col-span-7">
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="flex items-baseline justify-between border-b border-line px-6 py-4">
                  <h3 className="font-semibold text-ink">Day 2, north Goa</h3>
                  <span className="font-mono text-sm text-ink-secondary [font-variant-numeric:tabular-nums]">
                    ₹3,600
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {sampleDay.map((item) => (
                    <li
                      key={item.time}
                      className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-5"
                    >
                      <span className="w-14 font-mono text-sm text-ink-tertiary [font-variant-numeric:tabular-nums]">
                        {item.time}
                      </span>
                      <span className="min-w-0 flex-1 text-ink">{item.name}</span>
                      <Badge variant="neutral">{item.tag}</Badge>
                      <span className="w-20 text-right font-mono text-sm text-ink [font-variant-numeric:tabular-nums]">
                        {item.cost}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* 6. Closing CTA reuses the hero's primary label: one intent, one wording. */}
        <Section tone="sunken" width="narrow" className="border-t border-line">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-display-sm text-ink">Start with a route you already fly.</h2>
              <p className="mt-3 text-ink-secondary">
                Delhi, Mumbai, Bengaluru, Kolkata, Hyderabad and Chennai are live.
              </p>
            </div>
            <Button size="lg" className="shrink-0" asChild>
              <Link href="/search">
                Check a fare
                <ArrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </Button>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
