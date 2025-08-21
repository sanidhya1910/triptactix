'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
  currentPrice?: number; // actual current price to compare
  departureDate?: string | Date; // for aligning prediction to specific date
}

export default function PriceTrendAnalysis({ sourceCity, destinationCity, className = '', currentPrice, departureDate }: PriceTrendAnalysisProps) {
  const [trends, setTrends] = useState<PriceTrend[]>([]);
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendData = async () => {
    if (!sourceCity || !destinationCity) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Normalize city names to match dataset (e.g., New Delhi -> Delhi)
      const normalizeCity = (c: string) => {
        const map: Record<string, string> = {
          'New Delhi': 'Delhi',
          'Bombay': 'Mumbai',
          'Calcutta': 'Kolkata',
          'Madras': 'Chennai',
          'Bengaluru': 'Bangalore',
        };
        return map[c] || c;
      };
      const src = normalizeCity(sourceCity);
      const dst = normalizeCity(destinationCity);

      const formatDate = (d: string | Date | undefined) => {
        if (!d) return new Date().toISOString().split('T')[0];
        const dt = typeof d === 'string' ? new Date(d) : d;
        return dt.toISOString().split('T')[0];
      };

      // Fetch price trends
      const trendResponse = await fetch('http://localhost:8000/price-trend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_city: src,
          destination_city: dst,
          days_ahead: 30
        }),
      });

      if (!trendResponse.ok) {
        throw new Error('Failed to fetch price trends');
      }

  const trendData = await trendResponse.json();
  // Backend returns `trend_data`
  setTrends(trendData.trend_data || []);

    // Fetch price analysis
      const analysisResponse = await fetch('http://localhost:8000/analyze-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_city: src,
          destination_city: dst,
      current_price: currentPrice ?? 15000, // Use actual price when provided
      departure_date: formatDate(departureDate) // Align to requested departure
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to fetch price analysis');
      }

      const analysisData = await analysisResponse.json();
      if (analysisData.success) {
        setAnalysis(analysisData.analysis);
      } else {
        throw new Error('Price analysis request failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trend data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendData();
  }, [sourceCity, destinationCity]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-red-500" />;
      case 'decreasing':
        return <ArrowTrendingDownIcon className="w-5 h-5 text-green-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getRecommendationStyle = (recommendation: string, action: string) => {
    switch (action) {
      case 'book_now':
      case 'book_soon':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'wait':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getRecommendationIcon = (action: string) => {
    switch (action) {
      case 'book_now':
      case 'book_soon':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'wait':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            <span className="text-sm text-gray-600">Loading price trends...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={fetchTrendData} variant="outline" className="mt-3">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
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
              <p className="text-sm">
                {analysis.recommendation}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Current Price</p>
                <p className="font-bold text-lg">{formatCurrency(analysis.current_vs_predicted.current_price)}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Predicted Price</p>
                <p className="font-bold text-lg text-blue-600">{formatCurrency(analysis.current_vs_predicted.predicted_price)}</p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm">
              {getTrendIcon(analysis.trend_direction)}
              <span>
                Difference: {formatCurrency(Math.abs(analysis.current_vs_predicted.difference))} ({Math.abs(analysis.current_vs_predicted.percentage_difference).toFixed(1)}%)
              </span>
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
              {/* Simple trend visualization (scrollable 30-day view) */}
              <div className="h-32 bg-gray-50 rounded-lg overflow-x-auto p-4">
                <div className="flex items-end gap-2 min-w-max">
                {trends.map((trend, index) => {
                  const maxPrice = Math.max(...trends.map(t => t.predicted_price));
                  const minPrice = Math.min(...trends.map(t => t.predicted_price));
                  const range = Math.max(maxPrice - minPrice, 1); // avoid division by zero
                  const height = ((trend.predicted_price - minPrice) / range) * 80 + 10;
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1">
                      <div 
                        className="w-3 bg-blue-500 rounded-t"
                        style={{ height: `${height}px` }}
                        title={`${formatCurrency(trend.predicted_price)}`}
                      />
                      <span className="text-xs text-gray-500 rotate-45 origin-bottom-left">
                        {new Date(trend.date).getDate()}
                      </span>
                    </div>
                  );
                })}
                </div>
              </div>
              
              {/* Trend summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-green-50 rounded">
                  <p className="font-semibold text-green-700">Lowest Predicted</p>
                  <p className="text-green-600">
                    {formatCurrency(Math.min(...trends.map(t => t.predicted_price)))}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <p className="font-semibold text-blue-700">Average</p>
                  <p className="text-blue-600">
                    {formatCurrency(trends.reduce((sum, t) => sum + t.predicted_price, 0) / trends.length)}
                  </p>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <p className="font-semibold text-red-700">Highest Predicted</p>
                  <p className="text-red-600">
                    {formatCurrency(Math.max(...trends.map(t => t.predicted_price)))}
                  </p>
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
