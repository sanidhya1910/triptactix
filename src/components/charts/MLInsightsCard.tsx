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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Good Deal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Average Price':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Above Average':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Expensive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDealBadgeColor(insights.priceComparison.category)}`}>
              {insights.priceComparison.category}
            </span>
            {insights.isGoodDeal && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border-green-200">
                🎯 Great Deal!
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-700 mb-2">
            {insights.priceComparison.recommendation}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
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
          <div className="text-xs text-gray-500">Predicted Price</div>
          <div className="text-lg font-bold text-indigo-600">
            ₹{insights.predictedPrice.toLocaleString()}
          </div>
          {insights.priceComparison.percentDifference !== 0 && (
            <div className={`text-xs ${insights.priceComparison.percentDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
      case 'down': return 'text-green-600';
      case 'stable': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="p-4 mb-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <h3 className="text-lg font-semibold text-purple-800 mb-3">
        Price Prediction: {from} → {to}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-gray-500">Predicted Price</div>
          <div className="text-lg font-bold text-purple-600">
            ₹{prediction.predictedPrice.toLocaleString()}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-500">Average Price</div>
          <div className="text-lg font-bold text-gray-700">
            ₹{prediction.historicalData.averagePrice.toLocaleString()}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-500">Best Price</div>
          <div className="text-lg font-bold text-green-600">
            ₹{prediction.historicalData.minPrice.toLocaleString()}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-500">Price Trend</div>
          <div className={`text-lg font-bold ${getTrendColor(prediction.trendDirection)}`}>
            {getTrendIcon(prediction.trendDirection)} {prediction.trendDirection.toUpperCase()}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-3 border border-purple-200">
        <p className="text-sm text-gray-700">
          <span className="font-medium">💡 Recommendation:</span> {prediction.recommendation}
        </p>
      </div>
    </Card>
  );
}

export function RouteAnalyticsCard({ analytics }: { analytics: RouteAnalytics }) {
  return (
    <Card className="p-4 mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
      <h3 className="text-lg font-semibold text-emerald-800 mb-3">
        Route Analytics: {analytics.route}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-gray-500">Total Flights</div>
          <div className="text-lg font-bold text-emerald-600">
            {analytics.totalFlights.toLocaleString()}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-500">Avg Duration</div>
          <div className="text-lg font-bold text-gray-700">
            {Math.floor(analytics.averageDuration / 60)}h {analytics.averageDuration % 60}m
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-500">Most Popular</div>
          <div className="text-sm font-bold text-gray-700">
            {analytics.mostCommonAirline}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <div className="text-xs text-gray-500 mb-2">Available Airlines</div>
          <div className="flex flex-wrap gap-1">
            {analytics.airlines.slice(0, 4).map((airline, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full"
              >
                {airline}
              </span>
            ))}
            {analytics.airlines.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{analytics.airlines.length - 4} more
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-emerald-200">
          <div className="text-xs text-gray-500 mb-2">Popular Times</div>
          <div className="flex flex-wrap gap-1">
            {analytics.popularTimeSlots.slice(0, 3).map((slot, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-3 bg-white rounded-lg p-3 border border-emerald-200">
        <p className="text-sm text-gray-700">
          <span className="font-medium">📅 Best Time to Book:</span> {analytics.bestTimeToBook}
        </p>
      </div>
    </Card>
  );
}
