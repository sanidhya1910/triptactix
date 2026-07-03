'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookmarkIcon, BellAlertIcon, MagnifyingGlassIcon, TrashIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  getTrips, removeTrip, getRecentSearches, getAlerts, removeAlert, checkAlert,
  type SavedTrip, type RecentSearch, type PriceAlert,
} from '@/lib/saved-trips';

const fmt = (n?: number) =>
  n === undefined ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function TripsPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [checking, setChecking] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setTrips(getTrips());
    setSearches(getRecentSearches());
    setAlerts(getAlerts());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('tt-storage', refresh);
    return () => window.removeEventListener('tt-storage', refresh);
  }, [refresh]);

  const checkOne = async (alert: PriceAlert) => {
    setChecking(alert.id);
    await checkAlert(alert);
    refresh();
    setChecking(null);
  };

  const checkAll = async () => {
    for (const a of getAlerts()) { await checkAlert(a); }
    refresh();
  };

  const empty = trips.length === 0 && searches.length === 0 && alerts.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="trips" showGetStarted={false} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-black mb-2">Your Trips</h1>
          <p className="text-neutral-600">Saved itineraries, price alerts and recent searches — stored on this device.</p>
        </div>

        {empty && (
          <Card className="bg-neutral-50 border-neutral-200">
            <CardContent className="p-12 text-center">
              <BookmarkIcon className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
              <h3 className="text-xl font-semibold text-black mb-2">Nothing saved yet</h3>
              <p className="text-neutral-600 mb-6">Generate an itinerary or set a price alert and it&apos;ll show up here.</p>
              <div className="flex justify-center gap-3">
                <Button asChild><Link href="/itinerary">Plan a trip</Link></Button>
                <Button asChild variant="outline"><Link href="/search">Search flights</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Alerts */}
        {alerts.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-black flex items-center gap-2">
                <BellAlertIcon className="w-5 h-5" /> Price Alerts
              </h2>
              <Button variant="outline" size="sm" onClick={checkAll}>
                <ArrowPathIcon className="w-4 h-4 mr-1" /> Re-check all
              </Button>
            </div>
            <div className="space-y-3">
              {alerts.map((a) => (
                <Card key={a.id} className={`border ${a.triggered ? 'border-green-300 bg-green-50' : 'border-neutral-200'}`}>
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-black">{a.origin} → {a.destination}</p>
                      <p className="text-sm text-neutral-600">
                        {a.departureDate} · {a.travelClass} · target {fmt(a.targetPrice)}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {a.lastChecked
                          ? `Last checked ${new Date(a.lastChecked).toLocaleString('en-IN')} · model price ${fmt(a.lastPrice)}`
                          : 'Not checked yet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.triggered && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                          At/below target
                        </span>
                      )}
                      <Button variant="outline" size="sm" disabled={checking === a.id} onClick={() => checkOne(a)}>
                        {checking === a.id ? 'Checking…' : 'Check now'}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete alert" onClick={() => { removeAlert(a.id); refresh(); }}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Saved Trips */}
        {trips.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-black flex items-center gap-2 mb-4">
              <BookmarkIcon className="w-5 h-5" /> Saved Itineraries
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trips.map((t) => (
                <Card key={t.id} className="border-neutral-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{t.destination}</span>
                      <Button variant="ghost" size="icon" aria-label="Delete trip" onClick={() => { removeTrip(t.id); refresh(); }}>
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-neutral-600 space-y-1">
                    {t.flightSource && <p>From {t.flightSource}</p>}
                    <p>{t.startDate} → {t.endDate} · {t.travelers} traveler{t.travelers > 1 ? 's' : ''}</p>
                    <p className="capitalize">{t.budget} budget{t.totalCost ? ` · ${fmt(t.totalCost)}` : ''}</p>
                    <p className="text-xs text-neutral-400 pt-1">Saved {new Date(t.savedAt).toLocaleDateString('en-IN')}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent Searches */}
        {searches.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-black flex items-center gap-2 mb-4">
              <MagnifyingGlassIcon className="w-5 h-5" /> Recent Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {searches.map((s) => (
                <Link
                  key={s.id}
                  href="/search"
                  className="px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:border-neutral-400 text-sm text-neutral-700 transition-colors"
                >
                  <span className="font-medium text-black">{s.origin} → {s.destination}</span>
                  <span className="text-neutral-500"> · {s.departureDate}</span>
                  {s.lowestPrice ? <span className="text-neutral-500"> · from {fmt(s.lowestPrice)}</span> : null}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
