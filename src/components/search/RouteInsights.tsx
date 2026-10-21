'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BellSimple, ChartBar, Info } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { addAlert } from '@/lib/saved-trips';
import { cn } from '@/lib/utils';
import type { RouteIntelligence } from '@/lib/ml-service';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const mono = 'font-mono [font-variant-numeric:tabular-nums]';

interface Forecast {
  predictedPrice: number;
  interval: { low: number; high: number } | null;
}

type ForecastState = { kind: 'loading' } | { kind: 'ok'; data: Forecast } | { kind: 'unavailable' } | { kind: 'error' };
type HistoryState = { kind: 'loading' } | { kind: 'ok'; data: RouteIntelligence } | { kind: 'none' } | { kind: 'error' };

interface RouteInsightsProps {
  from: string;
  to: string;
  departureDate: string;
  travelClass: string;
  /** Lowest live fare found, when there is one. */
  lowestFare?: number;
}

/**
 * What a route has cost before, and, separately, what the model expects it to cost.
 * The two are kept visually and verbally apart: history is real bookings, the forecast
 * exists only when the model is connected. Nothing here is invented when data is missing.
 */
export default function RouteInsights({ from, to, departureDate, travelClass, lowestFare }: RouteInsightsProps) {
  const [history, setHistory] = useState<HistoryState>({ kind: 'loading' });
  const [forecast, setForecast] = useState<ForecastState>({ kind: 'loading' });
  // A new route or date starts from loading again: reset during render, so the effect only fetches.
  const key = `${from}|${to}|${departureDate}|${travelClass}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setHistory({ kind: 'loading' });
    setForecast({ kind: 'loading' });
  }

  useEffect(() => {
    const c = new AbortController();
    const q = new URLSearchParams({ from, to });
    fetch(`/api/ml/route-intel?${q}`, { signal: c.signal })
      .then(async (res) => {
        if (res.status === 404) return setHistory({ kind: 'none' });
        if (!res.ok) return setHistory({ kind: 'error' });
        setHistory({ kind: 'ok', data: await res.json() });
      })
      .catch(() => !c.signal.aborted && setHistory({ kind: 'error' }));

    fetch(`/api/ml/predictions?${new URLSearchParams({ from, to, departureDate, travelClass })}`, { signal: c.signal })
      .then(async (res) => {
        if (res.status === 503) return setForecast({ kind: 'unavailable' });
        const data = await res.json().catch(() => null);
        if (!res.ok || typeof data?.predictedPrice !== 'number') return setForecast({ kind: 'error' });
        setForecast({ kind: 'ok', data });
      })
      .catch(() => !c.signal.aborted && setForecast({ kind: 'error' }));
    return () => c.abort();
  }, [from, to, departureDate, travelClass]);

  return (
    <Card>
      <CardContent className="grid gap-8 p-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="route-history-heading">
          <h3 id="route-history-heading" className="flex items-center gap-2 font-semibold text-ink">
            <ChartBar className="h-4 w-4 text-ink-tertiary" />
            What this route has cost
          </h3>
          <HistoryBody state={history} />
        </section>

        <section aria-labelledby="route-forecast-heading" className="border-line lg:border-l lg:pl-8">
          <h3 id="route-forecast-heading" className="font-semibold text-ink">
            Fare forecast
          </h3>
          <ForecastBody state={forecast} lowestFare={lowestFare} />
          <WatchRoute
            from={from}
            to={to}
            departureDate={departureDate}
            travelClass={travelClass}
            suggested={lowestFare ?? (history.kind === 'ok' ? Math.round(history.data.airlinePositioning[0]?.avgPrice ?? 0) : 0)}
          />
        </section>
      </CardContent>
    </Card>
  );
}

function HistoryBody({ state }: { state: HistoryState }) {
  if (state.kind === 'loading') return <p className="mt-3 text-sm text-ink-tertiary">Loading route history…</p>;
  if (state.kind === 'none')
    return (
      <p className="mt-3 text-sm text-ink-secondary">
        We have no booking history for this route. History covers flights between Delhi, Mumbai, Bengaluru, Chennai,
        Hyderabad and Kolkata.
      </p>
    );
  if (state.kind === 'error') return <p className="mt-3 text-sm text-neg-fg">Route history didn’t load. Search again to retry.</p>;

  const d = state.data;
  const max = Math.max(...d.bookingWindow.map((w) => w.avgPrice));
  return (
    <>
      <p className="mt-1 text-xs text-ink-tertiary">
        Economy fares from {d.totalFlights.toLocaleString('en-IN')} past bookings. Historical, not a forecast.
      </p>
      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-3">
        <Fact label="Cheapest airline" value={d.cheapestAirline} detail={inr(d.airlinePositioning[0]?.avgPrice ?? 0) + ' average'} />
        <Fact label="Cheapest time to fly" value={d.cheapestTimeSlot.replace(/ \(.*\)$/, '')} detail={d.cheapestTimeSlot.match(/\((.*)\)/)?.[1]} />
        <Fact label="Cheapest time to book" value={d.cheapestBookingWindow} detail="before departure" />
      </dl>
      <figure className="mt-6">
        <figcaption className="text-xs font-medium text-ink-secondary">Average fare by how far ahead it was booked</figcaption>
        <ul className="mt-3 space-y-2">
          {d.bookingWindow.map((w) => (
            <li key={w.bucket} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-xs">
              <span className="text-ink-secondary">{w.bucket}</span>
              <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span
                  className={cn('block h-full rounded-full', w.bucket === d.cheapestBookingWindow ? 'bg-pos-fg' : 'bg-brand')}
                  style={{ width: `${(w.avgPrice / max) * 100}%` }}
                />
              </span>
              <span className={cn(mono, 'text-right text-ink')}>{inr(w.avgPrice)}</span>
            </li>
          ))}
        </ul>
      </figure>
    </>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-tertiary">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value || 'Not enough data'}</dd>
      {detail && value && <dd className="text-xs text-ink-tertiary">{detail}</dd>}
    </div>
  );
}

function ForecastBody({ state, lowestFare }: { state: ForecastState; lowestFare?: number }) {
  if (state.kind === 'loading') return <p className="mt-3 text-sm text-ink-tertiary">Asking the model…</p>;
  if (state.kind === 'unavailable')
    return (
      <p className="mt-3 flex gap-2 rounded-md bg-surface-sunken px-3 py-2.5 text-sm text-ink-secondary">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary" />
        The fare prediction model isn’t connected yet, so there is no forecast. The history alongside is real.
      </p>
    );
  if (state.kind === 'error') return <p className="mt-3 text-sm text-neg-fg">The model didn’t respond. Search again to retry.</p>;

  const { predictedPrice, interval } = state.data;
  const verdict =
    lowestFare === undefined
      ? null
      : lowestFare <= (interval?.low ?? predictedPrice * 0.9)
        ? { text: 'The lowest fare today is below the forecast range. A good time to book.', tone: 'text-pos-fg' }
        : lowestFare >= (interval?.high ?? predictedPrice * 1.1)
          ? { text: 'The lowest fare today is above the forecast range. Worth waiting if your dates are flexible.', tone: 'text-neg-fg' }
          : { text: 'The lowest fare today is within the forecast range.', tone: 'text-ink-secondary' };

  return (
    <>
      <p className={cn(mono, 'mt-3 text-3xl text-ink')}>{inr(predictedPrice)}</p>
      {interval && (
        <p className="mt-1 text-sm text-ink-secondary">
          8 in 10 fares should land between <span className={mono}>{inr(interval.low)}</span> and{' '}
          <span className={mono}>{inr(interval.high)}</span>.
        </p>
      )}
      {verdict && <p className={cn('mt-3 text-sm', verdict.tone)}>{verdict.text}</p>}
    </>
  );
}

function WatchRoute({
  from,
  to,
  departureDate,
  travelClass,
  suggested,
}: {
  from: string;
  to: string;
  departureDate: string;
  travelClass: string;
  suggested: number;
}) {
  const [target, setTarget] = useState(suggested ? String(suggested) : '');
  const [saved, setSaved] = useState(false);
  // A new suggestion or route replaces the target and clears "Watching".
  const key = `${suggested}|${from}|${to}|${departureDate}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setTarget(suggested ? String(suggested) : '');
    setSaved(false);
  }

  const save = () => {
    const price = Number(target.replace(/[^0-9]/g, ''));
    if (!price) {
      toast.error('Enter the fare you want to pay');
      return;
    }
    const result = addAlert({ origin: from, destination: to, departureDate, travelClass, targetPrice: price });
    if (result.status === 'failed') {
      toast.error('Couldn’t save on this device', { description: 'Browser storage is full or turned off.' });
      return;
    }
    setSaved(true);
    toast.success(result.status === 'duplicate' ? 'You are already watching this route and date' : 'Watching this route', {
      description: 'Check it against the forecast any time from My trips.',
    });
  };

  return (
    <form
      className="mt-6 border-t border-line pt-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label htmlFor="watch-target" className="flex items-center gap-2 text-sm font-medium text-ink">
        <BellSimple className="h-4 w-4 text-ink-tertiary" />
        Watch this route
      </label>
      <p className="mt-1 text-xs text-ink-tertiary">
        Saved on this device. Check it against the forecast from{' '}
        <Link href="/dashboard" className="underline underline-offset-2 hover:text-ink">
          My trips
        </Link>
        ; we don’t send notifications.
      </p>
      <div className="mt-3 flex gap-2">
        <div className="flex h-9 flex-1 items-center rounded-md border border-line-strong bg-surface px-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <span aria-hidden className="mr-1 font-mono text-sm text-ink-tertiary">
            ₹
          </span>
          <input
            id="watch-target"
            inputMode="numeric"
            aria-label="Target fare"
            placeholder="Target fare"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value.replace(/[^0-9]/g, ''));
              setSaved(false);
            }}
            className="w-full min-w-0 bg-transparent font-mono text-sm text-ink outline-none"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9" disabled={saved}>
          {saved ? 'Watching' : 'Watch'}
        </Button>
      </div>
    </form>
  );
}
