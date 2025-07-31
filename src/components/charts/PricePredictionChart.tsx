'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PricePrediction, PriceHistory } from '@/types/travel';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface PricePredictionChartProps {
  prediction: PricePrediction;
  priceHistory: PriceHistory[];
  onCreateAlert: (targetPrice: number) => void;
}

export function PricePredictionChart({
  prediction,
  priceHistory,
  onCreateAlert,
}: PricePredictionChartProps) {
  const getTrendIcon = () => {
    switch (prediction.trend) {
      case 'up':
        return <ArrowUpIcon className="w-5 h-5 text-red-500" />;
      case 'down':
        return <ArrowDownIcon className="w-5 h-5 text-green-500" />;
      default:
        return <MinusIcon className="w-5 h-5 text-neutral-900" />;
    }
  };

  const getTrendColor = () => {
    switch (prediction.trend) {
      case 'up':
        return 'text-red-500';
      case 'down':
        return 'text-green-500';
      default:
        return 'text-neutral-900';
    }
  };

  const getRecommendationText = () => {
    switch (prediction.recommendation) {
      case 'book_now':
        return 'Book Now - Prices likely to increase';
      case 'wait':
        return 'Wait - Prices expected to drop';
      case 'monitor':
        return 'Monitor - Prices may fluctuate';
      default:
        return 'Monitor prices';
    }
  };

  const getRecommendationColor = () => {
    switch (prediction.recommendation) {
      case 'book_now':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'wait':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'monitor':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Prepare chart data
  const chartData = priceHistory.map((point) => ({
    date: formatDate(point.date, { month: 'short', day: 'numeric' }),
    price: point.price,
    type: point.type,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ChartBarIcon className="w-6 h-6 text-blue-600" />
          <span>Price Prediction & Trends</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Current Price */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-bold text-neutral-900 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(prediction.currentPrice)}
            </p>
          </div>

          {/* Predicted Price */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-bold text-neutral-900 mb-1">Predicted Price</p>
            <div className="flex items-center justify-center space-x-2">
              <p className={`text-2xl font-bold ${getTrendColor()}`}>
                {formatCurrency(prediction.predictedPrice)}
              </p>
              {getTrendIcon()}
            </div>
            <p className="text-xs font-bold text-neutral-900 mt-1">
              {(prediction.confidence * 100).toFixed(0)}% confidence
            </p>
          </div>

          {/* Price Difference */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-bold text-neutral-900 mb-1">Potential Savings</p>
            <p className={`text-2xl font-bold ${getTrendColor()}`}>
              {prediction.predictedPrice < prediction.currentPrice
                ? formatCurrency(prediction.currentPrice - prediction.predictedPrice)
                : `+${formatCurrency(prediction.predictedPrice - prediction.currentPrice)}`}
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg border ${getRecommendationColor()}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">Our Recommendation</h4>
                <p className="text-sm">{getRecommendationText()}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateAlert(prediction.predictedPrice * 0.9)}
                >
                  Set Price Alert
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value).replace(/\.\d+/, '')}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Price']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#priceGradient)"
                fillOpacity={0.6}
              />
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Prediction Factors */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm font-bold text-neutral-900">Seasonality</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${prediction.factors.seasonality * 100}%` }}
              ></div>
            </div>
            <p className="text-xs font-bold text-neutral-900 mt-1">
              {(prediction.factors.seasonality * 100).toFixed(0)}%
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-bold text-neutral-900">Demand</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${prediction.factors.demand * 100}%` }}
              ></div>
            </div>
            <p className="text-xs font-bold text-neutral-900 mt-1">
              {(prediction.factors.demand * 100).toFixed(0)}%
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-bold text-neutral-900">Historical</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${prediction.factors.historical * 100}%` }}
              ></div>
            </div>
            <p className="text-xs font-bold text-neutral-900 mt-1">
              {(prediction.factors.historical * 100).toFixed(0)}%
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-sm font-bold text-neutral-900">Events</p>
            <p className="text-xs font-bold text-neutral-900 mt-1">
              {prediction.factors.events.length > 0
                ? `${prediction.factors.events.length} event${prediction.factors.events.length > 1 ? 's' : ''}`
                : 'None'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
