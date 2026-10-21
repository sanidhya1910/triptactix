'use client';

import { useEffect, useState } from 'react';
import { ArrowClockwise, ChartLineUp, Database, Lightbulb } from '@phosphor-icons/react/ssr';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Stat } from '@/components/ui/stat';
import RouteInsights from '@/components/search/RouteInsights';
import { addDays, parseISODate, toISODate, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { RouteAnalytics, RouteIntelligence } from '@/lib/ml-service';

interface Insights {
  totalRoutes: number;
  totalFlights: number;
  mostPopularRoute: string;
  averagePriceAcrossRoutes: number;
  topAirlines: Array<{ airline: string; marketShare: number }>;
}

const CITIES = ['New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata'];
const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const selectClass =
  'h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15';

type Load<T> = { kind: 'loading' } | { kind: 'ok'; data: T } | { kind: 'error' };

/** Shared fetch with the three states every panel here renders. */
function useJSON<T>(url: string | null): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!url) return;
    const c = new AbortController();
    setState({ kind: 'loading' });
    fetch(url, { signal: c.signal })
      .then(async (r) => (r.ok ? setState({ kind: 'ok', data: await r.json() }) : setState({ kind: 'error' })))
      .catch(() => !c.signal.aborted && setState({ kind: 'error' }));
    return () => c.abort();
  }, [url, attempt]);
  return [state, () => setAttempt((a) => a + 1)];
}

export default function FareDataPage() {
  const [insights, retryInsights] = useJSON<Insights>('/api/ml/insights');
  const [from, setFrom] = useState('New Delhi');
  const [to, setTo] = useState('Mumbai');
  // A month out by default: a date in the past makes every booking-window figure meaningless.
  const [date, setDate] = useState(() => addDays(todayISO(), 30));
  const [route, setRoute] = useState<{ from: string; to: string; date: string } | null>(null);

  const changeFrom = (v: string) => {
    setFrom(v);
    // The two cities can never be the same; move the other one rather than allow it.
    if (v === to) setTo(CITIES.find((c) => c !== v)!);
  };

  return (
    <>
      <AppShell width="wide" className="space-y-10">
        <header className="max-w-2xl">
          <h1 className="text-display-sm text-ink">Fare data</h1>
          <p className="mt-3 text-ink-secondary">
            Patterns in real Indian domestic bookings: what each route costs, which airlines are cheapest, and how far
            ahead fares are lowest.
          </p>
        </header>

        <Overview state={insights} retry={retryInsights} />

        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink">Explore a route</h2>
            <form
              className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setRoute({ from, to, date });
              }}
            >
              <Field label="From" htmlFor="fd-from">
                <select id="fd-from" value={from} onChange={(e) => changeFrom(e.target.value)} className={selectClass}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="To" htmlFor="fd-to">
                <select id="fd-to" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass}>
                  {CITIES.filter((c) => c !== from).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Travel date" htmlFor="fd-date">
                <DatePicker id="fd-date" date={parseISODate(date) ?? undefined} onDateChange={(d) => d && setDate(toISODate(d))} />
              </Field>
              <Button type="submit">Show route</Button>
            </form>
          </CardContent>
        </Card>

        {route && <RouteDetail key={`${route.from}-${route.to}-${route.date}`} {...route} />}

        <HowItWorks />
      </AppShell>
      <SiteFooter />
    </>
  );
}

