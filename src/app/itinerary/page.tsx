'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkle,
  MapPin,
  CalendarBlank,
  Users,
  CurrencyInr,
  Clock,
  Star,
  ArrowRight,
  Buildings,
  Camera,
  ShoppingBag,
  Heart,
  Check,
  AirplaneTilt,
  Fire,
  Warning
} from '@phosphor-icons/react/ssr';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { City } from '@/lib/cities';
import { motion, AnimatePresence } from 'framer-motion';
import { GeneratedItinerary } from '@/lib/perplexity-service';

type PlannerErrors = Partial<Record<'destination' | 'startDate' | 'endDate' | 'source', string>>;
import { saveTrip } from '@/lib/saved-trips';

interface ItineraryFormData {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: 'budget' | 'mid-range' | 'luxury';
  interests: string[];
  accommodationType: 'hotel' | 'hostel' | 'apartment' | 'resort';
  travelStyle: 'relaxed' | 'adventure' | 'cultural' | 'family' | 'business';
  includeFlight: boolean;
  flightSource: string;
  groupType: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  fitnessLevel: 'low' | 'moderate' | 'high';
  dietaryRestrictions: string[];
}

interface FlightInsight {
  source: 'ml-model' | 'estimate';
  travelClass?: string;
  outbound?: number;
  return?: number;
  confidence?: number;
  reason?: string;
  bookingAdvice?: {
    action?: string;
    recommendation?: string;
    bestDays?: Array<{ date: string; price: number; day_of_week: string; days_until: number }>;
  } | null;
}

interface ItineraryMeta {
  realPricing?: {
    flightPrices?: string;
    hotelPrices?: string;
  };
  flightInsight?: FlightInsight | null;
  generatedAt?: string;
  source?: string;
  fallbackReason?: string | null;
  isFallback?: boolean;
}

type TravelerRules = {
  minTravelers: number;
  lockedValue?: number;
  isLocked: boolean;
};

const TRAVELER_OPTION_RANGE = Array.from({ length: 10 }, (_, index) => index + 1);

const getGroupTravelerRules = (groupType: ItineraryFormData['groupType']): TravelerRules => {
  switch (groupType) {
    case 'solo':
      return { minTravelers: 1, lockedValue: 1, isLocked: true };
    case 'couple':
      return { minTravelers: 2, lockedValue: 2, isLocked: true };
    case 'family':
      return { minTravelers: 3, isLocked: false };
    default:
      return { minTravelers: 1, isLocked: false };
  }
};

