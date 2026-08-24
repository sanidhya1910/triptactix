'use client';

import React from 'react';
import { TrendUp, TrendDown, ArrowRight, Minus } from '@phosphor-icons/react/ssr';
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
        return 'bg-pos text-pos-fg border-pos-fg/25';
      case 'Average Price':
        return 'bg-surface-sunken text-ink-secondary border-line';
      case 'Above Average':
      case 'Expensive':
        return 'bg-neg text-neg-fg border-neg-fg/25';
      default:
        return 'bg-surface-sunken text-ink-secondary border-line';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-pos-fg';
    if (confidence >= 0.5) return 'text-ink-secondary';
    return 'text-neg-fg';
  };

  return (
    <Card className="p-4 bg-surface border-line">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDealBadgeColor(insights.priceComparison.category)}`}>
              {insights.priceComparison.category}
            </span>
            {insights.isGoodDeal && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-pos text-pos-fg border border-pos-fg/25">
                Good deal
              </span>
            )}
          </div>

          <p className="text-sm text-ink-secondary mb-2">
            {insights.priceComparison.recommendation}
          </p>

          <div className="flex items-center gap-4 text-xs text-ink-secondary">
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
          <div className="text-xs text-ink-tertiary">Predicted Price</div>
          <div className="text-lg font-bold text-ink">
            ₹{insights.predictedPrice.toLocaleString()}
          </div>
          {insights.priceComparison.percentDifference !== 0 && (
            <div className={`text-xs ${insights.priceComparison.percentDifference > 0 ? 'text-neg-fg' : 'text-pos-fg'}`}>
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
  const TrendIcon = ({ trend }: { trend: string }) => {
    const cls = 'h-4 w-4';
    if (trend === 'up') return <TrendUp className={cls} weight="bold" />;
    if (trend === 'down') return <TrendDown className={cls} weight="bold" />;
    if (trend === 'stable') return <ArrowRight className={cls} weight="bold" />;
    return <Minus className={cls} weight="bold" />;
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-neg-fg';
      case 'down': return 'text-pos-fg';
      default: return 'text-ink-secondary';
    }
  };

  return (
    <Card className="p-4 mb-4 bg-surface border-line">
      <h3 className="text-lg font-semibold text-ink mb-3">
        Predicted fare, {from} to {to}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Predicted Price</div>
          <div className="text-lg font-bold text-ink">
            ₹{prediction.predictedPrice.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Average Price</div>
          <div className="text-lg font-bold text-ink-secondary">
            ₹{prediction.historicalData.averagePrice.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Best Price</div>
          <div className="text-lg font-bold text-pos-fg">
            ₹{prediction.historicalData.minPrice.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Price Trend</div>
          <div className={`flex items-center justify-center gap-1.5 text-lg font-medium capitalize ${getTrendColor(prediction.trendDirection)}`}>
            <TrendIcon trend={prediction.trendDirection} />
            {prediction.trendDirection}
          </div>
        </div>
      </div>

      <div className="bg-surface-sunken rounded-lg p-3 border border-line">
        <p className="text-sm text-ink-secondary">
          <span className="font-medium text-ink">Recommendation:</span> {prediction.recommendation}
        </p>
      </div>
    </Card>
  );
}

export function RouteAnalyticsCard({ analytics }: { analytics: RouteAnalytics }) {
  return (
    <Card className="p-4 mb-4 bg-surface border-line">
      <h3 className="text-lg font-semibold text-ink mb-3">
        Route Analytics: {analytics.route}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Total Flights</div>
          <div className="text-lg font-bold text-ink">
            {analytics.totalFlights.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Avg Duration</div>
          <div className="text-lg font-bold text-ink-secondary">
            {Math.floor(analytics.averageDuration / 60)}h {analytics.averageDuration % 60}m
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-ink-tertiary">Most Popular</div>
          <div className="text-sm font-bold text-ink-secondary">
            {analytics.mostCommonAirline}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-sunken rounded-lg p-3 border border-line">
          <div className="text-xs text-ink-tertiary mb-2">Available Airlines</div>
          <div className="flex flex-wrap gap-1">
            {analytics.airlines.slice(0, 4).map((airline, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-surface-sunken text-ink-secondary text-xs rounded-full"
              >
                {airline}
              </span>
            ))}
            {analytics.airlines.length > 4 && (
              <span className="px-2 py-1 bg-surface-sunken text-ink-secondary text-xs rounded-full">
                +{analytics.airlines.length - 4} more
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface-sunken rounded-lg p-3 border border-line">
          <div className="text-xs text-ink-tertiary mb-2">Popular Times</div>
          <div className="flex flex-wrap gap-1">
            {analytics.popularTimeSlots.slice(0, 3).map((slot, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-surface-sunken text-ink-secondary text-xs rounded-full"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 bg-surface-sunken rounded-lg p-3 border border-line">
        <p className="text-sm text-ink-secondary">
          <span className="font-medium text-ink">Best time to book:</span> {analytics.bestTimeToBook}
        </p>
      </div>
    </Card>
  );
}
