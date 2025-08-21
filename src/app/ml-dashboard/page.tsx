'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { PricePredictionCard, RouteAnalyticsCard } from '@/components/charts/MLInsightsCard';

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

export default function MLDashboard() {
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsights | null>(null);
  const [pricePrediction, setPricePrediction] = useState<PricePrediction | null>(null);
  const [routeAnalytics, setRouteAnalytics] = useState<RouteAnalytics | null>(null);
  const [priceRecommendations, setPriceRecommendations] = useState<PriceRecommendations | null>(null);
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
      const params = new URLSearchParams({
        from: searchForm.from,
        to: searchForm.to,
        departureDate: format(departureDate, 'yyyy-MM-dd'),
        ...(searchForm.airline && { airline: searchForm.airline })
      });

      const [predictionRes, analyticsRes, recommendationsRes] = await Promise.all([
        fetch(`/api/ml/predictions?${params}`),
        fetch(`/api/ml/analytics?${params.toString().replace('departureDate=', '').replace(format(departureDate, 'yyyy-MM-dd'), '').replace('airline=', '').replace(searchForm.airline, '')}`),
        fetch(`/api/ml/recommendations?${params.toString().replace('departureDate=', '').replace(format(departureDate, 'yyyy-MM-dd'), '').replace('airline=', '').replace(searchForm.airline, '')}`)
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
    } catch (error) {
      console.error('Failed to fetch ML insights:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 supports-[backdrop-filter]:bg-white/25 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="text-2xl font-bold text-black">
              Triptactix
            </a>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-neutral-600 hover:text-black transition-colors">
                Home
              </a>
              <a href="/search" className="text-neutral-600 hover:text-black transition-colors">
                Search
              </a>
              <a href="/itinerary" className="text-neutral-600 hover:text-black transition-colors">
                AI Planner
              </a>
              <a href="/ml-dashboard" className="text-black font-semibold">
                ML Analytics
              </a>
              <a href="/dashboard" className="text-neutral-600 hover:text-black transition-colors">
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>
    
    <div className="max-w-7xl mx-auto p-6 space-y-6 pt-24">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🤖 AI-Powered Flight Analytics
        </h1>
        <p className="text-gray-600">
          Leveraging 300,000+ historical flight records for intelligent price predictions and travel insights
        </p>
      </div>

      {/* Dashboard Overview */}
      {dashboardInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-4 text-center bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {dashboardInsights.totalFlights.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Flight Records</div>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {dashboardInsights.totalRoutes}
            </div>
            <div className="text-sm text-gray-600">Routes Analyzed</div>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              ₹{dashboardInsights.averagePriceAcrossRoutes.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Average Price</div>
          </Card>
          
          <Card className="p-4 text-center bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <div className="text-xl font-bold text-orange-600">
              {dashboardInsights.mostPopularRoute}
            </div>
            <div className="text-sm text-gray-600">Most Popular Route</div>
          </Card>
        </div>
      )}

      {/* Top Airlines */}
      {dashboardInsights && (
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Market Share by Airline</h3>
          <div className="space-y-3">
            {dashboardInsights.topAirlines.map((airline, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-green-500' :
                    index === 2 ? 'bg-yellow-500' :
                    index === 3 ? 'bg-purple-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="font-medium">{airline.airline}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-purple-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${airline.marketShare}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12">
                    {airline.marketShare}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ML Search Form */}
      <Card className="p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Get AI Price Predictions</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
            <select
              value={searchForm.from}
              onChange={(e) => setSearchForm(prev => ({ ...prev, from: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
            <select
              value={searchForm.to}
              onChange={(e) => setSearchForm(prev => ({ ...prev, to: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Departure Date</label>
            <DatePicker
              date={departureDate}
              onDateChange={(date) => date && setDepartureDate(date)}
              placeholder="Select departure date"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Airline (Optional)</label>
            <select
              value={searchForm.airline}
              onChange={(e) => setSearchForm(prev => ({ ...prev, airline: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '🔄 Analyzing...' : '🤖 Predict Prices'}
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
            <Card className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <h4 className="text-lg font-semibold text-orange-800 mb-3">Price Recommendations</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Best Price Found:</span>
                  <span className="font-bold text-green-600">₹{priceRecommendations.bestPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Worst Price Found:</span>
                  <span className="font-bold text-red-600">₹{priceRecommendations.worstPrice.toLocaleString()}</span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <p className="text-sm text-gray-700">
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
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Price History by Booking Window</h3>
          <div className="space-y-2">
            {priceRecommendations.priceHistory.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {item.daysLeft} days before
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ 
                        width: `${(item.averagePrice / Math.max(...priceRecommendations.priceHistory.map(p => p.averagePrice))) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-800 w-20">
                    ₹{item.averagePrice.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* How It Works */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🧠 How Our AI Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📊</span>
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Historical Analysis</h4>
            <p className="text-sm text-gray-600">
              Analyzes 300,000+ flight records to understand pricing patterns across routes, airlines, and time periods.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🤖</span>
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Smart Predictions</h4>
            <p className="text-sm text-gray-600">
              Uses machine learning algorithms to predict future prices based on booking window, seasonality, and market trends.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💡</span>
            </div>
            <h4 className="font-semibold text-gray-800 mb-2">Actionable Insights</h4>
            <p className="text-sm text-gray-600">
              Provides personalized recommendations on when to book and identifies the best deals available in real-time.
            </p>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
}
