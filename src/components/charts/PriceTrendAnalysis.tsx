'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { canonicalCity } from '@/lib/cities';
import { addAlert } from '@/lib/saved-trips';

interface PriceTrend {
  date: string;
  predicted_price: number;
  days_until?: number;
  day_of_week?: string;
  is_weekend?: boolean;
}

interface PriceAnalysis {
  recommendation: string;
  confidence: string;
  action: string;
  current_vs_predicted: {
    current_price: number;
    predicted_price: number;
    difference: number;
    percentage_difference: number;
  };
  current_vs_average: {
    current_price: number;
    average_price: number;
    difference_percent: number;
    vs_minimum: number;
    vs_maximum: number;
  };
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  best_booking_days: Array<{
    date: string;
    price: number;
    days_until: number;
    day_of_week: string;
  }>;
}

interface PriceTrendAnalysisProps {
  sourceCity: string;
  destinationCity: string;
  className?: string;
  currentPrice?: number;
  departureDate?: string | Date;
}

// --- Mock data generators ---
const ROUTE_BASE_PRICES: Record<string, number> = {
  'New Delhi-Mumbai': 5200, 'Mumbai-New Delhi': 5400, 'New Delhi-Bangalore': 6100,
  'Bangalore-New Delhi': 6300, 'New Delhi-Chennai': 6800, 'Chennai-New Delhi': 6600,
  'New Delhi-Hyderabad': 5800, 'Hyderabad-New Delhi': 5700, 'New Delhi-Kolkata': 5000,
  'Kolkata-New Delhi': 5100, 'Mumbai-Bangalore': 4500, 'Bangalore-Mumbai': 4600,
  'Mumbai-Chennai': 5500, 'Chennai-Mumbai': 5600, 'Mumbai-Hyderabad': 4200,
  'Hyderabad-Mumbai': 4300, 'Mumbai-Kolkata': 6200, 'Kolkata-Mumbai': 6100,
  'Bangalore-Chennai': 3200, 'Chennai-Bangalore': 3300, 'Bangalore-Hyderabad': 3800,
  'Hyderabad-Bangalore': 3900, 'Bangalore-Kolkata': 6500, 'Kolkata-Bangalore': 6400,
  'Chennai-Hyderabad': 4000, 'Hyderabad-Chennai': 4100, 'Chennai-Kolkata': 5900,
  'Kolkata-Chennai': 5800, 'Hyderabad-Kolkata': 5500, 'Kolkata-Hyderabad': 5600,
};

// City alias handling lives in one place (src/lib/cities.ts).
const normalizeCity = canonicalCity;

// The price model is trained on these 6 metro hubs; other cities get
// lower-confidence estimates, so we flag that in the UI.
const SUPPORTED_CITIES = new Set([
  'New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
]);

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockTrends(src: string, dst: string, basePrice: number): PriceTrend[] {
  const trends: PriceTrend[] = [];
  const today = new Date();
  const seed = (src + dst).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendSurcharge = isWeekend ? 0.08 : 0;
    const seasonalWave = Math.sin((i / 30) * Math.PI) * 0.06;
    const noise = (rng() - 0.5) * 0.05;
    const price = Math.round(basePrice * (1 + weekendSurcharge + seasonalWave + noise));

    trends.push({
      date: date.toISOString().split('T')[0],
      predicted_price: price,
      days_until: i,
      day_of_week: days[dayOfWeek],
      is_weekend: isWeekend,
    });
  }
  return trends;
}