function Overview({ state, retry }: { state: Load<Insights>; retry: () => void }) {
  if (state.kind === 'loading') {
    return (
      <div className="grid grid-cols-2 gap-8 border-y border-line py-8 md:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neg-fg/25 bg-neg p-5 text-sm text-neg-fg">
        The fare statistics didn’t load.
        <Button variant="outline" size="sm" onClick={retry}>
          <ArrowClockwise className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }
  const d = state.data;
  return (
    <>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-y border-line py-8 md:grid-cols-4 md:divide-x md:divide-line">
        <Stat value={d.totalFlights.toLocaleString('en-IN')} label="Bookings analysed" className="md:pr-8" />
        <Stat value={String(d.totalRoutes)} label="Routes" className="md:px-8" />
        <Stat value={inr(d.averagePriceAcrossRoutes)} label="Average fare, all classes" className="md:px-8" />
        <Stat value={d.mostPopularRoute.replace(' → ', ' to ')} label="Most booked route" className="md:pl-8 [&>span:first-child]:text-xl" />
      </div>
      <section aria-labelledby="share-heading">
        <h2 id="share-heading" className="text-xl font-semibold text-ink">
          Share of bookings by airline
        </h2>
        <ul className="mt-5 max-w-2xl space-y-3">
          {d.topAirlines.map((a) => (
            <li key={a.airline} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span className="text-ink">{a.airline}</span>
              <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${a.marketShare}%` }} />
              </span>
              <span className="text-right font-mono text-ink-secondary">{a.marketShare}%</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function RouteDetail({ from, to, date }: { from: string; to: string; date: string }) {
  const q = new URLSearchParams({ from, to });
  const [analytics] = useJSON<RouteAnalytics>(`/api/ml/analytics?${q}`);
  const [intel] = useJSON<RouteIntelligence>(`/api/ml/route-intel?${q}`);

  return (
    <section aria-labelledby="route-heading" className="space-y-6">
      <h2 id="route-heading" className="text-xl font-semibold text-ink">
        {from} to {to}
      </h2>

      <RouteInsights from={from} to={to} departureDate={date} travelClass="economy" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-ink">At a glance</h3>
            {analytics.kind === 'ok' ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Item label="Average fare" value={inr(analytics.data.averagePrice)} mono />
                <Item label="Range" value={`${inr(analytics.data.minPrice)} to ${inr(analytics.data.maxPrice)}`} mono />
                <Item label="Typical flight time" value={`${Math.floor(analytics.data.averageDuration / 60)}h ${analytics.data.averageDuration % 60}m`} />
                <Item label="Most bookings" value={analytics.data.mostCommonAirline} />
                <Item label="Airlines on this route" value={analytics.data.airlines.join(', ')} wide />
              </dl>
            ) : (
              <PanelState state={analytics.kind} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-ink">Average fare by airline and departure time</h3>
            {intel.kind === 'ok' ? (
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <Bars title="Airline" rows={intel.data.airlinePositioning.map((a) => ({ label: a.airline, value: a.avgPrice }))} />
                <Bars title="Departs" rows={intel.data.timeSlotPricing.map((s) => ({ label: s.slot.replace(/ \(.*\)$/, ''), value: s.avgPrice }))} />
              </div>
            ) : (
              <PanelState state={intel.kind} />
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Item({ label, value, mono, wide }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-xs text-ink-tertiary">{label}</dt>
      <dd className={cn('mt-1 text-ink', mono && 'font-mono [font-variant-numeric:tabular-nums]')}>{value}</dd>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const min = Math.min(...rows.map((r) => r.value));
  return (
    <figure>
      <figcaption className="text-xs font-medium text-ink-secondary">{title}, cheapest first</figcaption>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="text-xs">
            <div className="mb-1 flex justify-between gap-2">
              <span className="truncate text-ink-secondary">{r.label}</span>
              <span className="font-mono text-ink">{inr(r.value)}</span>
            </div>
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div className={cn('h-full rounded-full', r.value === min ? 'bg-pos-fg' : 'bg-brand')} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function PanelState({ state }: { state: 'loading' | 'error' }) {
  return state === 'loading' ? (
    <div className="mt-4 space-y-3" aria-busy="true">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ) : (
    <p className="mt-4 text-sm text-neg-fg">This didn’t load. Choose Show route to try again.</p>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Database,
      title: 'Real bookings',
      body: 'The statistics on this page come from 300,153 domestic bookings between six metros, in economy and business.',
    },
    {
      icon: ChartLineUp,
      title: 'A trained model',
      body: 'Forecasts come from a gradient-boosting model trained on 600,414 bookings from two datasets. It gives a fare and a range that 8 in 10 fares should fall inside.',
    },
    {
      icon: Lightbulb,
      title: 'Kept apart',
      body: 'History tells you what fares were; the forecast tells you what the model expects. When the model isn’t connected, we say so rather than guess.',
    },
  ];
  return (
    <section aria-labelledby="how-heading" className="rounded-lg border border-line bg-surface-sunken p-6">
      <h2 id="how-heading" className="text-xl font-semibold text-ink">
        Where these numbers come from
      </h2>
      <ul className="mt-6 grid gap-8 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
