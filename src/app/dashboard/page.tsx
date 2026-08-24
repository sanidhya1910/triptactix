'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BellRinging,
  BookmarkSimple,
  MagnifyingGlass,
  Trash,
  ArrowsClockwise,
  MapPin,
  Users,
  ArrowRight,
} from '@phosphor-icons/react/ssr';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Stat } from '@/components/ui/stat';
import {
  getTrips,
  removeTrip,
  getRecentSearches,
  getAlerts,
  removeAlert,
  checkAlert,
  type SavedTrip,
  type RecentSearch,
  type PriceAlert,
} from '@/lib/saved-trips';

const inr = (n?: number) =>
  n === undefined
    ? '--'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n);

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isUpcoming = (trip: SavedTrip) => {
  const end = new Date(trip.endDate);
  return Number.isNaN(end.getTime()) ? true : end >= new Date(new Date().toDateString());
};

export default function DashboardPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  // localStorage is only readable after mount, so the first paint is a skeleton
  // rather than a flash of the empty state.
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setTrips(getTrips());
    setSearches(getRecentSearches());
    setAlerts(getAlerts());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
    window.addEventListener('tt-storage', refresh);
    return () => window.removeEventListener('tt-storage', refresh);
  }, [refresh]);

  const checkOne = async (alert: PriceAlert) => {
    setChecking(alert.id);
    try {
      const updated = await checkAlert(alert);
      refresh();
      toast[updated.triggered ? 'success' : 'info'](
        updated.triggered
          ? `${alert.origin} to ${alert.destination} is at or below ${inr(alert.targetPrice)}`
          : `${alert.origin} to ${alert.destination} is still above target`,
        { description: `Model price ${inr(updated.lastPrice)}` }
      );
    } catch {
      toast.error('Could not check that alert. Please try again.');
    } finally {
      setChecking(null);
    }
  };

  const checkAll = async () => {
    setCheckingAll(true);
    try {
      for (const alert of getAlerts()) {
        await checkAlert(alert);
      }
      refresh();
      toast.success('All alerts re-checked');
    } catch {
      toast.error('Some alerts could not be checked. Please try again.');
    } finally {
      setCheckingAll(false);
    }
  };

  const upcoming = trips.filter(isUpcoming).length;
  const triggered = alerts.filter((a) => a.triggered).length;
  const planned = trips.reduce((sum, t) => sum + (t.totalCost ?? 0), 0);

  const everythingEmpty = trips.length === 0 && searches.length === 0 && alerts.length === 0;

  return (
    <>
      <AppShell>
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-display-sm text-ink">Your trips</h1>
            <p className="mt-3 text-ink-secondary">
              Saved itineraries, price alerts and recent searches. Stored on this device only.
            </p>
          </div>
          <Button asChild>
            <Link href="/itinerary">
              Plan a trip
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </Button>
        </header>

        {!ready ? (
          <div className="mt-14 space-y-10">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <Skeleton className="h-11 w-80" />
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          </div>
        ) : everythingEmpty ? (
          <EmptyState
            className="mt-14"
            icon={<BookmarkSimple className="h-6 w-6" />}
            title="Nothing saved yet"
            description="Generate an itinerary or set a price alert on a route and it will show up here."
            action={
              <>
                <Button asChild>
                  <Link href="/itinerary">Plan a trip</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/search">Check a fare</Link>
                </Button>
              </>
            }
          />
        ) : (
          <>
            <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 border-y border-line py-10 md:grid-cols-4 md:divide-x md:divide-line">
              <Stat
                value={String(trips.length)}
                label="Saved trips"
                className="md:px-8 md:first:pl-0"
              />
              <Stat value={String(upcoming)} label="Still upcoming" className="md:px-8" />
              <Stat
                value={String(alerts.length)}
                label="Price alerts"
                detail={triggered > 0 ? `${triggered} at or below target` : undefined}
                className="md:px-8"
              />
              <Stat
                value={planned > 0 ? inr(planned) : '--'}
                label="Planned spend"
                className="md:px-8 md:last:pr-0"
              />
            </div>

            <Tabs defaultValue="trips" className="mt-12">
              <TabsList>
                <TabsTrigger value="trips">Trips ({trips.length})</TabsTrigger>
                <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
                <TabsTrigger value="searches">Searches ({searches.length})</TabsTrigger>
              </TabsList>

              {/* Trips */}
              <TabsContent value="trips">
                {trips.length === 0 ? (
                  <EmptyState
                    as="h3"
                    icon={<BookmarkSimple className="h-6 w-6" />}
                    title="No saved trips"
                    description="Itineraries you save from the planner land here."
                    action={
                      <Button asChild>
                        <Link href="/itinerary">Plan a trip</Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="grid gap-5 md:grid-cols-2">
                    {trips.map((trip) => (
                      <li key={trip.id} className="flex">
                        <Card interactive className="flex w-full flex-col">
                          <CardContent className="flex flex-1 flex-col p-6">
                            <div className="flex items-start justify-between gap-4">
                              <h2 className="text-lg font-semibold text-ink">
                                {trip.destination}
                              </h2>
                              <Badge variant={isUpcoming(trip) ? 'positive' : 'neutral'}>
                                {isUpcoming(trip) ? 'Upcoming' : 'Past'}
                              </Badge>
                            </div>

                            <dl className="mt-5 space-y-2.5 text-sm">
                              <div className="flex items-center gap-2 text-ink-secondary">
                                <dt className="sr-only">Dates</dt>
                                <MapPin className="h-4 w-4 shrink-0 text-ink-tertiary" />
                                <dd className="[font-variant-numeric:tabular-nums]">
                                  {shortDate(trip.startDate)} to {shortDate(trip.endDate)}
                                </dd>
                              </div>
                              <div className="flex items-center gap-2 text-ink-secondary">
                                <dt className="sr-only">Travellers</dt>
                                <Users className="h-4 w-4 shrink-0 text-ink-tertiary" />
                                <dd>
                                  {trip.travelers} {trip.travelers === 1 ? 'traveller' : 'travellers'}
                                  {trip.budget ? ` · ${trip.budget}` : ''}
                                </dd>
                              </div>
                            </dl>

                            {trip.totalCost !== undefined && (
                              <p className="mt-5 font-mono text-xl text-ink [font-variant-numeric:tabular-nums]">
                                {inr(trip.totalCost)}
                              </p>
                            )}

                            {/* Actions pinned to the bottom so they line up across cards. */}
                            <div className="mt-auto flex items-center gap-2 pt-6">
                              <Button variant="outline" size="sm" asChild>
                                <Link href="/itinerary">Open planner</Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete saved trip to ${trip.destination}`}
                                onClick={() => {
                                  removeTrip(trip.id);
                                  refresh();
                                  toast.success('Trip removed');
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              {/* Price alerts */}
              <TabsContent value="alerts">
                {alerts.length === 0 ? (
                  <EmptyState
                    as="h3"
                    icon={<BellRinging className="h-6 w-6" />}
                    title="No price alerts"
                    description="Set a target price on a route and we will tell you when the model expects it to drop."
                    action={
                      <Button asChild>
                        <Link href="/search">Check a fare</Link>
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <div className="mb-5 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkAll}
                        disabled={checkingAll}
                      >
                        <ArrowsClockwise className="h-4 w-4" />
                        {checkingAll ? 'Checking' : 'Re-check all'}
                      </Button>
                    </div>
                    <ul className="space-y-3">
                      {alerts.map((a) => (
                        <li key={a.id}>
                          <Card className={a.triggered ? 'border-pos-fg/25 bg-pos' : undefined}>
                            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                              <div className="min-w-0">
                                <p className="font-medium text-ink">
                                  {a.origin} to {a.destination}
                                </p>
                                <p className="mt-1 text-sm text-ink-secondary [font-variant-numeric:tabular-nums]">
                                  {shortDate(a.departureDate)} · {a.travelClass} · target{' '}
                                  {inr(a.targetPrice)}
                                </p>
                                <p className="mt-1 text-xs text-ink-tertiary [font-variant-numeric:tabular-nums]">
                                  {a.lastChecked
                                    ? `Checked ${shortDate(a.lastChecked)} · model price ${inr(a.lastPrice)}`
                                    : 'Not checked yet'}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {a.triggered && <Badge variant="positive">At target</Badge>}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={checking === a.id}
                                  onClick={() => checkOne(a)}
                                >
                                  {checking === a.id ? 'Checking' : 'Check now'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete alert for ${a.origin} to ${a.destination}`}
                                  onClick={() => {
                                    removeAlert(a.id);
                                    refresh();
                                    toast.success('Alert removed');
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </TabsContent>

              {/* Recent searches */}
              <TabsContent value="searches">
                {searches.length === 0 ? (
                  <EmptyState
                    as="h3"
                    icon={<MagnifyingGlass className="h-6 w-6" />}
                    title="No recent searches"
                    description="Routes you look up are kept here so you can jump back to them."
                    action={
                      <Button asChild>
                        <Link href="/search">Check a fare</Link>
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                    {searches.map((s) => (
                      <li key={s.id}>
                        <Link
                          href="/search"
                          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-surface-hover"
                        >
                          <span className="font-medium text-ink">
                            {s.origin} to {s.destination}
                          </span>
                          <span className="text-sm text-ink-secondary [font-variant-numeric:tabular-nums]">
                            {shortDate(s.departureDate)} · {s.travelClass}
                          </span>
                          <span className="font-mono text-sm text-ink [font-variant-numeric:tabular-nums]">
                            {inr(s.lowestPrice)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </AppShell>
      <SiteFooter />
    </>
  );
}
