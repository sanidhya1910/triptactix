'use client';

import { useState } from 'react';
import SearchForm from '@/components/search/SearchForm';
import { SearchParams, SearchResults, Flight } from '@/types/travel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PriceTrendAnalysis from '@/components/charts/PriceTrendAnalysis';
import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';

interface RealtimeSearchResponse {
  success: boolean;
  data: {
    flights: Flight[];
    searchId: string;
    timestamp: Date;
    totalFound: number;
    sources: string[];
    priceAnalysis?: {
      avgHistoricalPrice: number;
      avgCurrentPrice: number;
      priceTrend: 'increasing' | 'decreasing' | 'stable';
      priceRange: { min: number; max: number };
      bestDealId: string;
    };
    recommendations?: string[];
    searchParams: any;
    fallback?: boolean;
  };
}

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [realtimeResults, setRealtimeResults] = useState<RealtimeSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'standard' | 'realtime'>('standard');
  const [currentSearchParams, setCurrentSearchParams] = useState<SearchParams | null>(null);
  const [isMLMode, setIsMLMode] = useState(false);

  const handleSearch = async (params: SearchParams, useMLPredictions: boolean = false) => {
    setLoading(true);
    setSearchType(useMLPredictions ? 'realtime' : 'standard');
    setCurrentSearchParams(params);
    setIsMLMode(useMLPredictions);
    
    try {
      console.log('Performing flight search...', useMLPredictions ? '(with ML predictions)' : '(standard)');
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          useMLPredictions, // Pass the ML flag
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
        setRealtimeResults(null);
      } else {
        throw new Error(data.error?.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriceRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('Excellent') || recommendation.includes('Great')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (recommendation.includes('Consider waiting') || recommendation.includes('overpriced')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="search" showGetStarted={false} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm text-neutral-700 mb-8">
            <SparklesIcon className="w-4 h-4" />
            AI-Powered Flight Search
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-6 leading-tight">
            Find Your Perfect
            <br />
            <span className="text-neutral-600">Flight</span>
          </h1>
          <p className="text-xl text-neutral-600 mb-2 max-w-2xl mx-auto">
            Compare real-time prices with ML predictions from multiple sources
          </p>
          <p className="text-sm text-neutral-500 max-w-2xl mx-auto">
            Toggle real-time mode for live data scraping and price predictions
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SearchForm onSearch={handleSearch} loading={loading} />
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {(searchResults || realtimeResults) && (
            <motion.div
              className="mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              {/* Results Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-black mb-2">
                    {searchType === 'realtime' ? 'Real-time ' : ''}Flight Results
                  </h2>
                  <p className="text-neutral-600">
                    {realtimeResults ? 
                      `${realtimeResults.data.totalFound} flights found from ${realtimeResults.data.sources.length} sources` :
                      `${searchResults?.flights.length || 0} flights found`
                    }
                  </p>
                </div>
                
                {searchType === 'realtime' && (
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="w-5 h-5 text-black" />
                    <div className="bg-neutral-100 px-3 py-1 rounded-full text-sm text-neutral-700 border border-neutral-200">
                      Real-time + ML
                    </div>
                  </div>
                )}
              </div>

              {/* ML Price Trend Analysis */}
              {isMLMode && currentSearchParams && (
                <PriceTrendAnalysis
                  sourceCity={currentSearchParams.origin.city}
                  destinationCity={currentSearchParams.destination.city}
                  currentPrice={(searchResults?.flights || []).reduce((min, f) => Math.min(min, f.price.total), Number.POSITIVE_INFINITY) !== Number.POSITIVE_INFINITY ?
                    (searchResults?.flights || []).reduce((min, f) => Math.min(min, f.price.total), Number.POSITIVE_INFINITY) : undefined}
                  departureDate={currentSearchParams.departureDate}
                  className="mb-8"
                />
              )}

              {/* Price Analysis (Real-time only) */}
              {realtimeResults?.data.priceAnalysis && (
                <Card className="mb-8 bg-neutral-50 border-neutral-200 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 mb-1">Avg Historical</p>
                        <p className="text-2xl font-bold text-black">
                          {formatPrice(realtimeResults.data.priceAnalysis.avgHistoricalPrice)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 mb-1">Current Average</p>
                        <p className="text-2xl font-bold text-black">
                          {formatPrice(realtimeResults.data.priceAnalysis.avgCurrentPrice)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 mb-1">Price Trend</p>
                        <div className="flex items-center justify-center space-x-2">
                          {realtimeResults.data.priceAnalysis.priceTrend === 'increasing' ? (
                            <ArrowTrendingUpIcon className="w-5 h-5 text-red-500" />
                          ) : realtimeResults.data.priceAnalysis.priceTrend === 'decreasing' ? (
                            <ArrowTrendingDownIcon className="w-5 h-5 text-green-600" />
                          ) : null}
                          <span className={`font-semibold capitalize ${
                            realtimeResults.data.priceAnalysis.priceTrend === 'increasing' ? 'text-red-500' :
                            realtimeResults.data.priceAnalysis.priceTrend === 'decreasing' ? 'text-green-600' :
                            'text-neutral-600'
                          }`}>
                            {realtimeResults.data.priceAnalysis.priceTrend}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 mb-1">Price Range</p>
                        <p className="text-sm font-semibold text-black">
                          {formatPrice(realtimeResults.data.priceAnalysis.priceRange.min)} - {formatPrice(realtimeResults.data.priceAnalysis.priceRange.max)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {realtimeResults?.data.recommendations && realtimeResults.data.recommendations.length > 0 && (
                <Card className="mb-8 bg-orange-50 border-orange-200 rounded-2xl">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                      <SparklesIcon className="w-4 h-4 mr-2" />
                      AI Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {realtimeResults.data.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-orange-700">• {rec}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Fallback Notice */}
              {realtimeResults?.data.fallback && (
                <Card className="mb-8 bg-yellow-50 border-yellow-200 rounded-2xl">
                  <CardContent className="p-6">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Note:</span> Real-time data is currently unavailable. 
                      Showing sample data with ML predictions.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Flight Cards */}
              <div className="space-y-6">
                {(realtimeResults ? realtimeResults.data.flights : searchResults?.flights || []).map((flight, index) => (
                  <motion.div
                    key={flight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className={`hover:shadow-lg transition-all duration-300 rounded-2xl border-neutral-200 ${
                      flight.mlPrediction && flight.mlPrediction.recommendation.includes('Excellent') ? 'ring-2 ring-green-200 bg-green-50/30' : 'bg-white'
                    }`}>
                      <CardContent className="p-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                              <PaperAirplaneIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-black text-lg">{flight.airline}</div>
                              <div className="text-neutral-600">{flight.outbound[0]?.flightNumber || 'N/A'}</div>
                              {flight.source && (
                                <div className="bg-neutral-100 px-2 py-1 rounded text-xs text-neutral-700 mt-1 inline-block">
                                  {flight.source}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-12">
                            <div className="text-center">
                              <div className="font-semibold text-black text-lg">
                                {flight.outbound[0]?.departureTime ? 
                                  new Date(flight.outbound[0].departureTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '10:00'
                                }
                              </div>
                              <div className="text-sm text-neutral-600">{flight.outbound[0]?.origin.code}</div>
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 h-0.5 bg-neutral-300"></div>
                                <PaperAirplaneIcon className="w-4 h-4 text-neutral-400" />
                                <div className="w-16 h-0.5 bg-neutral-300"></div>
                              </div>
                              <div className="text-xs text-neutral-600">
                                {formatDuration(flight.outbound[0]?.duration || 120)}
                              </div>
                              {(flight.stops || flight.outbound[0]?.stops || 0) > 0 && (
                                <div className="text-xs text-orange-600">
                                  {flight.stops || flight.outbound[0]?.stops} stop{(flight.stops || flight.outbound[0]?.stops || 0) > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-black text-lg">
                                {flight.outbound[0]?.arrivalTime ?
                                  new Date(flight.outbound[0].arrivalTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : '12:30'
                                }
                              </div>
                              <div className="text-sm text-neutral-600">{flight.outbound[0]?.destination.code}</div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-3xl font-bold text-black">
                              {formatPrice(flight.price.total)}
                            </div>
                            
                            {/* ML Prediction Info */}
                            {flight.mlPrediction && (
                              <div className="mt-3 space-y-2">
                                <div className="text-sm text-neutral-600">
                                  ML Predicted: {formatPrice(flight.mlPrediction.predictedPrice)}
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full inline-block ${getPriceRecommendationColor(flight.mlPrediction.recommendation)}`}>
                                  {flight.mlPrediction.recommendation}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {flight.mlPrediction.confidence > 0.8 ? '🎯' : '📊'} 
                                  {Math.round(flight.mlPrediction.confidence * 100)}% confidence
                                </div>
                              </div>
                            )}
                            
                            <Button 
                              size="lg" 
                              className={`mt-4 px-6 py-3 ${flight.mlPrediction?.recommendation.includes('Excellent') ? 
                                'bg-green-600 hover:bg-green-700' : 
                                'bg-black hover:bg-neutral-800'
                              }`}
                            >
                              {flight.bookingUrl ? 'Book Now' : 'Select'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="inline-flex items-center space-x-3 p-8 bg-white rounded-2xl shadow-lg border border-neutral-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              <span className="text-lg font-semibold text-black">
                {searchType === 'realtime' ? 'Fetching real-time data & ML predictions...' : 'Searching flights...'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Default Message */}
        {!loading && !searchResults && !realtimeResults && (
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="max-w-2xl mx-auto bg-neutral-50 border-neutral-200 rounded-2xl">
              <CardContent className="p-12">
                <SparklesIcon className="w-16 h-16 mx-auto text-black mb-6" />
                <h3 className="text-2xl font-bold text-black mb-3">Ready to Search</h3>
                <p className="text-neutral-600">
                  Enter your travel details above and choose between standard search or real-time search with ML predictions.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
