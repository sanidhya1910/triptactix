'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { PricePredictionCard, RouteAnalyticsCard } from '@/components/charts/MLInsightsCard';
import { Navbar } from '@/components/layout/Navbar';

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
    <div className="min-h-screen bg-neutral-50">
      <Navbar currentPage="ml-dashboard" showGetStarted={false} />
    
    <div className="max-w-7xl mx-auto p-6 space-y-6 pt-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
          AI-Powered Flight Analytics
        </h1>
        <p className="text-neutral-600">
          Leveraging 600,000+ historical flight records for intelligent price predictions and travel insights
        </p>
      </div>

      {/* Dashboard Overview */}
      {dashboardInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-5 text-center bg-white border-neutral-200">
            <div className="text-2xl font-bold text-black">
              {dashboardInsights.totalFlights.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-600 mt-1">Total Flight Records</div>
          </Card>

          <Card className="p-5 text-center bg-white border-neutral-200">
            <div className="text-2xl font-bold text-black">
              {dashboardInsights.totalRoutes}
            </div>
            <div className="text-sm text-neutral-600 mt-1">Routes Analyzed</div>
          </Card>

          <Card className="p-5 text-center bg-white border-neutral-200">
            <div className="text-2xl font-bold text-black">
              ₹{dashboardInsights.averagePriceAcrossRoutes.toLocaleString()}
            </div>
            <div className="text-sm text-neutral-600 mt-1">Average Price</div>
          </Card>

          <Card className="p-5 text-center bg-white border-neutral-200">
            <div className="text-xl font-bold text-black">
              {dashboardInsights.mostPopularRoute}
            </div>
            <div className="text-sm text-neutral-600 mt-1">Most Popular Route</div>
          </Card>
        </div>
      )}

      {/* Top Airlines */}
      {dashboardInsights && (
        <Card className="p-6 mb-8 bg-white border-neutral-200">
          <h3 className="text-xl font-semibold text-black mb-4">Market Share by Airline</h3>
          <div className="space-y-3">
            {dashboardInsights.topAirlines.map((airline, index) => {
              const shade = ['bg-black', 'bg-neutral-700', 'bg-neutral-500', 'bg-neutral-400', 'bg-neutral-300'][index] || 'bg-neutral-300';
              return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${shade}`}></div>
                  <span className="font-medium text-neutral-800">{airline.airline}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${shade}`}
                      style={{ width: `${airline.marketShare}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-neutral-600 w-12">
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
        <h3 className="text-xl font-semibold text-black mb-4">Get AI Price Predictions</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">From</label>
            <select
              value={searchForm.from}
              onChange={(e) => setSearchForm(prev => ({ ...prev, from: e.target.value }))}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
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
            <label className="block text-sm font-medium text-neutral-700 mb-2">To</label>
            <select
              value={searchForm.to}
              onChange={(e) => setSearchForm(prev => ({ ...prev, to: e.target.value }))}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
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
            <label className="block text-sm font-medium text-neutral-700 mb-2">Departure Date</label>
            <DatePicker
              date={departureDate}
              onDateChange={(date) => date && setDepartureDate(date)}
              placeholder="Select departure date"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Airline (Optional)</label>
            <select
              value={searchForm.airline}
              onChange={(e) => setSearchForm(prev => ({ ...prev, airline: e.target.value }))}
              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
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
            <Card className="p-4 bg-white border-neutral-200">
              <h4 className="text-lg font-semibold text-black mb-3">Price Recommendations</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Best Price Found:</span>
                  <span className="font-bold text-green-700">₹{priceRecommendations.bestPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Worst Price Found:</span>
                  <span className="font-bold text-red-600">₹{priceRecommendations.worstPrice.toLocaleString()}</span>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                  <p className="text-sm text-neutral-700">
                    <span className="font-medium">📅 Best Booking Window:</span> {priceRecommendations.recommendedBookingWindow}
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
          <h3 className="text-xl font-semibold text-black mb-4">Price History by Booking Window</h3>
          <div className="space-y-2">
            {priceRecommendations.priceHistory.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-600">
                  {item.daysLeft} days before
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black rounded-full"
                      style={{
                        width: `${(item.averagePrice / Math.max(...priceRecommendations.priceHistory.map(p => p.averagePrice))) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-black w-20">
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
        <Card className="p-6 bg-white border-neutral-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-xl font-semibold text-black">Route Intelligence — {routeIntel.route}</h3>
            <span className="text-xs text-neutral-500">{routeIntel.totalFlights.toLocaleString()} economy records</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-6 text-xs">
            <span className="px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
              Cheapest airline: <b>{routeIntel.cheapestAirline}</b>
            </span>
            <span className="px-2 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700">
              Cheapest time: <b>{routeIntel.cheapestTimeSlot}</b>
            </span>
            <span className="px-2 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700">
              Best window: <b>{routeIntel.cheapestBookingWindow}</b>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Airline positioning */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 mb-3">Airline Price Positioning</h4>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...routeIntel.airlinePositioning.map(a => a.avgPrice), 1);
                  return routeIntel.airlinePositioning.map((a, i) => (
                    <div key={a.airline} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-neutral-700">{a.airline}</span>
                        <span className="font-medium text-black">₹{a.avgPrice.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-black'}`} style={{ width: `${(a.avgPrice / max) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Time-slot pricing */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 mb-3">Pricing by Departure Time</h4>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...routeIntel.timeSlotPricing.map(s => s.avgPrice), 1);
                  return routeIntel.timeSlotPricing.map((s, i) => (
                    <div key={s.slot} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-neutral-700">{s.slot}</span>
                        <span className="font-medium text-black">₹{s.avgPrice.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-black'}`} style={{ width: `${(s.avgPrice / max) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Booking window */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-800 mb-3">Price by Booking Window</h4>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...routeIntel.bookingWindow.map(b => b.avgPrice), 1);
                  const best = Math.min(...routeIntel.bookingWindow.map(b => b.avgPrice));
                  return routeIntel.bookingWindow.map((b) => (
                    <div key={b.bucket} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-neutral-700">{b.bucket}</span>
                        <span className="font-medium text-black">₹{b.avgPrice.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${b.avgPrice === best ? 'bg-green-500' : 'bg-black'}`} style={{ width: `${(b.avgPrice / max) * 100}%` }} />
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
      <Card className="p-6 bg-neutral-50 border-neutral-200">
        <h3 className="text-xl font-semibold text-black mb-4">How Our AI Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <h4 className="font-semibold text-black mb-2">Historical Analysis</h4>
            <p className="text-sm text-neutral-600">
              Analyzes 600,000+ flight records to understand pricing patterns across routes, airlines, classes, and time periods.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🤖</span>
            </div>
            <h4 className="font-semibold text-black mb-2">Smart Predictions</h4>
            <p className="text-sm text-neutral-600">
              A gradient-boosting model predicts fares from booking window, seasonality, class, and route — with honest confidence intervals.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💡</span>
            </div>
            <h4 className="font-semibold text-black mb-2">Actionable Insights</h4>
            <p className="text-sm text-neutral-600">
              Provides personalized recommendations on when to book and flags the best deals against the predicted price for your date.
            </p>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
}