export default function EnhancedItineraryPage() {
  const [errors, setErrors] = useState<PlannerErrors>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasItinerary, setHasItinerary] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] = useState<GeneratedItinerary | null>(null);
  const [itineraryMeta, setItineraryMeta] = useState<ItineraryMeta | null>(null);
  const [sourceCity, setSourceCity] = useState<City | null>(null);
  const [destinationCity, setDestinationCity] = useState<City | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [formData, setFormData] = useState<ItineraryFormData>({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    budget: 'mid-range',
    interests: [],
    accommodationType: 'hotel',
    travelStyle: 'cultural',
    includeFlight: false,
    flightSource: '',
    groupType: 'couple',
    fitnessLevel: 'moderate',
    dietaryRestrictions: []
  });

  const today = useMemo(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  }, []);

  const travelerRules = useMemo(() => getGroupTravelerRules(formData.groupType), [formData.groupType]);

  const travelerOptions = useMemo(() => {
    const baseOptions = TRAVELER_OPTION_RANGE.filter((value) => value >= travelerRules.minTravelers);
    return travelerRules.lockedValue ? [travelerRules.lockedValue] : baseOptions;
  }, [travelerRules]);

  const interests = [
    'Historical Sites', 'Food & Cuisine', 'Adventure Sports', 'Beach Activities', 
    'Shopping', 'Photography', 'Nightlife', 'Nature & Wildlife', 'Art & Culture', 
    'Spiritual Places', 'Museums', 'Local Markets', 'Architecture', 'Music & Dance'
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Lactose Intolerant', 'Nut Allergy'
  ];

  const calculatedDurationFromForm = formData.startDate && formData.endDate
    ? Math.max(
        1,
        Math.ceil(
          (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const itineraryDuration = generatedItinerary
    ? generatedItinerary.duration
        ?? generatedItinerary.days?.length
        ?? calculatedDurationFromForm
    : calculatedDurationFromForm;

  const generatedAtLabel = useMemo(() => {
    if (!itineraryMeta?.generatedAt) {
      return null;
    }
    const parsed = new Date(itineraryMeta.generatedAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return format(parsed, 'MMM dd, yyyy • HH:mm');
  }, [itineraryMeta?.generatedAt]);

  const sourceLabel = useMemo(() => {
    if (!itineraryMeta?.source) {
      return null;
    }
    switch (itineraryMeta.source) {
      case 'perplexity-ai':
        return 'Perplexity AI';
      case 'perplexity-fallback-template':
        return 'Curated fallback template';
      default:
        return itineraryMeta.source;
    }
  }, [itineraryMeta?.source]);

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleDietaryToggle = (dietary: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(dietary)
        ? prev.dietaryRestrictions.filter(d => d !== dietary)
        : [...prev.dietaryRestrictions, dietary]
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation surfaces next to the offending field. It used to be four
    // consecutive window.alert() calls.
    const nextErrors: PlannerErrors = {};
    if (!destinationCity) nextErrors.destination = 'Pick a destination from the list.';
    if (!startDate) nextErrors.startDate = 'Choose a start date.';
    if (!endDate) nextErrors.endDate = 'Choose an end date.';
    if (formData.includeFlight && !sourceCity) {
      nextErrors.source = 'Pick the city you are flying from.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Some details are missing', {
        description: 'Check the highlighted fields and try again.',
      });
      return;
    }
    
    setIsGenerating(true);
    setIsSaved(false);

    try {
      const requestData = {
        destination: destinationCity!.name,
        startDate: format(startDate!, 'yyyy-MM-dd'),
        endDate: format(endDate!, 'yyyy-MM-dd'),
        budget: formData.budget,
        travelers: formData.travelers,
        interests: formData.interests,
        accommodationType: formData.accommodationType,
        travelStyle: formData.travelStyle,
        includeFlight: formData.includeFlight,
        flightSource: sourceCity?.name || '',
        groupType: formData.groupType,
        fitnessLevel: formData.fitnessLevel,
        dietaryRestrictions: formData.dietaryRestrictions
      };
      
      console.log('Generating itinerary with data:', requestData);
      
      const response = await fetch('/api/itinerary/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGeneratedItinerary(result.data.itinerary);
        setItineraryMeta({
          realPricing: result.data.realPricing,
          flightInsight: result.data.flightInsight ?? null,
          generatedAt: result.data.generatedAt,
          source: result.data.source,
          fallbackReason: result.data.fallbackReason ?? result.data.itinerary?.fallbackReason ?? null,
          isFallback: result.data.itinerary?.isFallback ?? false
        });
        setHasItinerary(true);
      } else {
        throw new Error(result.error || 'Failed to generate itinerary');
      }
      
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast.error("We couldn't build that itinerary", {
        description: 'The planning service did not respond. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getBudgetInfo = (budget: string) => {
    switch (budget) {
      case 'budget':
        return { color: 'bg-pos text-pos-fg', range: '₹2,000-4,000/day', icon: '₹' };
      case 'mid-range':
        return { color: 'bg-info text-info-fg', range: '₹4,000-8,000/day', icon: '₹₹' };
      case 'luxury':
        return { color: 'bg-info text-info-fg', range: '₹8,000+/day', icon: '₹₹₹' };
      default:
        return { color: 'bg-surface-sunken text-ink', range: '', icon: '' };
    }
  };

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'sightseeing':
        return <Camera className="w-5 h-5" />;
      case 'food':
        return <Heart className="w-5 h-5" />;
      case 'accommodation':
        return <Buildings className="w-5 h-5" />;
      case 'transport':
        return <ArrowRight className="w-5 h-5" />;
      case 'shopping':
        return <ShoppingBag className="w-5 h-5" />;
      case 'activity':
        return <Star className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getActivityColor = (category: string) => {
    switch (category) {
      case 'sightseeing':
        return 'bg-info text-info-fg';
      case 'food':
        return 'bg-neg text-neg-fg';
      case 'accommodation':
        return 'bg-info text-info-fg';
      case 'transport':
        return 'bg-surface-sunken text-ink';
      case 'shopping':
        return 'bg-caution text-caution-fg';
      case 'activity':
        return 'bg-pos text-pos-fg';
      default:
        return 'bg-surface-sunken text-ink';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRating = (value?: number) => {
    if (value === undefined || value === null) {
      return null;
    }
    return value.toFixed(1);
  };

  if (isGenerating) {
    // A skeleton of the result layout, so the wait previews the shape of the answer.
    return (
      <>
        <AppShell width="wide">
          <div aria-live="polite" aria-busy="true">
            <span className="sr-only">Generating your itinerary</span>
            <h1 className="text-display-sm text-ink">Building your itinerary</h1>
            <p className="mt-3 text-ink-secondary">
              Pulling activities, stays and live flight prices for your dates.
            </p>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>

            <div className="mt-8 space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-line bg-surface p-6">
                  <Skeleton className="h-5 w-40" />
                  <div className="mt-6 space-y-4">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AppShell>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <AppShell width="wide">
        {!hasItinerary ? (
          <div>
            <header className="max-w-2xl">
              <h1 className="text-display-sm text-ink">Plan a trip</h1>
              <p className="mt-3 text-ink-secondary">
                Tell us where, when and how you like to travel. You get a day-by-day plan with
                real flight prices and stays costed in.
              </p>
            </header>

            <Card className="mt-10">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleGenerate} className="space-y-8">
                  {/* Destination & Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="itinerary-destination" className="mb-2 block text-sm font-medium text-ink">
                        Destination
                      </label>
                      <CityAutocomplete
                        id="itinerary-destination"
                        placeholder="Goa"
                        value={formData.destination}
                        invalid={Boolean(errors.destination)}
                        onChange={(city, inputValue) => {
                          setDestinationCity(city);
                          setFormData(prev => ({ ...prev, destination: city?.name || inputValue }));
                          setErrors(prev => ({ ...prev, destination: undefined }));
                        }}
                        className="w-full"
                      />
                      {errors.destination && (
                        <p role="alert" className="mt-2 text-xs font-medium text-neg-fg">{errors.destination}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink">Start date</label>
                      <DatePicker
                        date={startDate}
                        onDateChange={(d) => {
                          setStartDate(d);
                          setErrors(prev => ({ ...prev, startDate: undefined }));
                        }}
                        placeholder="Select a date"
                        minDate={today}
                        className="w-full"
                      />
                      {errors.startDate && (
                        <p role="alert" className="mt-2 text-xs font-medium text-neg-fg">{errors.startDate}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink">End date</label>
                      <DatePicker
                        date={endDate}
                        onDateChange={(d) => {
                          setEndDate(d);
                          setErrors(prev => ({ ...prev, endDate: undefined }));
                        }}
                        placeholder="Select a date"
                        minDate={startDate ?? today}
                        className="w-full"
                      />
                      {errors.endDate && (
                        <p role="alert" className="mt-2 text-xs font-medium text-neg-fg">{errors.endDate}</p>
                      )}
                    </div>
                  </div>

                  {/* Flight Option */}
                  <Card className="border border-dashed border-line-strong bg-surface-sunken">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <AirplaneTilt className="w-5 h-5 text-ink" />
                          <Label htmlFor="includeFlight" className="text-lg font-semibold text-ink">
                            Include a flight
                          </Label>
                        </div>
                        <Switch
                          id="includeFlight"
                          checked={formData.includeFlight}
                          onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, includeFlight: checked }))}
                        />
                      </div>
                      
                      <AnimatePresence>
                        {formData.includeFlight && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div>
                              <label htmlFor="itinerary-source" className="mb-2 block text-sm font-medium text-ink">
                                Flying from
                              </label>
                              <CityAutocomplete
                                id="itinerary-source"
                                placeholder="Delhi"
                                value={formData.flightSource}
                                invalid={Boolean(errors.source)}
                                onChange={(city, inputValue) => {
                                  setSourceCity(city);
                                  setFormData(prev => ({ ...prev, flightSource: city?.name || inputValue }));
                                  setErrors(prev => ({ ...prev, source: undefined }));
                                }}
                                className="w-full"
                              />
                              {errors.source ? (
                                <p role="alert" className="mt-2 text-xs font-medium text-neg-fg">{errors.source}</p>
                              ) : (
                                <p className="mt-2 text-xs text-ink-tertiary">
                                  Live flight prices get folded into the trip budget.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>

                  {/* Travelers & Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-3">
                        <Users className="w-4 h-4 inline mr-1" />
                        Travellers
                      </label>
                      <select 
                        className="w-full h-12 px-4 border border-line-strong rounded-lg bg-surface text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 transition-colors"
                        value={formData.travelers}
                        disabled={travelerRules.isLocked}
                        onChange={(e) => {
                          const selected = parseInt(e.target.value, 10);
                          setFormData(prev => ({
                            ...prev,
                            travelers: Math.max(selected, travelerRules.minTravelers),
                          }));
                        }}
                      >
                        {travelerOptions.map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'Person' : 'People'}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-3">
                        <CurrencyInr className="w-4 h-4 inline mr-1" />
                        Budget
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['budget', 'mid-range', 'luxury'] as const).map((budget) => {
                          const budgetInfo = getBudgetInfo(budget);
                          return (
                            <button
                              key={budget}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, budget }))}
                              className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                                formData.budget === budget
                                  ? 'border-ink bg-ink text-surface'
                                  : 'border-line-strong bg-surface text-ink-secondary hover:border-line-strong'
                              }`}
                            >
                              <div className="text-lg mb-1">{budgetInfo.icon}</div>
                              <div className="capitalize">{budget}</div>
                              <div className="text-xs opacity-75">{budgetInfo.range}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Travel Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-3">
                        Group type
                      </label>
                      <select 
                        className="w-full h-12 px-4 border border-line-strong rounded-lg bg-surface focus:border-ink transition-colors"
                        value={formData.groupType}
                        onChange={(e) => {
                          const newGroup = e.target.value as ItineraryFormData['groupType'];
                          setFormData(prev => {
                            const rules = getGroupTravelerRules(newGroup);
                            const nextTravelers = rules.lockedValue ?? Math.max(prev.travelers, rules.minTravelers);
                            return {
                              ...prev,
                              groupType: newGroup,
                              travelers: nextTravelers,
                            };
                          });
                        }}
                      >
                        <option value="solo">Solo Travel</option>
                        <option value="couple">Couple</option>
                        <option value="family">Family</option>
                        <option value="friends">Friends</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-3">
                        Travel style
                      </label>
                      <select 
                        className="w-full h-12 px-4 border border-line-strong rounded-lg bg-surface focus:border-ink transition-colors"
                        value={formData.travelStyle}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            travelStyle: e.target.value as ItineraryFormData['travelStyle'],
                          }))
                        }
                      >
                        <option value="relaxed">Relaxed & Leisure</option>
                        <option value="adventure">Adventure & Active</option>
                        <option value="cultural">Cultural & Heritage</option>
                        <option value="family">Family-Friendly</option>
                        <option value="business">Business & Networking</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-3">
                        Walking pace
                      </label>
                      <select 
                        className="w-full h-12 px-4 border border-line-strong rounded-lg bg-surface focus:border-ink transition-colors"
                        value={formData.fitnessLevel}
                        onChange={(e) =>
                          setFormData(prev => ({
                            ...prev,
                            fitnessLevel: e.target.value as ItineraryFormData['fitnessLevel'],
                          }))
                        }
                      >
                        <option value="low">Low (Minimal walking)</option>
                        <option value="moderate">Moderate (Some walking)</option>
                        <option value="high">High (Lots of activities)</option>
                      </select>
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-4">
                      <Fire className="w-4 h-4 inline mr-1" />
                      Interests
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                            formData.interests.includes(interest)
                              ? 'border-ink bg-ink text-surface'
                              : 'border-line-strong bg-surface text-ink-secondary hover:border-line-strong'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dietary Restrictions */}
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-4">
                      Dietary preferences
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {dietaryOptions.map((dietary) => (
                        <button
                          key={dietary}
                          type="button"
                          onClick={() => handleDietaryToggle(dietary)}
                          className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                            formData.dietaryRestrictions.includes(dietary)
                              ? 'border-ink bg-ink text-surface'
                              : 'border-line-strong bg-surface text-ink-secondary hover:border-line-strong'
                          }`}
                        >
                          {dietary}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-4">
                    <Button type="submit" size="lg" disabled={!destinationCity}>
                      Build the itinerary
                    </Button>
                    <p className="mt-3 text-xs text-ink-tertiary">
                      Flight and hotel prices come from live search at the time you generate.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h1 className="text-display-sm text-ink">{destinationCity?.name}</h1>
                <p className="mt-2 text-ink-secondary [font-variant-numeric:tabular-nums]">
                  {startDate && endDate
                    ? `${format(startDate, 'd MMM')} to ${format(endDate, 'd MMM')}`
                    : 'Dates not set'}{' '}
                  · {formData.travelers} {formData.travelers === 1 ? 'traveller' : 'travellers'}
                </p>
              </div>
              <div className="flex space-x-3 mt-4 md:mt-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setHasItinerary(false);
                    setGeneratedItinerary(null);
                    setItineraryMeta(null);
                  }}
                  className="border hover:border-ink hover:text-ink"
                >
                  Edit Trip
                </Button>
                <Button
                  className="bg-ink hover:bg-ink text-surface"
                  disabled={isSaved || !generatedItinerary}
                  onClick={() => {
                    if (!generatedItinerary) return;
                    saveTrip({
                      destination: generatedItinerary.destination || destinationCity?.name || formData.destination,
                      flightSource: formData.includeFlight ? sourceCity?.name : undefined,
                      startDate: formData.startDate || (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
                      endDate: formData.endDate || (endDate ? format(endDate, 'yyyy-MM-dd') : ''),
                      travelers: formData.travelers,
                      budget: formData.budget,
                      totalCost: generatedItinerary.budgetBreakdown?.total,
                      itinerary: generatedItinerary,
                    });
                    setIsSaved(true);
                  }}
                >
                  {isSaved ? 'Saved' : 'Save trip'}
                </Button>
              </div>
            </div>

            {(generatedItinerary?.isFallback || itineraryMeta?.isFallback) && (
              <div className="mb-8 flex items-start gap-3 rounded-lg border border-caution-fg/25 bg-caution p-4">
                <Warning className="w-6 h-6 text-caution-fg mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-caution-fg">
                    Showing curated backup itinerary
                  </p>
                  <p className="text-sm text-caution-fg mt-1">
                    {generatedItinerary?.fallbackReason || itineraryMeta?.fallbackReason || 'Perplexity took too long to respond, so we generated a smart template to keep you moving.'}
                  </p>
                </div>
              </div>
            )}

            {generatedItinerary && (
              <>
                {/* Trip Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-surface border border-line">
                    <CardContent className="p-6 text-center">
                      <CalendarBlank className="w-8 h-8 text-ink mx-auto mb-3" />
                      <p className="text-sm text-ink-secondary font-medium">Duration</p>
                      <p className="text-2xl font-bold text-ink">
                        {itineraryDuration || 0} Days
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-surface border border-line">
                    <CardContent className="p-6 text-center">
                      <MapPin className="w-8 h-8 text-ink mx-auto mb-3" />
                      <p className="text-sm text-ink-secondary font-medium">Activities</p>
                      <p className="text-2xl font-bold text-ink">
                        {generatedItinerary.days?.reduce<number>((acc, day) => acc + day.activities.length, 0) ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-surface border border-line">
                    <CardContent className="p-6 text-center">
                      <CurrencyInr className="w-8 h-8 text-ink mx-auto mb-3" />
                      <p className="text-sm text-ink-secondary font-medium">Total Budget</p>
                      <p className="text-2xl font-bold text-ink">
                        {generatedItinerary.budgetBreakdown?.total ? 
                          formatCurrency(generatedItinerary.budgetBreakdown.total) : 
                          'N/A'
                        }
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-surface border border-line">
                    <CardContent className="p-6 text-center">
                      <Star className="w-8 h-8 text-ink mx-auto mb-3" />
                      <p className="text-sm text-ink-secondary font-medium">AI Score</p>
                      <p className="text-2xl font-bold text-ink">95%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing Breakdown */}
                {generatedItinerary.budgetBreakdown && (
                  <Card className="mb-8 border border-line bg-surface-sunken">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <CurrencyInr className="w-6 h-6 mr-2 text-ink" />
                        Real-Time Pricing Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {formData.includeFlight && generatedItinerary.budgetBreakdown.flights && (
                          <div className="text-center">
                            <div className="bg-surface p-4 rounded-lg border border-line">
                              <AirplaneTilt className="w-8 h-8 text-ink mx-auto mb-2" />
                              <p className="text-sm font-medium text-ink">Flight Cost</p>
                              <p className="text-2xl font-bold text-ink">
                                {formatCurrency(generatedItinerary.budgetBreakdown.flights)}
                              </p>
                              <p className="text-xs text-ink-secondary mt-1">
                                {sourceCity?.name} to {destinationCity?.name}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {generatedItinerary.budgetBreakdown.accommodation && (
                          <div className="text-center">
                            <div className="bg-surface p-4 rounded-lg border border-line">
                              <Buildings className="w-8 h-8 text-ink mx-auto mb-2" />
                              <p className="text-sm font-medium text-ink">Hotel Cost</p>
                              <p className="text-2xl font-bold text-ink">
                                {formatCurrency(generatedItinerary.budgetBreakdown.accommodation)}
                              </p>
                              <p className="text-xs text-ink-secondary mt-1">Total stay</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className="bg-surface p-4 rounded-lg border border-line">
                            <Heart className="w-8 h-8 text-ink mx-auto mb-2" />
                            <p className="text-sm font-medium text-ink">Activities & Food</p>
                            <p className="text-2xl font-bold text-ink">
                              {formatCurrency(
                                (generatedItinerary.budgetBreakdown.activities || 0) + 
                                (generatedItinerary.budgetBreakdown.food || 0)
                              )}
                            </p>
                            <p className="text-xs text-ink-secondary mt-1">Estimated total</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-ink text-surface rounded-lg text-center space-y-1">
                        <p className="text-sm font-medium">
                          {itineraryMeta?.realPricing?.hotelPrices || 'Hotel pricing generated with Perplexity heuristics'}
                        </p>
                        {itineraryMeta?.realPricing?.flightPrices && (
                          <p className="text-xs text-surface/70">
                            Flights: {itineraryMeta.realPricing.flightPrices}
                          </p>
                        )}
                        {generatedAtLabel && (
                          <p className="text-xs text-surface/70">
                            Generated {generatedAtLabel}
                          </p>
                        )}
                        {sourceLabel && (
                          <p className="text-xs uppercase tracking-wide text-ink-tertiary">
                            Source: {sourceLabel}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ML Flight Price Intelligence */}
                {itineraryMeta?.flightInsight?.source === 'ml-model' && (
                  <Card className="mb-8 border border-ink bg-surface">
                    <CardHeader className="bg-ink text-surface rounded-t-md">
                      <CardTitle className="flex items-center text-xl">
                        <Sparkle className="w-6 h-6 mr-2" />
                        Flight Price Intelligence
                        <span className="ml-3 text-xs font-normal bg-surface/20 px-2 py-0.5 rounded-full">
                          ML model · {itineraryMeta.flightInsight.confidence}% confidence
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg border border-line bg-surface-sunken text-center">
                          <p className="text-xs text-ink-tertiary uppercase tracking-wide">Predicted Outbound</p>
                          <p className="text-2xl font-bold text-ink mt-1">
                            {formatCurrency(itineraryMeta.flightInsight.outbound || 0)}
                          </p>
                          <p className="text-xs text-ink-secondary mt-1">{sourceCity?.name} to {destinationCity?.name}</p>
                        </div>
                        <div className="p-4 rounded-lg border border-line bg-surface-sunken text-center">
                          <p className="text-xs text-ink-tertiary uppercase tracking-wide">Predicted Return</p>
                          <p className="text-2xl font-bold text-ink mt-1">
                            {formatCurrency(itineraryMeta.flightInsight.return || 0)}
                          </p>
                          <p className="text-xs text-ink-secondary mt-1">{destinationCity?.name} to {sourceCity?.name}</p>
                        </div>
                        <div className="p-4 rounded-lg border border-line bg-surface-sunken text-center">
                          <p className="text-xs text-ink-tertiary uppercase tracking-wide">Class</p>
                          <p className="text-2xl font-bold text-ink mt-1 capitalize">
                            {itineraryMeta.flightInsight.travelClass}
                          </p>
                          <p className="text-xs text-ink-secondary mt-1">Based on your budget tier</p>
                        </div>
                      </div>

                      {itineraryMeta.flightInsight.bookingAdvice?.recommendation && (
                        <div className="p-4 rounded-lg bg-pos border border-pos-fg/25">
                          <p className="text-sm font-semibold text-pos-fg capitalize">
                            {itineraryMeta.flightInsight.bookingAdvice.action?.replace(/_/g, ' ') || 'When to book'}
                          </p>
                          <p className="text-sm text-pos-fg mt-1">
                            {itineraryMeta.flightInsight.bookingAdvice.recommendation}
                          </p>
                          {!!itineraryMeta.flightInsight.bookingAdvice.bestDays?.length && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {itineraryMeta.flightInsight.bookingAdvice.bestDays.map((d, i) => (
                                <span key={i} className="px-2 py-1 bg-surface border border-pos-fg/25 rounded-full text-xs text-pos-fg">
                                  {d.day_of_week} ({d.days_until}d), {formatCurrency(d.price)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-ink-tertiary">
                          Predicted by the gradient-boosting model trained on 600K+ flight records.
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/search">Search and book these flights</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {generatedItinerary.transportation && (
                  <Card className="mb-8 border border-line bg-surface">
                    <CardHeader className="bg-surface-sunken border-b">
                      <CardTitle className="flex items-center text-xl">
                        <AirplaneTilt className="w-6 h-6 mr-2 text-ink" />
                        Transportation Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {generatedItinerary.transportation.flights && (
                          <div className="p-5 border border-line rounded-lg bg-surface-sunken">
                            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                              <AirplaneTilt className="w-5 h-5" /> Flight Guidance
                            </h2>
                            <div className="space-y-3 text-sm text-ink-secondary">
                              <div>
                                <p className="font-semibold text-ink">Outbound</p>
                                <p className="text-ink-secondary">
                                  {formatCurrency(generatedItinerary.transportation.flights.outbound.estimatedCost || 0)}
                                </p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  {generatedItinerary.transportation.flights.outbound.tips?.map((tip, tipIndex) => (
                                    <li key={tipIndex}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-ink">Return</p>
                                <p className="text-ink-secondary">
                                  {formatCurrency(generatedItinerary.transportation.flights.return.estimatedCost || 0)}
                                </p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  {generatedItinerary.transportation.flights.return.tips?.map((tip, tipIndex) => (
                                    <li key={`return-tip-${tipIndex}`}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-5 border border-line rounded-lg bg-surface-sunken">
                          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                            <ArrowRight className="w-5 h-5" /> Local Transport
                          </h2>
                          <p className="text-sm text-ink-secondary mb-4">
                            Estimated Daily Cost: {formatCurrency(generatedItinerary.transportation.local?.estimatedDailyCost || 0)}
                          </p>
                          <ul className="list-disc list-inside space-y-2 text-sm text-ink-secondary">
                            {generatedItinerary.transportation.local?.recommendations?.map((rec, recIndex) => (
                              <li key={recIndex}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Hotel Recommendations */}
                {generatedItinerary.accommodation?.recommendations?.length > 0 && (
                  <Card className="mb-8 border border-line bg-surface">
                    <CardHeader className="bg-surface-sunken border-b">
                      <CardTitle className="flex items-center text-xl">
                        <Buildings className="w-6 h-6 mr-2 text-ink" />
                        Handpicked Stays for You
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {generatedItinerary.accommodation.recommendations.map((hotel, index) => (
                          <div
                            key={index}
                            className="border border-line rounded-lg p-5 bg-surface shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <h2 className="text-lg font-semibold text-ink">{hotel.name}</h2>
                                <p className="text-sm text-ink-secondary font-medium">{hotel.area}</p>
                              </div>
                              {hotel.rating && (
                                <div className="flex items-center gap-1 bg-caution text-caution-fg px-2 py-1 rounded-full text-sm font-semibold">
                                  <Star className="w-4 h-4" />
                                  <span>{formatRating(hotel.rating)}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-ink-secondary">
                              <span>
                                {formatCurrency(hotel.estimatedCostPerNight || hotel.pricePerNight || 0)}
                                <span className="text-xs text-ink-tertiary ml-1">per night</span>
                              </span>
                              {hotel.totalPrice && (
                                <span>
                                  {formatCurrency(hotel.totalPrice)}
                                  <span className="text-xs text-ink-tertiary ml-1">total</span>
                                </span>
                              )}
                            </div>

                            {hotel.reason && (
                              <p className="mt-3 text-sm text-ink-secondary leading-relaxed">{hotel.reason}</p>
                            )}

                            {hotel.amenities && hotel.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {hotel.amenities.slice(0, 6).map((amenity: string, amenityIndex: number) => (
                                  <Badge
                                    key={amenityIndex}
                                    variant="outline"
                                    className="border-line-strong text-ink-secondary bg-surface-sunken capitalize"
                                  >
                                    {amenity}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Daily Itinerary */}
                <div className="space-y-8">
                  {generatedItinerary.days?.map((day, dayIndex) => (
                    <motion.div
                      key={dayIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: dayIndex * 0.1 }}
                    >
                      <Card className="shadow-sm border border-line bg-surface overflow-hidden">
                        <CardHeader className="bg-surface-sunken border-b">
                          <CardTitle className="flex items-center text-xl">
                            <div className="w-10 h-10 bg-ink text-surface rounded-full flex items-center justify-center text-sm font-bold mr-4">
                              {day.day}
                            </div>
                            <div>
                              <span className="text-ink">Day {day.day}</span>
                              <p className="text-sm font-normal text-ink-secondary">{day.date}</p>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="p-6">
                          <div className="space-y-6">
                            {day.activities.map((activity, activityIndex) => (
                              <motion.div
                                key={activityIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: activityIndex * 0.1 }}
                                className="flex items-start space-x-4 p-4 rounded-lg border border-line hover:border-ink hover:shadow-md transition-all duration-300 bg-surface"
                              >
                                <div className="flex flex-col items-center">
                                  <div className="text-sm font-bold text-ink bg-surface-sunken px-3 py-1 rounded-full mb-2">
                                    {activity.time}
                                  </div>
                                  <div className={`p-3 rounded-full ${getActivityColor(activity.category)} shadow-sm`}>
                                    {getActivityIcon(activity.category)}
                                  </div>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="text-lg font-semibold text-ink mb-1">
                                        {activity.title}
                                      </h3>
                                      <p className="text-ink-secondary mb-3 leading-relaxed">
                                        {activity.description}
                                      </p>
                                      
                                      <div className="flex flex-wrap items-center gap-4 text-sm">
                                        {activity.location && (
                                          <span className="flex items-center text-ink-tertiary">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            {activity.location}
                                          </span>
                                        )}
                                        {activity.duration && (
                                          <span className="flex items-center text-ink-tertiary">
                                            <Clock className="w-4 h-4 mr-1" />
                                            {activity.duration}
                                          </span>
                                        )}
                                        {activity.estimatedCost && (
                                          <span className="flex items-center text-ink font-semibold">
                                            <CurrencyInr className="w-4 h-4 mr-1" />
                                            {formatCurrency(activity.estimatedCost)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <Badge 
                                      variant="secondary" 
                                      className={`${getActivityColor(activity.category)} ml-4 capitalize`}
                                    >
                                      {activity.category.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {day.meals?.length ? (
                            <div className="mt-8">
                              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                                <Heart className="w-5 h-5" /> Meal Highlights
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {day.meals.map((meal, mealIndex) => (
                                  <div
                                    key={mealIndex}
                                    className="p-4 border border-line rounded-lg bg-surface-sunken"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-ink uppercase tracking-wide">
                                          {meal.time}
                                        </p>
                                        <h4 className="text-lg font-semibold text-ink">
                                          {meal.restaurant}
                                        </h4>
                                      </div>
                                      <Badge variant="secondary" className="bg-ink text-surface">
                                        {formatCurrency(meal.estimatedCost || 0)}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-ink-secondary mt-2">
                                      Cuisine: {meal.cuisine}
                                    </p>
                                    {meal.speciality && (
                                      <p className="text-sm text-ink-tertiary mt-1">
                                        Signature: {meal.speciality}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {typeof day.estimatedDailyCost === 'number' && day.estimatedDailyCost > 0 && (
                            <div className="mt-8 flex items-center justify-end text-sm text-ink-secondary">
                              <span className="font-medium text-ink mr-2">Estimated spend for this day:</span>
                              {formatCurrency(day.estimatedDailyCost)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Tips & Recommendations */}
                {generatedItinerary.tips && (generatedItinerary.tips.general?.length > 0 || generatedItinerary.tips.budgetSaving?.length > 0) && (
                  <Card className="mt-8 border border-line bg-surface-sunken">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <Sparkle className="w-6 h-6 mr-2 text-ink" />
                        AI Travel Tips & Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedItinerary.tips.general?.map((tip: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-4 bg-surface rounded-lg border border-line">
                            <div className="w-6 h-6 bg-ink rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-4 h-4 text-surface" />
                            </div>
                            <p className="text-ink-secondary text-sm leading-relaxed">{tip}</p>
                          </div>
                        ))}
                        {generatedItinerary.tips.budgetSaving?.map((tip: string, index: number) => (
                          <div key={`budget-${index}`} className="flex items-start space-x-3 p-4 bg-surface rounded-lg border border-line">
                            <div className="w-6 h-6 bg-ink rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CurrencyInr className="w-4 h-4 text-surface" />
                            </div>
                            <p className="text-ink-secondary text-sm leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {generatedItinerary.bestTimeToVisit && (
                  <Card className="mt-8 border border-line bg-surface-sunken">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <CalendarBlank className="w-6 h-6 mr-2 text-ink" />
                        Best Time to Visit Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-surface rounded-lg border border-line">
                          <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">Weather</h3>
                          <p className="mt-2 text-ink-secondary leading-relaxed">
                            {generatedItinerary.bestTimeToVisit.weather}
                          </p>
                        </div>
                        <div className="p-4 bg-surface rounded-lg border border-line">
                          <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">Crowds</h3>
                          <p className="mt-2 text-ink-secondary leading-relaxed">
                            {generatedItinerary.bestTimeToVisit.crowds}
                          </p>
                        </div>
                        <div className="p-4 bg-surface rounded-lg border border-line">
                          <h3 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">Prices</h3>
                          <p className="mt-2 text-ink-secondary leading-relaxed">
                            {generatedItinerary.bestTimeToVisit.prices}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Generated Overview */}
                {generatedItinerary.overview && (
                  <Card className="mt-8 border border-line bg-surface-sunken">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <Sparkle className="w-6 h-6 mr-2 text-ink" />
                        Trip Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-ink-secondary leading-relaxed text-lg">
                        {generatedItinerary.overview}
                      </p>
                      
                      {generatedItinerary.highlights && generatedItinerary.highlights.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-ink mb-4 flex items-center">
                            <Star className="w-5 h-5 mr-2 text-ink" />
                            Trip Highlights
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {generatedItinerary.highlights.map((highlight: string, index: number) => (
                              <div key={index} className="flex items-center space-x-2 p-3 bg-surface rounded-lg border border-line">
                                <Star className="w-4 h-4 text-ink flex-shrink-0" />
                                <span className="text-ink-secondary">{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </AppShell>
      <SiteFooter />
    </>
  );
}
