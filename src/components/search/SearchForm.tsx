'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchParams } from '@/types/travel';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { City } from '@/lib/cities';
import { SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';

interface SearchFormProps {
  onSearch: (params: SearchParams, useMLPredictions: boolean) => void;
  loading?: boolean;
}

interface SearchFormData {
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: 'economy' | 'premium' | 'business' | 'first';
}

export default function SearchForm({ onSearch, loading = false }: SearchFormProps) {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [originCity, setOriginCity] = useState<City | null>(null);
  const [destinationCity, setDestinationCity] = useState<City | null>(null);
  const [useMLPredictions, setUseMLPredictions] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SearchFormData>({
    defaultValues: {
      adults: 1,
      children: 0,
      infants: 0,
      travelClass: 'economy',
    },
  });

  const onSubmit = (data: SearchFormData) => {
    if (!originCity || !destinationCity) {
      alert('Please select valid cities for both origin and destination');
      return;
    }

    const searchParams: SearchParams = {
      origin: {
        id: '1',
        name: originCity.name,
        code: originCity.code,
        city: originCity.name,
        country: originCity.country,
        type: 'airport',
      },
      destination: {
        id: '2',
        name: destinationCity.name,
        code: destinationCity.code,
        city: destinationCity.name,
        country: destinationCity.country,
        type: 'airport',
      },
      departureDate: new Date(data.departureDate),
      returnDate: data.returnDate ? new Date(data.returnDate) : undefined,
      passengers: {
        adults: data.adults,
        children: data.children,
        infants: data.infants,
      },
      travelClass: data.travelClass,
    };

    onSearch(searchParams, useMLPredictions);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border border-neutral-200 bg-white rounded-2xl">
      <CardHeader className="space-y-6 p-8">
        <CardTitle className="text-center text-2xl font-bold text-black">
          Find Your Perfect Flight
        </CardTitle>
        
        {/* Trip Type Selection */}
        <div className="flex justify-center space-x-4">
          <Button
            type="button"
            variant={tripType === 'one-way' ? 'default' : 'outline'}
            onClick={() => setTripType('one-way')}
            className="px-6 py-2 rounded-xl font-semibold"
          >
            One Way
          </Button>
          <Button
            type="button"
            variant={tripType === 'round-trip' ? 'default' : 'outline'}
            onClick={() => setTripType('round-trip')}
            className="px-6 py-2 rounded-xl font-semibold"
          >
            Round Trip
          </Button>
        </div>

        {/* ML Predictions Toggle */}
        <div className="flex items-center justify-center space-x-3 p-4 bg-neutral-100 rounded-xl border border-neutral-200">
          <SparklesIcon className="w-5 h-5 text-black" />
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useMLPredictions}
              onChange={(e) => setUseMLPredictions(e.target.checked)}
              className="w-4 h-4 text-black rounded border-neutral-300 focus:ring-neutral-500"
            />
            <span className="text-sm font-semibold text-neutral-700">
              Enable ML Price Predictions & Analysis
            </span>
          </label>
          <ClockIcon className="w-5 h-5 text-neutral-600" />
        </div>
        
        {useMLPredictions && (
          <div className="space-y-3">
            <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>ML Predictions enabled:</strong> Get AI-powered price forecasts, savings recommendations, and price trend analysis.
              </p>
            </div>
            <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                <strong>Available Cities:</strong> Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Kolkata
              </p>
              <p className="text-xs text-amber-700 mt-1">
                ML predictions are available for flights between these 6 Indian cities from our 300K+ flight dataset.
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Origin and Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-black">From</label>
              <CityAutocomplete
                value={originCity?.name || ''}
                onChange={(city, inputValue) => setOriginCity(city)}
                placeholder="Select origin city"
                mlMode={useMLPredictions}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-black">To</label>
              <CityAutocomplete
                value={destinationCity?.name || ''}
                onChange={(city, inputValue) => setDestinationCity(city)}
                placeholder="Select destination city"
                mlMode={useMLPredictions}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-black">Departure Date</label>
              <input
                {...register('departureDate', { required: 'Departure date is required' })}
                type="date"
                className="w-full h-12 rounded-xl border-2 border-neutral-200 focus:border-black bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
              {errors.departureDate && (
                <span className="text-red-500 text-xs">{errors.departureDate.message}</span>
              )}
            </div>
            
            {tripType === 'round-trip' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-black">Return Date</label>
                <input
                  {...register('returnDate')}
                  type="date"
                  className="w-full h-12 rounded-xl border-2 border-neutral-200 focus:border-black bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            )}
          </div>

          {/* Passengers and Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <label className="text-sm font-bold text-black">Passengers</label>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Adults</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setValue('adults', Math.max(1, watch('adults') - 1))}
                      className="w-8 h-8 rounded-full border-2 border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{watch('adults')}</span>
                    <button
                      type="button"
                      onClick={() => setValue('adults', Math.min(9, watch('adults') + 1))}
                      className="w-8 h-8 rounded-full border-2 border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Children</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setValue('children', Math.max(0, watch('children') - 1))}
                      className="w-8 h-8 rounded-full border-2 border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{watch('children')}</span>
                    <button
                      type="button"
                      onClick={() => setValue('children', Math.min(9, watch('children') + 1))}
                      className="w-8 h-8 rounded-full border-2 border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Infants</span>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setValue('infants', Math.max(0, watch('infants') - 1))}
                      className="w-8 h-8 rounded-full border-2 border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{watch('infants')}</span>
                    <button
                      type="button"
                      onClick={() => setValue('infants', Math.min(9, watch('infants') + 1))}
                      className="w-8 h-8 rounded-full border-2 border-neutral-200 flex items-center justify-center hover:border-black transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-black">Travel Class</label>
              <select
                {...register('travelClass')}
                className="w-full h-12 rounded-xl border-2 border-neutral-200 focus:border-black bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200"
              >
                <option value="economy">Economy</option>
                <option value="premium">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg bg-black hover:bg-neutral-800 text-white"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Searching Real-time Flight Data...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <SparklesIcon className="w-5 h-5" />
                <span>
                  Search Real-time Flights{useMLPredictions ? ' with ML Predictions' : ''}
                </span>
                <ClockIcon className="w-5 h-5" />
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
