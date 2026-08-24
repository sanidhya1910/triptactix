'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AirplaneTilt, TrendUp, TrendDown, Star } from '@phosphor-icons/react/ssr';
import SearchForm from '@/components/search/SearchForm';
import { SearchParams, SearchResults, Flight } from '@/types/travel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PriceTrendAnalysis from '@/components/charts/PriceTrendAnalysis';
import FareCalendar from '@/components/charts/FareCalendar';
import { recordSearch } from '@/lib/saved-trips';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface RealtimeSearchResponse {
  success: boolean;
  data: {
    flights: Flight[];
    searchId: string;
    timestamp: Date;
    totalFound: number;
    sources: string[];
    priceAnalysis?: {
      avgHistoricalPrice: number;
      avgCurrentPrice: number;
      priceTrend: 'increasing' | 'decreasing' | 'stable';
      priceRange: { min: number; max: number };
      bestDealId: string;
    };
    recommendations?: string[];
    searchParams: unknown;
    fallback?: boolean;
  };
}

const formatDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const clockTime = (value?: string | Date, fallback = '--:--') =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : fallback;

/** Maps the model's free-text recommendation onto the semantic pastel scale. */
const recommendationVariant = (recommendation: string) => {
  if (/excellent|great/i.test(recommendation)) return 'positive' as const;
  if (/wait|overpriced/i.test(recommendation)) return 'negative' as const;
  return 'info' as const;
};

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [realtimeResults, setRealtimeResults] = useState<RealtimeSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'standard' | 'realtime'>('standard');
  const [currentSearchParams, setCurrentSearchParams] = useState<SearchParams | null>(null);

  const handleSearch = async (params: SearchParams, useMLPredictions = false) => {
    setLoading(true);
    setSearchType(useMLPredictions ? 'realtime' : 'standard');
    setCurrentSearchParams(params);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, useMLPredictions }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Search failed');
      }

      setSearchResults(data.data);
      setRealtimeResults(null);

      const flights: Flight[] = data.data?.flights || [];
      recordSearch({
        origin: params.origin.city,
        destination: params.destination.city,
        departureDate:
          params.departureDate instanceof Date
            ? params.departureDate.toISOString().split('T')[0]
            : String(params.departureDate),
        travelClass: params.travelClass,
        lowestPrice: flights.length
          ? Math.min(...flights.map((f) => f.price.total))
          : undefined,
      });

      if (flights.length === 0) {
        toast.info('No flights found for those dates', {
          description: 'Try shifting the departure date by a day or two.',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error("We couldn't complete that search", {
        description: 'The flight data service did not respond. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const flights = realtimeResults ? realtimeResults.data.flights : searchResults?.flights || [];
  const hasResults = Boolean(searchResults || realtimeResults);
  const lowestFare = flights.length
    ? Math.min(...flights.map((f) => f.price.total))
    : undefined;

  return (
    <>
      <AppShell width="wide">
        <header className="max-w-2xl">
          <h1 className="text-display-sm text-ink">Find a flight</h1>
          <p className="mt-3 text-ink-secondary">
            Live fares from multiple sources. Turn on predictions to see what the model expects
            the price to do next.
          </p>
        </header>

        <div className="mt-10">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Loading replaces the results block rather than stacking beneath it. */}
        {loading ? (
          <div className="mt-14 space-y-5" aria-live="polite" aria-busy="true">
            <span className="sr-only">Searching for flights</span>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-40 w-full" />
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : hasResults ? (
          <div className="mt-14 space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-ink">
                  {flights.length} {flights.length === 1 ? 'flight' : 'flights'}
                </h2>
                {lowestFare !== undefined && (
                  <p className="mt-1 text-sm text-ink-secondary [font-variant-numeric:tabular-nums]">
                    Lowest fare {formatPrice(lowestFare)}
                  </p>
                )}
              </div>
              {searchType === 'realtime' && <Badge variant="brand">Predictions on</Badge>}
            </div>

            {currentSearchParams && (
              <>
                <PriceTrendAnalysis
                  sourceCity={currentSearchParams.origin.city}
                  destinationCity={currentSearchParams.destination.city}
                  currentPrice={lowestFare}
                  departureDate={currentSearchParams.departureDate}
                />
                <FareCalendar
                  sourceCity={currentSearchParams.origin.city}
                  destinationCity={currentSearchParams.destination.city}
                  travelClass={currentSearchParams.travelClass}
                />
              </>
            )}

            {realtimeResults?.data.priceAnalysis && (
              <Card>
                <CardContent className="grid gap-8 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-ink-secondary">Historical average</p>
                    <p className="mt-1 font-mono text-xl text-ink [font-variant-numeric:tabular-nums]">
                      {formatPrice(realtimeResults.data.priceAnalysis.avgHistoricalPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-secondary">Current average</p>
                    <p className="mt-1 font-mono text-xl text-ink [font-variant-numeric:tabular-nums]">
                      {formatPrice(realtimeResults.data.priceAnalysis.avgCurrentPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-secondary">Trend</p>
                    <p className="mt-1 flex items-center gap-1.5 font-medium capitalize text-ink">
                      {realtimeResults.data.priceAnalysis.priceTrend === 'increasing' && (
                        <TrendUp className="h-4 w-4 text-neg-fg" weight="bold" />
                      )}
                      {realtimeResults.data.priceAnalysis.priceTrend === 'decreasing' && (
                        <TrendDown className="h-4 w-4 text-pos-fg" weight="bold" />
                      )}
                      {realtimeResults.data.priceAnalysis.priceTrend}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-secondary">Range</p>
                    <p className="mt-1 font-mono text-sm text-ink [font-variant-numeric:tabular-nums]">
                      {formatPrice(realtimeResults.data.priceAnalysis.priceRange.min)} to{' '}
                      {formatPrice(realtimeResults.data.priceAnalysis.priceRange.max)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {realtimeResults?.data.recommendations &&
              realtimeResults.data.recommendations.length > 0 && (
                <div className="rounded-lg border border-info-fg/20 bg-info p-6">
                  <h3 className="font-semibold text-info-fg">What the model suggests</h3>
                  <ul className="mt-3 space-y-2">
                    {realtimeResults.data.recommendations.map((rec) => (
                      <li key={rec} className="text-sm text-info-fg">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {realtimeResults?.data.fallback && (
              <p className="rounded-lg border border-caution-fg/25 bg-caution px-5 py-4 text-sm text-caution-fg">
                Live data is unavailable right now. These are sample fares with model predictions
                applied.
              </p>
            )}

            {/* Flights */}
            <ul className="space-y-4">
              {flights.map((flight) => {
                const seg = flight.outbound[0];
                const stops = flight.stops || seg?.stops || 0;
                const isBest =
                  flight.mlPrediction?.recommendation &&
                  /excellent/i.test(flight.mlPrediction.recommendation);

                return (
                  <li key={flight.id}>
                    <Card interactive className={isBest ? 'border-pos-fg/35' : undefined}>
                      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div className="grid gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken">
                              <AirplaneTilt className="h-5 w-5 text-ink-secondary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{flight.airline}</p>
                              <p className="font-mono text-xs text-ink-tertiary">
                                {seg?.flightNumber || 'Flight number pending'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-mono text-lg text-ink [font-variant-numeric:tabular-nums]">
                                {clockTime(seg?.departureTime)}
                              </p>
                              <p className="font-mono text-xs text-ink-tertiary">
                                {seg?.origin.code}
                              </p>
                            </div>
                            <div className="flex-1 text-center">
                              <div className="h-px bg-line" />
                              <p className="mt-1.5 text-xs text-ink-tertiary">
                                {formatDuration(seg?.duration || 0)}
                                {stops > 0 && ` · ${stops} stop${stops > 1 ? 's' : ''}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-lg text-ink [font-variant-numeric:tabular-nums]">
                                {clockTime(seg?.arrivalTime)}
                              </p>
                              <p className="font-mono text-xs text-ink-tertiary">
                                {seg?.destination.code}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-end justify-between gap-6 border-t border-line pt-5 lg:min-w-[13rem] lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                          <div className="lg:text-right">
                            <p className="font-mono text-2xl text-ink [font-variant-numeric:tabular-nums]">
                              {formatPrice(flight.price.total)}
                            </p>
                            {flight.mlPrediction && (
                              <div className="mt-2 space-y-1.5 lg:flex lg:flex-col lg:items-end">
                                <p className="font-mono text-xs text-ink-tertiary [font-variant-numeric:tabular-nums]">
                                  Predicted {formatPrice(flight.mlPrediction.predictedPrice)} ·{' '}
                                  {Math.round(flight.mlPrediction.confidence * 100)}% confidence
                                </p>
                                <Badge
                                  variant={recommendationVariant(
                                    flight.mlPrediction.recommendation
                                  )}
                                >
                                  {flight.mlPrediction.recommendation}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Button variant={isBest ? 'brand' : 'default'} className="shrink-0">
                            {flight.bookingUrl ? 'Book' : 'Select'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>

            {/* Trains */}
            {searchResults?.trains && searchResults.trains.length > 0 && (
              <section className="pt-6">
                <h2 className="text-2xl font-semibold text-ink">Trains</h2>
                <ul className="mt-6 space-y-4">
                  {searchResults.trains.slice(0, 6).map((train) => {
                    const seg = train.outbound[0];
                    return (
                      <li key={train.id}>
                        <Card interactive>
                          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-sunken font-mono text-xs text-ink-secondary">
                                {seg.class}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">{seg.trainName}</p>
                                <p className="font-mono text-xs text-ink-tertiary">
                                  {seg.trainNumber} · {train.operator}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div>
                                <p className="font-mono text-ink [font-variant-numeric:tabular-nums]">
                                  {clockTime(seg.departureTime)}
                                </p>
                                <p className="text-xs text-ink-tertiary">{seg.origin.city}</p>
                              </div>
                              <p className="text-xs text-ink-tertiary">
                                {formatDuration(seg.duration)}
                              </p>
                              <div>
                                <p className="font-mono text-ink [font-variant-numeric:tabular-nums]">
                                  {clockTime(seg.arrivalTime)}
                                </p>
                                <p className="text-xs text-ink-tertiary">{seg.destination.city}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="font-mono text-xl text-ink [font-variant-numeric:tabular-nums]">
                                {formatPrice(train.price.total)}
                              </p>
                              <Button size="sm" variant="outline">
                                Select
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Hotels */}
            {searchResults?.hotels && searchResults.hotels.length > 0 && (
              <section className="pt-6">
                <h2 className="text-2xl font-semibold text-ink">
                  Hotels in {currentSearchParams?.destination.city}
                </h2>
                <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.hotels.map((hotel) => (
                    <li key={hotel.id} className="flex">
                      <Card interactive className="flex w-full flex-col">
                        <CardContent className="flex flex-1 flex-col p-6">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-medium leading-snug text-ink">{hotel.name}</h3>
                            <span className="flex shrink-0 items-center gap-1 font-mono text-sm text-ink [font-variant-numeric:tabular-nums]">
                              <Star className="h-3.5 w-3.5 text-caution-fg" weight="fill" />
                              {hotel.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-ink-secondary">
                            {hotel.location.address}
                          </p>
                          <ul className="mt-4 flex flex-wrap gap-1.5">
                            {hotel.amenities.slice(0, 4).map((a) => (
                              <li key={a}>
                                <Badge variant="neutral">{a}</Badge>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-auto flex items-end justify-between pt-6">
                            <div>
                              <p className="font-mono text-lg text-ink [font-variant-numeric:tabular-nums]">
                                {formatPrice(hotel.rooms[0]?.price.perNight || 0)}
                              </p>
                              <p className="text-xs text-ink-tertiary">per night</p>
                            </div>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <EmptyState
            className="mt-14"
            icon={<AirplaneTilt className="h-6 w-6" />}
            title="Pick a route to start"
            description="Enter where you are flying from and to. Turn on fare predictions for routes between the six metros the model covers."
          />
        )}
      </AppShell>
      <SiteFooter />
    </>
  );
}
