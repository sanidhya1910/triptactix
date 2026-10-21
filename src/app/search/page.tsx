'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AirplaneTilt, ArrowClockwise, ArrowSquareOut, Bed, PlugsConnected, Star } from '@phosphor-icons/react/ssr';
import SearchForm, { type SearchQuery } from '@/components/search/SearchForm';
import RouteInsights from '@/components/search/RouteInsights';
import FareCalendar from '@/components/charts/FareCalendar';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { isISODate } from '@/lib/dates';
import { recordSearch } from '@/lib/saved-trips';
import type { SearchFlight, SearchResponse } from '@/app/api/search/route';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const mono = 'font-mono [font-variant-numeric:tabular-nums]';
const duration = (m: number) => (m > 0 ? `${Math.floor(m / 60)}h ${m % 60}m` : '');

const CLASSES = ['economy', 'premium', 'business', 'first'] as const;

/** Reads a search from the URL, so a search can be linked to, shared and re-run. */
function queryFromURL(p: URLSearchParams): SearchQuery | null {
  const from = p.get('from')?.trim();
  const to = p.get('to')?.trim();
  const date = p.get('date') ?? '';
  if (!from || !to || !isISODate(date)) return null;
  const ret = p.get('return') ?? '';
  const cls = p.get('class') as SearchQuery['travelClass'];
  const n = (k: string, def: number, min: number) => Math.min(9, Math.max(min, Number(p.get(k)) || def));
  return {
    from,
    to,
    departureDate: date,
    returnDate: isISODate(ret) && ret >= date ? ret : undefined,
    adults: n('adults', 1, 1),
    children: n('children', 0, 0),
    infants: n('infants', 0, 0),
    travelClass: CLASSES.includes(cls) ? cls : 'economy',
  };
}

function queryToURL(q: SearchQuery): string {
  const p = new URLSearchParams({ from: q.from, to: q.to, date: q.departureDate });
  if (q.returnDate) p.set('return', q.returnDate);
  if (q.travelClass !== 'economy') p.set('class', q.travelClass);
  if (q.adults !== 1) p.set('adults', String(q.adults));
  if (q.children) p.set('children', String(q.children));
  if (q.infants) p.set('infants', String(q.infants));
  return p.toString();
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; query: SearchQuery }
  | { kind: 'done'; query: SearchQuery; data: SearchResponse }
  | { kind: 'failed'; query: SearchQuery; message: string };

function SearchPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fromURL = useMemo(() => queryFromURL(new URLSearchParams(params.toString())), [params]);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const resultsRef = useRef<HTMLDivElement>(null);
  // Bumps on every search so a slow earlier response can never overwrite a newer one.
  const seq = useRef(0);

  const run = useCallback(async (query: SearchQuery) => {
    const id = ++seq.current;
    // A new search replaces the old results at once, rather than leaving the previous
    // route's flights on screen under the new route's charts.
    setState({ kind: 'loading', query });
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      const data = await res.json().catch(() => null);
      if (id !== seq.current) return;
      if (!res.ok || !data?.success) {
        setState({ kind: 'failed', query, message: data?.error ?? 'The search didn’t go through.' });
        return;
      }
      setState({ kind: 'done', query, data });
      const prices = (data as SearchResponse).flights.items.map((f) => f.price);
      recordSearch({
        origin: query.from,
        destination: query.to,
        departureDate: query.departureDate,
        travelClass: query.travelClass,
        lowestPrice: prices.length ? Math.min(...prices) : undefined,
      });
    } catch {
      if (id === seq.current) setState({ kind: 'failed', query, message: 'We couldn’t reach the search service. Check your connection and try again.' });
    }
  }, []);

  // The URL is the source of truth: searching updates it, and opening a link runs it.
  const urlKey = fromURL ? queryToURL(fromURL) : '';
  useEffect(() => {
    if (fromURL) void run(fromURL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  const search = (q: SearchQuery) => {
    const next = queryToURL(q);
    if (next === urlKey) void run(q); // same search again: the URL will not change
    else router.push(`${pathname}?${next}`, { scroll: false });
  };

  // Move focus to the results once they arrive, so keyboard and screen-reader users land on them.
  useEffect(() => {
    if (state.kind === 'done' || state.kind === 'failed') resultsRef.current?.focus({ preventScroll: false });
  }, [state.kind]);

  return (
    <>
      <AppShell width="wide">
        <header className="max-w-2xl">
          <h1 className="text-display-sm text-ink">Find a flight</h1>
          <p className="mt-3 text-ink-secondary">
            Live fares from Google Flights, set against what the route has cost before.
          </p>
        </header>

        <div className="mt-10">
          {/* Remount with the URL's search so the form shows what was searched. */}
          <SearchForm key={urlKey} initial={fromURL ?? undefined} onSearch={search} loading={state.kind === 'loading'} />
        </div>

        <div ref={resultsRef} tabIndex={-1} className="outline-none" aria-live="polite">
          {state.kind === 'loading' && (
            <div className="mt-14 space-y-5" aria-busy="true">
              <span className="sr-only">Searching for flights</span>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-40 w-full" />
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {state.kind === 'failed' && (
            <div role="alert" className="mt-14 rounded-lg border border-neg-fg/25 bg-neg p-6">
              <h2 className="font-semibold text-neg-fg">The search didn’t work</h2>
              <p className="mt-1 text-sm text-neg-fg">{state.message}</p>
              <Button className="mt-4" variant="outline" onClick={() => void run(state.query)}>
                <ArrowClockwise className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {state.kind === 'done' && <Results query={state.query} data={state.data} onPickDate={(date) => search({ ...state.query, departureDate: date })} />}

          {state.kind === 'idle' && (
            <EmptyState
              className="mt-14"
              icon={<AirplaneTilt className="h-6 w-6" />}
              title="Pick a route to start"
              description="Enter where you are flying from and to. Route history covers flights between Delhi, Mumbai, Bengaluru, Chennai, Hyderabad and Kolkata."
            />
          )}
        </div>
      </AppShell>
      <SiteFooter />
    </>
  );
}

function Results({ query, data, onPickDate }: { query: SearchQuery; data: SearchResponse; onPickDate: (date: string) => void }) {
  const { flights, hotels, history } = data;
  const sorted = [...flights.items].sort((a, b) => a.price - b.price);
  const lowest = sorted[0]?.price;
  const travellers = query.adults + query.children + query.infants;

  return (
    <div className="mt-14 space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-ink">
          {query.from} to {query.to}
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {new Date(`${query.departureDate}T00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          {query.returnDate && `, back ${new Date(`${query.returnDate}T00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`}
          {' · '}
          {travellers} {travellers === 1 ? 'traveller' : 'travellers'}
        </p>
      </div>

      <RouteInsights from={query.from} to={query.to} departureDate={query.departureDate} travelClass={query.travelClass} lowestFare={lowest} />
      <FareCalendar
        sourceCity={query.from}
        destinationCity={query.to}
        travelClass={query.travelClass}
        selectedDate={query.departureDate}
        onSelectDate={onPickDate}
      />

      <section aria-labelledby="flights-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="flights-heading" className="text-xl font-semibold text-ink">
            {flights.status === 'ok' ? `${sorted.length} ${sorted.length === 1 ? 'flight' : 'flights'}` : 'Flights'}
          </h2>
          {flights.status === 'ok' && flights.bookingUrl && (
            <a
              href={flights.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand underline-offset-4 hover:underline"
            >
              See this search on Google Flights
              <ArrowSquareOut className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {flights.status === 'ok' ? (
          sorted.length === 0 ? (
            <EmptyState
              as="h3"
              className="mt-6"
              icon={<AirplaneTilt className="h-6 w-6" />}
              title="No flights on that day"
              description="Try a day either side, or choose a day from the forecast calendar above if it is showing."
            />
          ) : (
            <ul className="mt-6 space-y-4">
              {sorted.map((f) => (
                <FlightRow key={f.id} flight={f} bookingUrl={flights.bookingUrl} lowest={f.price === lowest} />
              ))}
            </ul>
          )
        ) : (
          <NotConnected
            className="mt-6"
            title={flights.message ?? 'Live fares aren’t available'}
            body={
              history
                ? `Past bookings on this route averaged ${inr(history.window?.averagePrice ?? history.averagePrice)}${
                    history.window ? ` when booked ${history.window.label} ahead` : ''
                  }, ranging from ${inr(history.minPrice)} to ${inr(history.maxPrice)}. Those are past fares, not today’s.`
                : 'There is no booking history for this route either, so there is nothing to show yet.'
            }
          />
        )}
      </section>

      <section aria-labelledby="hotels-heading" className="pt-4">
        <h2 id="hotels-heading" className="text-xl font-semibold text-ink">
          Hotels in {query.to}
        </h2>
        {hotels.status === 'ok' ? (
          hotels.items.length === 0 ? (
            <p className="mt-4 text-sm text-ink-secondary">No hotels came back for those dates.</p>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hotels.items.map((h) => (
                <li key={h.id} className="flex">
                  <Card className="flex w-full flex-col">
                    <CardContent className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium leading-snug text-ink">{h.name}</h3>
                        {h.rating !== null && (
                          <span className={`${mono} flex shrink-0 items-center gap-1 text-sm text-ink`} title={h.reviews ? `${h.reviews} reviews` : undefined}>
                            <Star className="h-3.5 w-3.5 text-caution-fg" weight="fill" aria-hidden />
                            {h.rating.toFixed(1)}
                            <span className="sr-only">out of 5</span>
                          </span>
                        )}
                      </div>
                      {h.area && <p className="mt-2 text-sm text-ink-secondary">Near {h.area}</p>}
                      {h.amenities.length > 0 && (
                        <ul className="mt-4 flex flex-wrap gap-1.5">
                          {h.amenities.slice(0, 4).map((a) => (
                            <li key={a}>
                              <Badge variant="neutral">{a}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                        <div>
                          {h.ratePerNight !== null ? (
                            <>
                              <p className={`${mono} text-lg text-ink`}>{inr(h.ratePerNight)}</p>
                              <p className="text-xs text-ink-tertiary">per night</p>
                            </>
                          ) : (
                            <p className="text-xs text-ink-tertiary">Price on request</p>
                          )}
                        </div>
                        {h.link && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={h.link} target="_blank" rel="noopener noreferrer">
                              View
                              <ArrowSquareOut className="h-3.5 w-3.5" />
                              <span className="sr-only">{h.name}, opens in a new tab</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )
        ) : (
          <NotConnected
            className="mt-6"
            icon={<Bed className="h-4 w-4" />}
            title={hotels.status === 'not_connected' ? 'Live hotel prices aren’t connected yet' : (hotels.message ?? 'Hotels didn’t load')}
            body="We only show hotels with real prices, so there is nothing here until live results are available."
          />
        )}
      </section>
    </div>
  );
}

function FlightRow({ flight: f, bookingUrl, lowest }: { flight: SearchFlight; bookingUrl: string | null; lowest: boolean }) {
  const insight = f.historyInsight;
  const tone = !insight
    ? null
    : insight.comparedToAverage <= -10
      ? ('positive' as const)
      : insight.comparedToAverage >= 10
        ? ('negative' as const)
        : ('neutral' as const);
  // Times are the airports' local times, shown exactly as Google Flights gives them.
  const nextDay = f.arriveDate && f.departDate && f.arriveDate > f.departDate;

  return (
    <li>
      <Card className={lowest ? 'border-pos-fg/35' : undefined}>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken">
                <AirplaneTilt className="h-5 w-5 text-ink-secondary" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{f.airline}</p>
                {f.flightNumber && <p className="font-mono text-xs text-ink-tertiary">{f.flightNumber}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className={`${mono} text-lg text-ink`}>{f.departTime}</p>
              <div className="flex-1 text-center">
                <div className="h-px bg-line" />
                <p className="mt-1.5 text-xs text-ink-tertiary">
                  {duration(f.durationMinutes)}
                  {` · ${f.stops === 0 ? 'Non-stop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}`}
                </p>
              </div>
              <p className={`${mono} text-lg text-ink`}>
                {f.arriveTime}
                {nextDay && (
                  <sup className="ml-0.5 text-xs text-caution-fg" title="Arrives the next day">
                    +1
                  </sup>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-6 border-t border-line pt-5 lg:min-w-[13rem] lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="lg:text-right">
              <p className={`${mono} text-2xl text-ink`}>{inr(f.price)}</p>
              {insight && tone && (
                <Badge variant={tone} className="mt-2" title={`Compared with ${insight.bookings.toLocaleString('en-IN')} past bookings`}>
                  {insight.comparedToAverage === 0
                    ? 'Same as past average'
                    : `${Math.abs(insight.comparedToAverage)}% ${insight.comparedToAverage < 0 ? 'below' : 'above'} past average`}
                </Badge>
              )}
            </div>
            {bookingUrl && (
              <Button variant={lowest ? 'brand' : 'default'} className="shrink-0" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  Book
                  <span className="sr-only">
                    {' '}
                    {f.airline} {f.departTime}, on Google Flights, opens in a new tab
                  </span>
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function NotConnected({ title, body, className, icon }: { title: string; body: string; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={`flex gap-3 rounded-lg border border-line bg-surface-sunken p-5 ${className ?? ''}`}>
      <span className="mt-0.5 shrink-0 text-ink-tertiary">{icon ?? <PlugsConnected className="h-4 w-4" />}</span>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-secondary">{body}</p>
      </div>
    </div>
  );
}

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary for this page to stay statically rendered.
  return (
    <Suspense
      fallback={
        <AppShell width="wide">
          <h1 className="text-display-sm text-ink">Find a flight</h1>
          <Skeleton className="mt-10 h-96 w-full" />
        </AppShell>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
