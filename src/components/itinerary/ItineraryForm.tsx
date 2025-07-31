'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ItineraryRequestSchema, type ItineraryRequest, type Itinerary } from '@/types/itinerary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPinIcon, CalendarIcon, UsersIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface ItineraryFormProps {
  onItineraryGenerated: (itinerary: Itinerary) => void;
}

export function ItineraryForm({ onItineraryGenerated }: ItineraryFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ItineraryRequest>({
    resolver: zodResolver(ItineraryRequestSchema),
    defaultValues: {
      budget: 'mid-range',
      travelers: 2,
      accommodationType: 'hotel',
      travelStyle: 'cultural',
      interests: [],
    },
  });

  const startDate = watch('startDate');
  const today = new Date().toISOString().split('T')[0];

  const onSubmit = async (data: ItineraryRequest) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate itinerary');
      }

      if (result.success && result.itinerary) {
        onItineraryGenerated(result.itinerary);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  };

  const interests = [
    'Culture', 'Adventure', 'Food', 'Nature', 'History', 'Art', 
    'Shopping', 'Nightlife', 'Architecture', 'Museums', 'Beaches', 'Mountains'
  ];

  return (
    <div className="bg-white rounded-xl shadow-2xl p-8 border-2 border-neutral-900">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary-600 rounded-lg border-2 border-neutral-900 ">
          <SparklesIcon className="w-6 h-6 text-black" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-black text-neutral-900">
            AI Itinerary Generator
          </h2>
          <p className="text-sm text-neutral-900 font-bold">
            Tell us where you want to go and we'll create a personalized travel plan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Destination and Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-neutral-900">
              <MapPinIcon className="w-4 h-4" />
              Destination
            </label>
            <Input
              {...register('destination')}
              placeholder="e.g., Goa, Kerala, Rajasthan"
              className="w-full"
            />
            {errors.destination && (
              <p className="text-sm text-red-600">{errors.destination.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-neutral-900">
              <CalendarIcon className="w-4 h-4" />
              Start Date
            </label>
            <Input
              {...register('startDate')}
              type="date"
              min={today}
              className="w-full"
            />
            {errors.startDate && (
              <p className="text-sm text-red-600 font-bold">{errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-neutral-900">
              <CalendarIcon className="w-4 h-4" />
              End Date
            </label>
            <Input
              {...register('endDate')}
              type="date"
              min={startDate || today}
              className="w-full"
            />
            {errors.endDate && (
              <p className="text-sm text-red-600 font-bold">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Budget and Travelers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-neutral-900">Budget Range</label>
            <select
              {...register('budget')}
              className="w-full px-4 py-3 border-2 border-neutral-900 rounded-lg bg-white text-neutral-900 font-bold focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            >
              <option value="budget">Budget (Under ₹3,000/day)</option>
              <option value="mid-range">Mid-range (₹3,000-8,000/day)</option>
              <option value="luxury">Luxury (₹8,000+/day)</option>
            </select>
            {errors.budget && (
              <p className="text-sm text-red-600 font-bold">{errors.budget.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-neutral-900">
              <UsersIcon className="w-4 h-4" />
              Number of Travelers
            </label>
            <Input
              {...register('travelers', { valueAsNumber: true })}
              type="number"
              min="1"
              max="20"
              placeholder="2"
              className="w-full"
            />
            {errors.travelers && (
              <p className="text-sm text-red-600 font-bold">{errors.travelers.message}</p>
            )}
          </div>
        </div>

        {/* Accommodation and Travel Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-neutral-900">Accommodation Preference</label>
            <select
              {...register('accommodationType')}
              className="w-full px-4 py-3 border-2 border-neutral-900 rounded-lg bg-white text-neutral-900 font-bold focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            >
              <option value="hotel">Hotel</option>
              <option value="hostel">Hostel</option>
              <option value="apartment">Apartment/Homestay</option>
              <option value="resort">Resort</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-neutral-900">Travel Style</label>
            <select
              {...register('travelStyle')}
              className="w-full px-4 py-3 border-2 border-neutral-900 rounded-lg bg-white text-neutral-900 font-bold focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            >
              <option value="relaxed">Relaxed & Leisurely</option>
              <option value="adventure">Adventure & Active</option>
              <option value="cultural">Cultural Exploration</option>
              <option value="family">Family Friendly</option>
              <option value="business">Business Travel</option>
            </select>
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-4">
          <label className="text-sm font-black text-neutral-900">
            What interests you? (Select all that apply)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ">
            {interests.map((interest) => (
              <label
                key={interest}
                className="flex items-center gap-2 p-3 border-2 border-neutral-900 rounded-lg hover:bg-blue-50 hover:border-blue-600 cursor-pointer transition-colors bg-white"
              >
                <input
                  type="checkbox"
                  value={interest.toLowerCase()}
                  {...register('interests')}
                  className="rounded border-neutral-900 text-blue-600 focus:ring-blue-600 w-4 h-4"
                />
                <span className="text-sm text-neutral-900 font-bold">{interest}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-blue-600 text-white font-black py-4 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-2xl border-2 border-white/50 text-lg relative overflow-hidden"
        >
          {/* Travel-themed background icons */}
          <div className="absolute inset-0 opacity-10">
            <MapPinIcon className="absolute top-2 left-4 w-5 h-5 rotate-12" />
            <PaperAirplaneIcon className="absolute bottom-2 right-6 w-4 h-4 -rotate-12" />
            <CalendarIcon className="absolute top-3 right-12 w-4 h-4 rotate-45" />
            <UsersIcon className="absolute bottom-3 left-12 w-4 h-4 -rotate-45" />
          </div>
          {isGenerating ? (
            <div className="flex items-center gap-2 relative z-10">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating Your Perfect Itinerary...
            </div>
          ) : (
            <div className="flex items-center gap-2 relative z-10">
              <SparklesIcon className="w-5 h-5" />
              Generate AI Itinerary
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
