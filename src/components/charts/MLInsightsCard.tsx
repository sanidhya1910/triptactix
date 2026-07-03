'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface MLInsights {
  priceComparison: {
    category: string;
    recommendation: string;
    percentDifference: number;
    comparedToAverage: number;
  };
  isGoodDeal: boolean;
  predictedPrice: number;
  confidence: number;
  recommendation: string;
  historicalRank: string;
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

export function MLInsightsCard({ insights }: { insights: MLInsights }) {
  const getDealBadgeColor = (category: string) => {
    switch (category) {
      case 'Excellent Deal':
      case 'Good Deal':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Average Price':
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
      case 'Above Average':
      case 'Expensive':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-700';
    if (confidence >= 0.5) return 'text-neutral-700';
    return 'text-red-700';
  };

  return (
    <Card className="p-4 bg-white border-neutral-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDealBadgeColor(insights.priceComparison.category)}`}>
              {insights.priceComparison.category}
            </span>
            {insights.isGoodDeal && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                🎯 Great Deal!
              </span>
            )}
          </div>

          <p className="text-sm text-neutral-700 mb-2">
            {insights.priceComparison.recommendation}
          </p>

          <div className="flex items-center gap-4 text-xs text-neutral-600">
            <div>
              <span className="font-medium">Historical Rank:</span> {insights.historicalRank}
            </div>
            <div>
              <span className="font-medium">Confidence:</span>
              <span className={`ml-1 font-medium ${getConfidenceColor(insights.confidence)}`}>
                {Math.round(insights.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-neutral-500">Predicted Price</div>
          <div className="text-lg font-bold text-black">
            ₹{insights.predictedPrice.toLocaleString()}
          </div>
          {insights.priceComparison.percentDifference !== 0 && (
            <div className={`text-xs ${insights.priceComparison.percentDifference > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {insights.priceComparison.percentDifference > 0 ? '+' : ''}{insights.priceComparison.percentDifference}% vs avg
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PricePredictionCard({ 
  prediction, 
  from, 
  to 
}: { 
  prediction: PricePrediction; 
  from: string; 
  to: string; 
}) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-red-600';
      case 'down': return 'text-green-700';
      default: return 'text-neutral-700';
    }
  };

  return (
    <Card className="p-4 mb-4 bg-white border-neutral-200">
      <h3 className="text-lg font-semibold text-black mb-3">
        Price Prediction: {from} → {to}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-neutral-500">Predicted Price</div>
          <div className="text-lg font-bold text-black">
            ₹{prediction.predictedPrice.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-neutral-500">Average Price</div>
          <div className="text-lg font-bold text-neutral-700">
            ₹{prediction.historicalData.averagePrice.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-neutral-500">Best Price</div>
          <div className="text-lg font-bold text-green-700">
            ₹{prediction.historicalData.minPrice.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-neutral-500">Price Trend</div>
          <div className={`text-lg font-bold ${getTrendColor(prediction.trendDirection)}`}>
            {getTrendIcon(prediction.trendDirection)} {prediction.trendDirection.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
        <p className="text-sm text-neutral-700">
          <span className="font-medium">💡 Recommendation:</span> {prediction.recommendation}
        </p>
      </div>
    </Card>
  );
}

export function RouteAnalyticsCard({ analytics }: { analytics: RouteAnalytics }) {
  return (
    <Card className="p-4 mb-4 bg-white border-neutral-200">
      <h3 className="text-lg font-semibold text-black mb-3">
        Route Analytics: {analytics.route}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-neutral-500">Total Flights</div>
          <div className="text-lg font-bold text-black">
            {analytics.totalFlights.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-neutral-500">Avg Duration</div>
          <div className="text-lg font-bold text-neutral-700">
            {Math.floor(analytics.averageDuration / 60)}h {analytics.averageDuration % 60}m
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-neutral-500">Most Popular</div>
          <div className="text-sm font-bold text-neutral-700">
            {analytics.mostCommonAirline}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
          <div className="text-xs text-neutral-500 mb-2">Available Airlines</div>
          <div className="flex flex-wrap gap-1">
            {analytics.airlines.slice(0, 4).map((airline, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full"
              >
                {airline}
              </span>
            ))}
            {analytics.airlines.length > 4 && (
              <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">
                +{analytics.airlines.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
          <div className="text-xs text-neutral-500 mb-2">Popular Times</div>
          <div className="flex flex-wrap gap-1">
            {analytics.popularTimeSlots.slice(0, 3).map((slot, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-full"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 bg-neutral-50 rounded-lg p-3 border border-neutral-200">
        <p className="text-sm text-neutral-700">
          <span className="font-medium">📅 Best Time to Book:</span> {analytics.bestTimeToBook}
        </p>
      </div>
    </Card>
  );
}
