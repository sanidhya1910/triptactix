'use client';

import React from 'react';
import { Flight } from '@/types/travel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/utils';
import PriceTrendAnalysis from '@/components/charts/PriceTrendAnalysis';
import { 
  ClockIcon, 
  ArrowRightIcon,
  WifiIcon,
  TvIcon,
  StarIcon 
} from '@heroicons/react/24/outline';

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
}

export function FlightCard({ flight, onSelect }: FlightCardProps) {
  const outbound = flight.outbound[0]; // First segment for display
  const inbound = flight.inbound?.[0];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-blue-800">
                {flight.airline.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold">{flight.airline}</p>
              <p className="text-sm font-bold text-neutral-900">{outbound.flightNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(flight.price.total, flight.price.currency)}
            </p>
            <p className="text-sm font-bold text-neutral-900">per person</p>
          </div>
        </div>

        {/* Outbound Flight */}
        <div className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <p className="text-xl font-bold">
                  {formatDateTime(outbound.departureTime).split(' ')[1]}
                </p>
                <p className="text-sm font-bold text-neutral-900">{outbound.origin.code}</p>
                <p className="text-xs font-bold text-neutral-900">{outbound.origin.city}</p>
              </div>
              
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center space-x-2 text-sm font-bold text-neutral-900">
                  <ClockIcon className="w-4 h-4" />
                  <span>{formatDuration(outbound.duration)}</span>
                </div>
                <div className="flex items-center w-full my-2">
                  <div className="h-0.5 bg-gray-300 flex-1"></div>
                  <ArrowRightIcon className="w-4 h-4 mx-2 text-neutral-900" />
                  <div className="h-0.5 bg-gray-300 flex-1"></div>
                </div>
                <p className="text-xs font-bold text-neutral-900">
                  {outbound.stops === 0 ? 'Direct' : `${outbound.stops} stop${outbound.stops > 1 ? 's' : ''}`}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-xl font-bold">
                  {formatDateTime(outbound.arrivalTime).split(' ')[1]}
                </p>
                <p className="text-sm font-bold text-neutral-900">{outbound.destination.code}</p>
                <p className="text-xs font-bold text-neutral-900">{outbound.destination.city}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Return Flight (if applicable) */}
        {inbound && (
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <p className="text-xl font-bold">
                    {formatDateTime(inbound.departureTime).split(' ')[1]}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">{inbound.origin.code}</p>
                  <p className="text-xs font-bold text-neutral-900">{inbound.origin.city}</p>
                </div>
                
                <div className="flex flex-col items-center flex-1">
                  <div className="flex items-center space-x-2 text-sm font-bold text-neutral-900">
                    <ClockIcon className="w-4 h-4" />
                    <span>{formatDuration(inbound.duration)}</span>
                  </div>
                  <div className="flex items-center w-full my-2">
                    <div className="h-0.5 bg-gray-300 flex-1"></div>
                    <ArrowRightIcon className="w-4 h-4 mx-2 text-neutral-900" />
                    <div className="h-0.5 bg-gray-300 flex-1"></div>
                  </div>
                  <p className="text-xs font-bold text-neutral-900">
                    {inbound.stops === 0 ? 'Direct' : `${inbound.stops} stop${inbound.stops > 1 ? 's' : ''}`}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-xl font-bold">
                    {formatDateTime(inbound.arrivalTime).split(' ')[1]}
                  </p>
                  <p className="text-sm font-bold text-neutral-900">{inbound.destination.code}</p>
                  <p className="text-xs font-bold text-neutral-900">{inbound.destination.city}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flight Details */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {flight.amenities.includes('wifi') && (
                <WifiIcon className="w-4 h-4 text-green-600" />
              )}
              {flight.amenities.includes('entertainment') && (
                <TvIcon className="w-4 h-4 text-green-600" />
              )}
            </div>
            <div className="text-sm">
              <span className={`px-2 py-1 rounded text-xs ${
                flight.refundable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {flight.refundable ? 'Refundable' : 'Non-refundable'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={() => onSelect(flight)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Select Flight
          </Button>
        </div>

        {/* ML Prediction Insights */}
        {flight.mlPrediction && (
          <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="text-sm font-medium text-indigo-800">AI Price Analysis</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Confidence</div>
                <div className={`text-sm font-bold ${
                  flight.mlPrediction.confidence >= 0.7 ? 'text-green-600' :
                  flight.mlPrediction.confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round(flight.mlPrediction.confidence * 100)}%
                </div>
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {flight.mlPrediction.recommendation}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Predicted</div>
                <div className="text-lg font-bold text-indigo-600">
                  ₹{flight.mlPrediction.predictedPrice.toLocaleString()}
                </div>
                {flight.mlPrediction.savingsPercent !== 0 && (
                  <div className={`text-xs ${flight.mlPrediction.savingsPercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {flight.mlPrediction.savingsPercent > 0 ? '+' : ''}{flight.mlPrediction.savingsPercent}% vs avg
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FlightResultsProps {
  flights: Flight[];
  loading?: boolean;
  onSelectFlight: (flight: Flight) => void;
  mlMode?: boolean;
  originCity?: string;
  destinationCity?: string;
}

export function FlightResults({ flights, loading, onSelectFlight, mlMode = false, originCity, destinationCity }: FlightResultsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="font-bold text-neutral-900">No flights found for your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ML Price Trend Analysis */}
    {mlMode && originCity && destinationCity && (
        <PriceTrendAnalysis
          sourceCity={originCity}
          destinationCity={destinationCity}
      currentPrice={flights.length ? Math.min(...flights.map(f => f.price.total)) : undefined}
      departureDate={flights[0]?.outbound?.[0]?.departureTime}
          className="mb-6"
        />
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Flights ({flights.length})</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-neutral-900">Sort by:</span>
          <select className="border rounded px-2 py-1 text-sm">
            <option>Price (Low to High)</option>
            <option>Duration</option>
            <option>Departure Time</option>
            <option>Airline</option>
          </select>
        </div>
      </div>
      
      {flights.map((flight) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          onSelect={onSelectFlight}
        />
      ))}
    </div>
  );
}