function generateMockAnalysis(src: string, dst: string, currentPrice: number, basePrice: number): PriceAnalysis {
  const predictedPrice = Math.round(basePrice * 1.02);
  const difference = currentPrice - predictedPrice;
  const pctDiff = (difference / predictedPrice) * 100;
  const avgPrice = Math.round(basePrice * 0.98);
  const minPrice = Math.round(basePrice * 0.75);
  const maxPrice = Math.round(basePrice * 1.35);

  let action = 'book_soon';
  let recommendation = 'Prices are near the historical average. Good time to book.';
  if (currentPrice < avgPrice * 0.9) {
    action = 'book_now';
    recommendation = `Current price is ${Math.abs(Math.round(pctDiff))}% below the predicted price — this is a great deal. Book now before prices increase.`;
  } else if (currentPrice > avgPrice * 1.15) {
    action = 'wait';
    recommendation = `Current price is ${Math.round(pctDiff)}% above the predicted price. Consider waiting for a price drop.`;
  }

  const today = new Date();
  const bestDays = [3, 7, 12].map(d => {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    return {
      date: dt.toISOString().split('T')[0],
      price: Math.round(basePrice * (0.92 + Math.random() * 0.05)),
      days_until: d,
      day_of_week: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dt.getDay()],
    };
  });

  return {
    recommendation,
    confidence: 'medium',
    action,
    current_vs_predicted: {
      current_price: currentPrice,
      predicted_price: predictedPrice,
      difference,
      percentage_difference: Math.round(pctDiff * 10) / 10,
    },
    current_vs_average: {
      current_price: currentPrice,
      average_price: avgPrice,
      difference_percent: Math.round(((currentPrice - avgPrice) / avgPrice) * 100 * 10) / 10,
      vs_minimum: Math.round(((currentPrice - minPrice) / minPrice) * 100),
      vs_maximum: Math.round(((maxPrice - currentPrice) / maxPrice) * 100),
    },
    trend_direction: currentPrice < avgPrice ? 'decreasing' : currentPrice > avgPrice * 1.1 ? 'increasing' : 'stable',
    best_booking_days: bestDays,
  };
}

