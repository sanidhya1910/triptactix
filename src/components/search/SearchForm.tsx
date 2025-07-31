'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPinIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline';
import { SearchParams, Location } from '@/types/travel';

const searchSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  returnDate: z.string().optional(),
  adults: z.number().min(1, 'At least 1 adult required').max(9),
  children: z.number().min(0).max(9),
  infants: z.number().min(0).max(9),
  travelClass: z.enum(['economy', 'premium', 'business', 'first']),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

export function SearchForm({ onSearch, loading = false }: SearchFormProps) {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('round-trip');
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      adults: 1,
      children: 0,
      infants: 0,
      travelClass: 'economy',
    },
  });

  const onSubmit = (data: SearchFormData) => {
    // Convert form data to SearchParams type
    // In a real app, you'd fetch actual location data
    const searchParams: SearchParams = {
      origin: {
        id: '1',
        name: data.origin,
        code: data.origin.toUpperCase().slice(0, 3),
        city: data.origin,
        country: 'Unknown',
        type: 'airport',
      },
      destination: {
        id: '2',
        name: data.destination,
        code: data.destination.toUpperCase().slice(0, 3),
        city: data.destination,
        country: 'Unknown',
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

    onSearch(searchParams);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-blue-900">
          Find Your Perfect Trip
        </CardTitle>
        <div className="flex justify-center space-x-4 mt-4">
          <Button
            type="button"
            variant={tripType === 'round-trip' ? 'default' : 'outline'}
            onClick={() => setTripType('round-trip')}
          >
            Round Trip
          </Button>
          <Button
            type="button"
            variant={tripType === 'one-way' ? 'default' : 'outline'}
            onClick={() => setTripType('one-way')}
          >
            One Way
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Origin and Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-neutral-900 flex items-center">
                <MapPinIcon className="w-4 h-4 mr-2" />
                From
              </label>
              <Input
                {...register('origin')}
                placeholder="Origin city or airport"
                className="w-full"
              />
              {errors.origin && (
                <p className="text-red-500 text-sm">{errors.origin.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black text-neutral-900 flex items-center">
                <MapPinIcon className="w-4 h-4 mr-2" />
                To
              </label>
              <Input
                {...register('destination')}
                placeholder="Destination city or airport"
                className="w-full"
              />
              {errors.destination && (
                <p className="text-red-500 text-sm">{errors.destination.message}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-neutral-900 flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Departure
              </label>
              <Input
                {...register('departureDate')}
                type="date"
                className="w-full"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.departureDate && (
                <p className="text-red-500 text-sm">{errors.departureDate.message}</p>
              )}
            </div>
            
            {tripType === 'round-trip' && (
              <div className="space-y-2">
                <label className="text-sm font-black text-neutral-900 flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Return
                </label>
                <Input
                  {...register('returnDate')}
                  type="date"
                  className="w-full"
                  min={watch('departureDate')}
                />
                {errors.returnDate && (
                  <p className="text-red-500 text-sm">{errors.returnDate.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Passengers and Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-neutral-900 flex items-center">
                <UsersIcon className="w-4 h-4 mr-2" />
                Passengers
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-neutral-900">Adults</label>
                  <Input
                    {...register('adults', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="9"
                    className="text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-900">Children</label>
                  <Input
                    {...register('children', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="9"
                    className="text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-900">Infants</label>
                  <Input
                    {...register('infants', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="9"
                    className="text-center"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black text-neutral-900">Travel Class</label>
              <select
                {...register('travelClass')}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search Flights, Trains & Hotels'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
