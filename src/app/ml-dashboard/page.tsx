'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { PricePredictionCard, RouteAnalyticsCard } from '@/components/charts/MLInsightsCard';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface DashboardInsights {
  totalRoutes: number;
  totalFlights: number;
  mostPopularRoute: string;
  averagePriceAcrossRoutes: number;
  priceRangeAcrossRoutes: { min: number; max: number };
  topAirlines: Array<{ airline: string; marketShare: number }>;
}

interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  trendDirection: 'up' | 'down' | 'stable';
  recommendation: string;
  historicalData: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    priceRange: number;
  };
}

interface RouteAnalytics {
  route: string;
  totalFlights: number;
  airlines: string[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averageDuration: number;
  mostCommonAirline: string;
  bestTimeToBook: string;
  popularTimeSlots: string[];
}

interface PriceRecommendations {
  bestPrice: number;
  worstPrice: number;
  averagePrice: number;
  recommendedBookingWindow: string;
  priceHistory: Array<{ daysLeft: number; averagePrice: number }>;
}

interface RouteIntelligence {
  route: string;
  totalFlights: number;
  airlinePositioning: Array<{ airline: string; avgPrice: number; minPrice: number; count: number }>;
  timeSlotPricing: Array<{ slot: string; avgPrice: number; count: number }>;
  bookingWindow: Array<{ bucket: string; avgPrice: number }>;
  cheapestAirline: string;
  cheapestTimeSlot: string;
  cheapestBookingWindow: string;
}

export default function MLDashboard() {
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsights | null>(null);
  const [pricePrediction, setPricePrediction] = useState<PricePrediction | null>(null);
  const [routeAnalytics, setRouteAnalytics] = useState<RouteAnalytics | null>(null);
  const [priceRecommendations, setPriceRecommendations] = useState<PriceRecommendations | null>(null);
  const [routeIntel, setRouteIntel] = useState<RouteIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [departureDate, setDepartureDate] = useState<Date>(new Date('2025-08-30'));
  const [searchForm, setSearchForm] = useState({
    from: 'New Delhi',
    to: 'Mumbai',
    airline: ''
  });

  useEffect(() => {
    loadDashboardInsights();
  }, []);

  const loadDashboardInsights = async () => {
    try {
      const response = await fetch('/api/ml/insights');
      if (response.ok) {
        const data = await response.json();
        setDashboardInsights(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard insights:', error);
    }
  };

  const handlePredictionSearch = async () => {
    if (!searchForm.from || !searchForm.to || !departureDate) {
      return;
    }

    setLoading(true);
    try {
      // predictions needs the date (and optional airline); analytics &
      // recommendations are route-level and only take from/to.
      const predictionParams = new URLSearchParams({
        from: searchForm.from,
        to: searchForm.to,
        departureDate: format(departureDate, 'yyyy-MM-dd'),
        ...(searchForm.airline && { airline: searchForm.airline }),
      });
      const routeParams = new URLSearchParams({
        from: searchForm.from,
        to: searchForm.to,
      });

      const [predictionRes, analyticsRes, recommendationsRes, intelRes] = await Promise.all([
        fetch(`/api/ml/predictions?${predictionParams}`),
        fetch(`/api/ml/analytics?${routeParams}`),
        fetch(`/api/ml/recommendations?${routeParams}`),
        fetch(`/api/ml/route-intel?${routeParams}`),
      ]);

      if (predictionRes.ok) {
        const prediction = await predictionRes.json();
        setPricePrediction(prediction);
      }

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        setRouteAnalytics(analytics);
      }

      if (recommendationsRes.ok) {
        const recommendations = await recommendationsRes.json();
        setPriceRecommendations(recommendations);
      }

      if (intelRes.ok) {
        const intel = await intelRes.json();
        setRouteIntel(intel);
      }
    } catch (error) {
      console.error('Failed to fetch ML insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppShell width="wide" className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="text-display-sm text-ink">Fare data</h1>
        <p className="mt-3 text-ink-secondary">
          What the model learned from 600,000 historical bookings: route pricing, airline share,
          and when a fare is usually at its lowest.
        </p>
      </header>

      {/* Dashboard Overview */}
      {dashboardInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-5 text-center bg-surface border-line">
            <div className="text-2xl font-bold text-ink">
              {dashboardInsights.totalFlights.toLocaleString()}
            </div>
            <div className="text-sm text-ink-secondary mt-1">Flight records</div>
          </Card>

          <Card className="p-5 text-center bg-surface border-line">
            <div className="text-2xl font-bold text-ink">
              {dashboardInsights.totalRoutes}
            </div>
            <div className="text-sm text-ink-secondary mt-1">Routes Analyzed</div>
          </Card>

          <Card className="p-5 text-center bg-surface border-line">
            <div className="text-2xl font-bold text-ink">
              ₹{dashboardInsights.averagePriceAcrossRoutes.toLocaleString()}
            </div>
            <div className="text-sm text-ink-secondary mt-1">Average Price</div>
          </Card>

          <Card className="p-5 text-center bg-surface border-line">
            <div className="text-xl font-bold text-ink">
              {dashboardInsights.mostPopularRoute}
            </div>
            <div className="text-sm text-ink-secondary mt-1">Busiest route</div>
          </Card>
        </div>
      )}

      {/* Top Airlines */}
      {dashboardInsights && (
        <Card className="p-6 mb-8 bg-surface border-line">
          <h2 className="mb-4 text-xl font-semibold text-ink">Market share by airline</h2>
          <div className="space-y-3">
            {dashboardInsights.topAirlines.map((airline, index) => {
              const shade = ['bg-brand', 'bg-brand/75', 'bg-brand/55', 'bg-brand/35', 'bg-brand/20'][index] || 'bg-line';
              return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${shade}`}></div>
                  <span className="font-medium text-ink">{airline.airline}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${shade}`}
                      style={{ width: `${airline.marketShare}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-ink-secondary w-12">
                    {airline.marketShare}%
                  </span>
                </div>
              </div>
            );})}
          </div>
        </Card>
      )}

      {/* ML Search Form */}
      <Card className="p-6 mb-8">
        <h2 className="mb-4 text-xl font-semibold text-ink">Predict a fare</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">From</label>
            <select
              value={searchForm.from}
              onChange={(e) => setSearchForm(prev => ({ ...prev, from: e.target.value }))}
              className="w-full p-2 border border-line-strong rounded-md focus:ring-2 focus:ring-brand/15 focus:border-brand"
            >
              <option value="New Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Kolkata">Kolkata</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">To</label>
            <select
              value={searchForm.to}
              onChange={(e) => setSearchForm(prev => ({ ...prev, to: e.target.value }))}
              className="w-full p-2 border border-line-strong rounded-md focus:ring-2 focus:ring-brand/15 focus:border-brand"
            >
              <option value="Mumbai">Mumbai</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Kolkata">Kolkata</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">Departure Date</label>
            <DatePicker
              date={departureDate}
              onDateChange={(date) => date && setDepartureDate(date)}
              placeholder="Select departure date"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">Airline (Optional)</label>
            <select
              value={searchForm.airline}
              onChange={(e) => setSearchForm(prev => ({ ...prev, airline: e.target.value }))}
              className="w-full p-2 border border-line-strong rounded-md focus:ring-2 focus:ring-brand/15 focus:border-brand"
            >
              <option value="">Any Airline</option>
              <option value="IndiGo">IndiGo</option>
              <option value="Air India">Air India</option>
              <option value="SpiceJet">SpiceJet</option>
              <option value="Vistara">Vistara</option>
              <option value="AirAsia">AirAsia</option>
              <option value="GoFirst">GoFirst</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={handlePredictionSearch}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Analyzing…' : 'Predict Prices'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ML Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Prediction */}
        <div>
          {pricePrediction && (
            <PricePredictionCard
              prediction={pricePrediction}
              from={searchForm.from}
              to={searchForm.to}
            />
          )}
          
          {priceRecommendations && (
            <Card className="p-4 bg-surface border-line">
              <h2 className="text-lg font-semibold text-ink mb-3">Price recommendations</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-secondary">Best Price Found:</span>
                  <span className="font-bold text-pos-fg">₹{priceRecommendations.bestPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-secondary">Worst Price Found:</span>
                  <span className="font-bold text-neg-fg">₹{priceRecommendations.worstPrice.toLocaleString()}</span>
                </div>
                <div className="bg-surface-sunken rounded-lg p-3 border border-line">
                  <p className="text-sm text-ink-secondary">
                    <span className="font-medium text-ink">Best booking window:</span> {priceRecommendations.recommendedBookingWindow}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Route Analytics */}
        <div>
          {routeAnalytics && (
            <RouteAnalyticsCard analytics={routeAnalytics} />
          )}
        </div>
      </div>

      {/* Price History Chart */}
      {priceRecommendations && priceRecommendations.priceHistory.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-ink mb-4">Price history by booking window</h2>
          <div className="space-y-2">
            {priceRecommendations.priceHistory.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-ink-secondary">
                  {item.daysLeft} days before
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ink rounded-full"
                      style={{
                        width: `${(item.averagePrice / Math.max(...priceRecommendations.priceHistory.map(p => p.averagePrice))) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-ink w-20">
                    ₹{item.averagePrice.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Route Intelligence */}
      {routeIntel && routeIntel.totalFlights > 0 && (
        <Card className="p-6 bg-surface border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h2 className="text-xl font-semibold text-ink">Route detail, {routeIntel.route}</h2>
            <span className="text-xs text-ink-tertiary">{routeIntel.totalFlights.toLocaleString()} economy records</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-6 text-xs">
            <span className="px-2 py-1 rounded-full bg-pos border border-pos-fg/25 text-pos-fg">
              Cheapest airline: <b>{routeIntel.cheapestAirline}</b>
            </span>
            <span className="px-2 py-1 rounded-full bg-surface-sunken border border-line text-ink-secondary">
              Cheapest time: <b>{routeIntel.cheapestTimeSlot}</b>
            </span>
            <span className="px-2 py-1 rounded-full bg-surface-sunken border border-line text-ink-secondary">
              Best window: <b>{routeIntel.cheapestBookingWindow}</b>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Airline positioning */}
            <div>
              <h3 className="text-sm font-semibold text-ink mb-3">Airline price positioning</h3>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...routeIntel.airlinePositioning.map(a => a.avgPrice), 1);
                  return routeIntel.airlinePositioning.map((a, i) => (
                    <div key={a.airline} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-ink-secondary">{a.airline}</span>
                        <span className="font-medium text-ink">₹{a.avgPrice.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-pos-fg' : 'bg-ink'}`} style={{ width: `${(a.avgPrice / max) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Time-slot pricing */}
            <div>
              <h3 className="text-sm font-semibold text-ink mb-3">Pricing by departure time</h3>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...routeIntel.timeSlotPricing.map(s => s.avgPrice), 1);
                  return routeIntel.timeSlotPricing.map((s, i) => (
                    <div key={s.slot} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-ink-secondary">{s.slot}</span>
                        <span className="font-medium text-ink">₹{s.avgPrice.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-pos-fg' : 'bg-ink'}`} style={{ width: `${(s.avgPrice / max) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Booking window */}
            <div>
              <h3 className="text-sm font-semibold text-ink mb-3">Price by booking window</h3>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...routeIntel.bookingWindow.map(b => b.avgPrice), 1);
                  const best = Math.min(...routeIntel.bookingWindow.map(b => b.avgPrice));
                  return routeIntel.bookingWindow.map((b) => (
                    <div key={b.bucket} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-ink-secondary">{b.bucket}</span>
                        <span className="font-medium text-ink">₹{b.avgPrice.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${b.avgPrice === best ? 'bg-pos-fg' : 'bg-ink'}`} style={{ width: `${(b.avgPrice / max) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* How It Works */}
      <Card className="p-6 bg-surface-sunken border-line">
        <h2 className="mb-4 text-xl font-semibold text-ink">How the model works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mx-auto mb-3">
                          </div>
            <h3 className="mb-2 font-semibold text-ink">Historical analysis</h3>
            <p className="text-sm text-ink-secondary">
              Analyzes 600,000+ flight records to understand pricing patterns across routes, airlines, classes, and time periods.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mx-auto mb-3">
                          </div>
            <h3 className="mb-2 font-semibold text-ink">Predictions</h3>
            <p className="text-sm text-ink-secondary">
              A gradient-boosting model predicts fares from booking window, seasonality, class, and route, with honest confidence intervals.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-ink rounded-full flex items-center justify-center mx-auto mb-3">
                          </div>
            <h3 className="mb-2 font-semibold text-ink">What to do about it</h3>
            <p className="text-sm text-ink-secondary">
              Provides personalized recommendations on when to book and flags the best deals against the predicted price for your date.
            </p>
          </div>
        </div>
      </Card>
      </AppShell>
      <SiteFooter />
    </>
  );
}