export default function PriceTrendAnalysis({ sourceCity, destinationCity, className = '', currentPrice, departureDate }: PriceTrendAnalysisProps) {
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMockData, setIsMockData] = useState(false);
  const [alertSet, setAlertSet] = useState(false);

  const handleSetAlert = () => {
    const target = currentPrice ?? analysis?.current_vs_predicted.predicted_price;
    if (!target) return;
    const dt = departureDate
      ? (typeof departureDate === 'string' ? departureDate : departureDate.toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];
    addAlert({
      origin: canonicalCity(sourceCity),
      destination: canonicalCity(destinationCity),
      departureDate: dt,
      travelClass: 'economy',
      targetPrice: Math.round(target),
    });
    setAlertSet(true);
  };

  const fetchTrendData = async () => {
    if (!sourceCity || !destinationCity) return;

    setLoading(true);
    setIsMockData(false);

    const src = normalizeCity(sourceCity);
    const dst = normalizeCity(destinationCity);
    const routeKey = `${src}-${dst}`;
    const basePrice = ROUTE_BASE_PRICES[routeKey] || 5500;
    const effectivePrice = currentPrice ?? basePrice;

    const formatDt = (d: string | Date | undefined) => {
      if (!d) return new Date().toISOString().split('T')[0];
      const dt = typeof d === 'string' ? new Date(d) : d;
      return dt.toISOString().split('T')[0];
    };

    try {
      // Call the ML API through our own server-side proxy routes (no hardcoded
      // localhost, no CORS, works in production when the ML API is hosted).
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const [trendResponse, analysisResponse] = await Promise.all([
        fetch('/api/ml/price-trend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_city: src, destination_city: dst, days_ahead: 30 }),
          signal: controller.signal,
        }),
        fetch('/api/ml/analyze-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_city: src,
            destination_city: dst,
            current_price: effectivePrice,
            departure_date: formatDt(departureDate),
          }),
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeout);

      if (!trendResponse.ok || !analysisResponse.ok) throw new Error('API error');

      const trendData = await trendResponse.json();
      const analysisData = await analysisResponse.json();

      setTrends(trendData.trend_data || []);
      if (analysisData.success) {
        setAnalysis(analysisData.analysis);
      } else {
        throw new Error('Analysis failed');
      }
    } catch {
      // Fallback to mock data
      setIsMockData(true);
      setTrends(generateMockTrends(src, dst, basePrice));
      setAnalysis(generateMockAnalysis(src, dst, effectivePrice, basePrice));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCity, destinationCity]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <ArrowTrendingUpIcon className="w-5 h-5 text-red-500" />;
      case 'decreasing': return <ArrowTrendingDownIcon className="w-5 h-5 text-green-500" />;
      default: return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getRecommendationStyle = (_rec: string, action: string) => {
    switch (action) {
      case 'book_now':
      case 'book_soon': return 'bg-green-50 border-green-200 text-green-800';
      case 'wait': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getRecommendationIcon = (action: string) => {
    switch (action) {
      case 'book_now':
      case 'book_soon': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'wait': return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default: return <ClockIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
            <span className="text-sm text-gray-600">Loading price trends...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const outOfCoverage =
    !!sourceCity && !!destinationCity &&
    (!SUPPORTED_CITIES.has(normalizeCity(sourceCity)) ||
      !SUPPORTED_CITIES.has(normalizeCity(destinationCity)));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mock Data Banner */}
      {isMockData && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <SparklesIcon className="w-4 h-4 shrink-0" />
          <span>Showing AI-generated mock predictions (ML API offline). Data is simulated from historical patterns.</span>
        </div>
      )}

      {/* Coverage Notice */}
      {outOfCoverage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-sm text-neutral-700">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          <span>
            Our price model is trained on India&apos;s 6 major metros (Delhi, Mumbai,
            Bangalore, Chennai, Kolkata, Hyderabad). Predictions for other cities are
            lower-confidence estimates.
          </span>
        </div>
      )}

      {/* Price Analysis & Recommendation */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getRecommendationIcon(analysis.action)}
              <span>Price Analysis & Recommendation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-xl border ${getRecommendationStyle(analysis.recommendation, analysis.action)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">
                  {analysis.action === 'book_now' ? '✅ BUY NOW' :
                   analysis.action === 'book_soon' ? '🔜 BUY SOON' :
                   analysis.action === 'wait' ? '⏳ WAIT' : '👀 WATCH'}
                </span>
                <span className="text-sm opacity-75">
                  {analysis.confidence} confidence
                </span>
              </div>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Current Price</p>
                <p className="font-bold text-lg">{formatCurrency(analysis.current_vs_predicted.current_price)}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">ML Predicted Price</p>
                <p className="font-bold text-lg text-blue-600">{formatCurrency(analysis.current_vs_predicted.predicted_price)}</p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm">
              {getTrendIcon(analysis.trend_direction)}
              <span>
                Difference: {formatCurrency(Math.abs(analysis.current_vs_predicted.difference))} ({Math.abs(analysis.current_vs_predicted.percentage_difference).toFixed(1)}%)
              </span>
            </div>

            {/* Best Booking Days */}
            {analysis.best_booking_days && analysis.best_booking_days.length > 0 && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 mb-2">Best Days to Book</p>
                <div className="flex gap-2 flex-wrap">
                  {analysis.best_booking_days.map((day, i) => (
                    <span key={i} className="px-2 py-1 bg-white border border-emerald-200 rounded-full text-xs text-emerald-700">
                      {day.day_of_week} ({day.days_until}d) — {formatCurrency(day.price)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price alert */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-neutral-500">
                Track this route and get notified when the predicted price drops.
              </p>
              <Button variant="outline" size="sm" disabled={alertSet} onClick={handleSetAlert}>
                {alertSet ? '✓ Alert set — see My Trips' : '🔔 Set price alert'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Prediction vs Realtime Comparison */}
      {analysis && currentPrice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5" />
              <span>AI Prediction vs Real-time Price</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-xs text-indigo-600 font-medium mb-1">AI Predicted</p>
                <p className="text-xl font-bold text-indigo-700">{formatCurrency(analysis.current_vs_predicted.predicted_price)}</p>
                <p className="text-xs text-indigo-500 mt-1">Based on ML model</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-xs text-emerald-600 font-medium mb-1">Real-time Price</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(currentPrice)}</p>
                <p className="text-xs text-emerald-500 mt-1">Live market price</p>
              </div>
              <div className={`text-center p-4 rounded-xl border ${
                currentPrice < analysis.current_vs_predicted.predicted_price
                  ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-xs font-medium mb-1 ${
                  currentPrice < analysis.current_vs_predicted.predicted_price ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentPrice < analysis.current_vs_predicted.predicted_price ? 'You Save' : 'Over Predicted'}
                </p>
                <p className={`text-xl font-bold ${
                  currentPrice < analysis.current_vs_predicted.predicted_price ? 'text-green-700' : 'text-red-700'
                }`}>
                  {formatCurrency(Math.abs(currentPrice - analysis.current_vs_predicted.predicted_price))}
                </p>
                <p className={`text-xs mt-1 ${
                  currentPrice < analysis.current_vs_predicted.predicted_price ? 'text-green-500' : 'text-red-500'
                }`}>
                  {Math.abs(analysis.current_vs_predicted.percentage_difference).toFixed(1)}% {currentPrice < analysis.current_vs_predicted.predicted_price ? 'below' : 'above'} predicted
                </p>
              </div>
            </div>

            {/* Visual comparison bar */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Historical Min: {formatCurrency(analysis.current_vs_average.vs_minimum > 0 ? Math.round(currentPrice / (1 + analysis.current_vs_average.vs_minimum / 100)) : currentPrice * 0.7)}</span>
                <span>Historical Max: {formatCurrency(analysis.current_vs_average.vs_maximum > 0 ? Math.round(currentPrice / (1 - analysis.current_vs_average.vs_maximum / 100)) : currentPrice * 1.5)}</span>
              </div>
              <div className="relative h-4 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full overflow-hidden">
                {/* Predicted price marker */}
                <div
                  className="absolute top-0 h-full w-1 bg-indigo-600 z-10"
                  style={{
                    left: `${Math.min(95, Math.max(5, ((analysis.current_vs_predicted.predicted_price - (currentPrice * 0.7)) / (currentPrice * 0.8)) * 100))}%`,
                  }}
                  title={`Predicted: ${formatCurrency(analysis.current_vs_predicted.predicted_price)}`}
                />
                {/* Current price marker */}
                <div
                  className="absolute top-0 h-full w-1 bg-emerald-600 z-10"
                  style={{
                    left: `${Math.min(95, Math.max(5, ((currentPrice - (currentPrice * 0.7)) / (currentPrice * 0.8)) * 100))}%`,
                  }}
                  title={`Current: ${formatCurrency(currentPrice)}`}
                />
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-600 rounded-sm inline-block" /> AI Predicted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-600 rounded-sm inline-block" /> Real-time</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            <span>30-Day Price Trend Forecast</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trends.length > 0 ? (
            <div className="space-y-4">
              <div className="h-32 bg-gray-50 rounded-lg overflow-x-auto p-4">
                <div className="flex items-end gap-2 min-w-max">
                  {trends.map((trend, index) => {
                    const maxPrice = Math.max(...trends.map(t => t.predicted_price));
                    const minPrice = Math.min(...trends.map(t => t.predicted_price));
                    const range = Math.max(maxPrice - minPrice, 1);
                    const height = ((trend.predicted_price - minPrice) / range) * 80 + 10;

                    return (
                      <div key={index} className="flex flex-col items-center space-y-1">
                        <div
                          className={`w-3 rounded-t ${trend.is_weekend ? 'bg-orange-400' : 'bg-blue-500'}`}
                          style={{ height: `${height}px` }}
                          title={`${trend.day_of_week || ''}: ${formatCurrency(trend.predicted_price)}${trend.is_weekend ? ' (weekend)' : ''}`}
                        />
                        <span className="text-xs text-gray-500 rotate-45 origin-bottom-left">
                          {new Date(trend.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> Weekday</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded-sm inline-block" /> Weekend</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-green-50 rounded">
                  <p className="font-semibold text-green-700">Lowest Predicted</p>
                  <p className="text-green-600">{formatCurrency(Math.min(...trends.map(t => t.predicted_price)))}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <p className="font-semibold text-blue-700">Average</p>
                  <p className="text-blue-600">{formatCurrency(trends.reduce((sum, t) => sum + t.predicted_price, 0) / trends.length)}</p>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <p className="font-semibold text-red-700">Highest Predicted</p>
                  <p className="text-red-600">{formatCurrency(Math.max(...trends.map(t => t.predicted_price)))}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No trend data available for this route</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
