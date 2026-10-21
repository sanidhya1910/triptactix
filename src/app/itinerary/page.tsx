'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Stat } from '@/components/ui/stat';
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
  Warning,
  Wallet
} from '@phosphor-icons/react/ssr';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { City } from '@/lib/cities';
import { motion, AnimatePresence } from 'framer-motion';
import { GeneratedItinerary } from '@/lib/perplexity-service';

type PlannerErrors = Partial<Record<'destination' | 'startDate' | 'endDate' | 'source', string>>;
import { getTrip, saveTrip } from '@/lib/saved-trips';
import { parseISODate } from '@/lib/dates';
import { fromItinerary } from '@/lib/planner/from-itinerary';
import { useTrip as usePlanner } from '@/lib/planner/store';
import { tripHref } from '@/components/planner/BudgetList';

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
  /** ml-model: fares from the trained model. unavailable: the AI's own estimate is used. */
  source: 'ml-model' | 'unavailable';
  travelClass?: string;
  outbound?: number;
  return?: number;
  perPerson?: { outbound: number; return: number };
  travelers?: number;
  confidence?: number | null;
  reason?: string;
}

interface ItineraryMeta {
  flightInsight?: FlightInsight | null;
  generatedAt?: string;
  /** Set when shown from My trips rather than freshly generated. */
  savedAt?: string;
}

/** Why there is no itinerary to show, from the API's error code. */
interface Failure {
  code: 'ai_unavailable' | 'ai_busy' | 'ai_timeout' | 'ai_failed' | 'bad_request' | 'network' | 'not_found';
  message: string;
}

/** How long to wait before giving up. The server stops the AI call at 50 seconds. */
const GENERATE_TIMEOUT_MS = 70_000;

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

export default function ItineraryPage() {
  // useSearchParams needs a Suspense boundary for this page to stay statically rendered.
  return (
    <Suspense fallback={null}>
      <EnhancedItineraryPage />
    </Suspense>
  );
}

/** Why an itinerary could not be built, said plainly, with the next useful step. */
function FailureNotice({ failure }: { failure: Failure }) {
  if (failure.code === 'ai_unavailable') {
    return (
      <div role="alert" className="mt-6 rounded-lg border border-line bg-surface-sunken p-5">
        <p className="font-medium text-ink">AI itineraries aren’t connected yet</p>
        <p className="mt-1 text-sm text-ink-secondary">
          We won’t show a made-up plan in its place. You can still cost a trip day by day yourself.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/planner">Open the budget planner</Link>
        </Button>
      </div>
    );
  }
  const retryable = failure.code !== 'bad_request' && failure.code !== 'not_found';
  return (
    <div role="alert" className="mt-6 rounded-lg border border-neg-fg/25 bg-neg p-5">
      <p className="font-medium text-neg-fg">
        {failure.code === 'not_found' ? 'That saved itinerary isn’t on this device' : 'The itinerary wasn’t built'}
      </p>
      <p className="mt-1 text-sm text-neg-fg">{failure.message}</p>
      {retryable && (
        <Button type="submit" variant="outline" size="sm" className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}

function EnhancedItineraryPage() {
  const searchParams = useSearchParams();
  const savedId = searchParams.get('saved');
  const [errors, setErrors] = useState<PlannerErrors>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasItinerary, setHasItinerary] = useState(false);
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  // The saved entry's id, so a budget made afterwards can link back to it.
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [generatedItinerary, setGeneratedItinerary] = useState<GeneratedItinerary | null>(null);
  const [itineraryMeta, setItineraryMeta] = useState<ItineraryMeta | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
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

  // /itinerary?saved=<id> shows an itinerary saved earlier, from My trips. "Open planner"
  // there used to link to an empty form, so a saved itinerary could never be seen again.
  useEffect(() => {
    if (!savedId) return;
    const saved = getTrip(savedId);
    const snapshot = saved?.itinerary as GeneratedItinerary | undefined;
    if (!saved || !snapshot || !Array.isArray(snapshot.days) || snapshot.days.length === 0) {
      setFailure({ code: 'not_found', message: 'Saved trips live in this browser only, so it may have been removed or saved on another device. Plan a new one below.' });
      return;
    }
    setGeneratedItinerary(snapshot);
    setItineraryMeta({ savedAt: saved.savedAt });
    setFormData((prev) => ({
      ...prev,
      destination: saved.destination,
      startDate: saved.startDate,
      endDate: saved.endDate,
      travelers: saved.travelers,
      budget: (['budget', 'mid-range', 'luxury'] as const).find((b) => b === saved.budget) ?? prev.budget,
      flightSource: saved.flightSource ?? '',
      includeFlight: Boolean(saved.flightSource),
    }));
    setStartDate(parseISODate(saved.startDate) ?? undefined);
    setEndDate(parseISODate(saved.endDate) ?? undefined);
    setSavedTripId(saved.id);
    setIsSaved(true);
    setHasItinerary(true);
  }, [savedId]);

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

  // Every itinerary shown here is from the AI: there is no template fallback any more.
  const sourceLabel = itineraryMeta?.savedAt ? 'Perplexity AI, saved on this device' : itineraryMeta ? 'Perplexity AI' : null;

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
    if (startDate && endDate && endDate < startDate) nextErrors.endDate = 'The trip ends before it starts.';
    if (formData.includeFlight && !sourceCity) {
      nextErrors.source = 'Pick the city you are flying from.';
    }

    setErrors(nextErrors);
    const firstError = (['destination', 'startDate', 'endDate', 'source'] as const).find((k) => nextErrors[k]);
    if (firstError) {
      // Take the user to the first problem rather than only announcing that there is one.
      document.getElementById({ destination: 'itinerary-destination', startDate: 'trip-start', endDate: 'trip-end', source: 'itinerary-source' }[firstError])?.focus();
      return;
    }

    setIsGenerating(true);
    setIsSaved(false);
    setSavedTripId(null);
    setFailure(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

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
      
      
      const response = await fetch('/api/itinerary/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);

      if (result?.success) {
        setGeneratedItinerary(result.data.itinerary);
        setItineraryMeta({ flightInsight: result.data.flightInsight ?? null, generatedAt: result.data.generatedAt });
        setHasItinerary(true);
      } else {
        setFailure({
          code: result?.code ?? 'ai_failed',
          message: result?.error ?? 'The planning service didn’t respond. Try again in a moment.',
        });
      }
    } catch (error) {
      setFailure(
        controller.signal.aborted
          ? { code: 'ai_timeout', message: 'The AI took too long to answer. Try again, or plan fewer days.' }
          : { code: 'network', message: 'We couldn’t reach the planning service. Check your connection and try again.' },
      );
    } finally {
      clearTimeout(timer);
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
              Asking the AI for a day-by-day plan. This usually takes 20 to 40 seconds.
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
                every activity, meal and stay costed, ready to turn into a budget.
              </p>
            </header>

            {/* Arriving from a stale link, the reason belongs above the form, not beside submit. */}
            {failure?.code === 'not_found' && <FailureNotice failure={failure} />}

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
                      <label htmlFor="trip-start" className="mb-2 block text-sm font-medium text-ink">Start date</label>
                      <DatePicker
                        id="trip-start"
                        invalid={Boolean(errors.startDate)}
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
                      <label htmlFor="trip-end" className="mb-2 block text-sm font-medium text-ink">End date</label>
                      <DatePicker
                        id="trip-end"
                        invalid={Boolean(errors.endDate)}
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
                                  Flights between the six metros are priced by the fare model and added to the budget.
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
                      <label htmlFor="trip-travellers" className="block text-sm font-semibold text-ink mb-3">
                        <Users className="w-4 h-4 inline mr-1" />
                        Travellers
                      </label>
                      <select 
                        id="trip-travellers"
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
                      <p id="trip-budget-label" className="block text-sm font-semibold text-ink mb-3">
                        <CurrencyInr className="w-4 h-4 inline mr-1" />
                        Budget
                      </p>
                      <div role="group" aria-labelledby="trip-budget-label" className="grid grid-cols-3 gap-2">
                        {(['budget', 'mid-range', 'luxury'] as const).map((budget) => {
                          const budgetInfo = getBudgetInfo(budget);
                          return (
                            <button
                              key={budget}
                              type="button"
                              aria-pressed={formData.budget === budget}
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
                      <label htmlFor="trip-group" className="block text-sm font-semibold text-ink mb-3">
                        Group type
                      </label>
                      <select 
                        id="trip-group"
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
                      <label htmlFor="trip-style" className="block text-sm font-semibold text-ink mb-3">
                        Travel style
                      </label>
                      <select 
                        id="trip-style"
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
                      <label htmlFor="trip-pace" className="block text-sm font-semibold text-ink mb-3">
                        Walking pace
                      </label>
                      <select 
                        id="trip-pace"
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
                    <p id="trip-interests-label" className="block text-sm font-semibold text-ink mb-4">
                      <Fire className="w-4 h-4 inline mr-1" />
                      Interests
                    </p>
                    <div role="group" aria-labelledby="trip-interests-label" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          aria-pressed={formData.interests.includes(interest)}
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
                    <p id="trip-diet-label" className="block text-sm font-semibold text-ink mb-4">
                      Dietary preferences
                    </p>
                    <div role="group" aria-labelledby="trip-diet-label" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {dietaryOptions.map((dietary) => (
                        <button
                          key={dietary}
                          type="button"
                          aria-pressed={formData.dietaryRestrictions.includes(dietary)}
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
                    {/* Always enabled: a disabled button never explains itself, the validation does. */}
                    <Button type="submit" size="lg">
                      Build the itinerary
                    </Button>
                    <p className="mt-3 text-xs text-ink-tertiary">
                      Costs are the AI’s estimates. Flights between the six metros come from the fare model when it is connected.
                    </p>
                    {failure && failure.code !== 'not_found' && <FailureNotice failure={failure} />}
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
                <h1 className="text-display-sm text-ink">{generatedItinerary?.destination || destinationCity?.name || formData.destination}</h1>
                <p className="mt-2 text-ink-secondary [font-variant-numeric:tabular-nums]">
                  {startDate && endDate
                    ? `${format(startDate, 'd MMM')} to ${format(endDate, 'd MMM')}`
                    : 'Dates not set'}{' '}
                  · {formData.travelers} {formData.travelers === 1 ? 'traveller' : 'travellers'}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setHasItinerary(false);
                    setGeneratedItinerary(null);
                    setItineraryMeta(null);
                  }}
                >
                  Edit trip
                </Button>
                <Button
                  variant="outline"
                  disabled={!generatedItinerary}
                  onClick={() => {
                    if (!generatedItinerary) return;
                    const budget = fromItinerary(generatedItinerary, {
                      startDate: formData.startDate || (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
                      travelers: formData.travelers,
                      savedTripId: savedTripId ?? undefined,
                    });
                    if (!budget) {
                      toast.error('This itinerary has no days to turn into a budget');
                      return;
                    }
                    const [id] = usePlanner.getState().addTrips([budget]);
                    router.push(tripHref(id));
                  }}
                >
                  <Wallet className="h-4 w-4" />
                  Turn into a budget
                </Button>
                <Button
                  disabled={isSaved || !generatedItinerary}
                  onClick={() => {
                    if (!generatedItinerary) return;
                    const saved = saveTrip({
                      destination: generatedItinerary.destination || destinationCity?.name || formData.destination,
                      flightSource: formData.includeFlight ? sourceCity?.name : undefined,
                      startDate: formData.startDate || (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
                      endDate: formData.endDate || (endDate ? format(endDate, 'yyyy-MM-dd') : ''),
                      travelers: formData.travelers,
                      budget: formData.budget,
                      totalCost: generatedItinerary.budgetBreakdown?.total,
                      itinerary: generatedItinerary,
                    });
                    if (!saved) {
                      toast.error('Couldn’t save on this device', {
                        description: 'Browser storage is full or turned off. Remove an older trip from My trips and try again.',
                      });
                      return;
                    }
                    setSavedTripId(saved.id);
                    setIsSaved(true);
                    toast.success('Saved to My trips');
                  }}
                >
                  {isSaved ? 'Saved' : 'Save trip'}
                </Button>
              </div>
            </div>

            {generatedItinerary && (
              <>
                {/* Summary. Every figure is the AI's estimate, and says so. */}
                <div className="mb-8 grid grid-cols-2 gap-x-8 gap-y-8 border-y border-line py-8 md:grid-cols-4 md:divide-x md:divide-line">
                  <Stat value={String(generatedItinerary.days?.length || itineraryDuration || 0)} label={(generatedItinerary.days?.length ?? 0) === 1 ? 'Day' : 'Days'} className="md:pr-8" />
                  <Stat
                    value={String(generatedItinerary.days?.reduce<number>((acc, day) => acc + day.activities.length, 0) ?? 0)}
                    label="Activities"
                    className="md:px-8"
                  />
                  <Stat
                    value={generatedItinerary.budgetBreakdown?.total ? formatCurrency(generatedItinerary.budgetBreakdown.total) : '—'}
                    label="Estimated total"
                    detail={`for ${formData.travelers} ${formData.travelers === 1 ? 'traveller' : 'travellers'}`}
                    className="md:px-8"
                  />
                  <Stat
                    value={
                      generatedItinerary.budgetBreakdown?.total
                        ? formatCurrency(Math.round(generatedItinerary.budgetBreakdown.total / Math.max(1, formData.travelers)))
                        : '—'
                    }
                    label="Per person"
                    className="md:pl-8"
                  />
                </div>

                {generatedItinerary.budgetBreakdown && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle as="h2" className="flex items-center text-xl">
                        <CurrencyInr className="mr-2 h-6 w-6 text-ink" />
                        Estimated costs
                      </CardTitle>
                      <p className="text-sm text-ink-secondary">
                        These are the AI’s estimates, not quotes. Turn this into a budget to adjust them as you book.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
                        {(
                          [
                            [
                              'Flights',
                              generatedItinerary.budgetBreakdown.flights,
                              itineraryMeta?.flightInsight?.source === 'ml-model' ? 'From the fare model' : 'AI estimate',
                            ],
                            [
                              'Stay',
                              generatedItinerary.budgetBreakdown.accommodation,
                              `${Math.max(0, (generatedItinerary.days?.length ?? 1) - 1)} ${(generatedItinerary.days?.length ?? 1) - 1 === 1 ? 'night' : 'nights'}`,
                            ],
                            ['Activities', generatedItinerary.budgetBreakdown.activities, undefined],
                            ['Food', generatedItinerary.budgetBreakdown.food, undefined],
                            ['Local transport', generatedItinerary.budgetBreakdown.transportation, undefined],
                            ['Other', generatedItinerary.budgetBreakdown.miscellaneous, undefined],
                          ] as Array<[string, number | undefined, string | undefined]>
                        )
                          .filter(([, amount]) => typeof amount === 'number' && amount > 0)
                          .map(([label, amount, note]) => (
                            <div key={label}>
                              <dt className="text-xs text-ink-tertiary">{label}</dt>
                              <dd className="mt-1 font-mono text-lg text-ink [font-variant-numeric:tabular-nums]">{formatCurrency(amount!)}</dd>
                              {note && <dd className="text-xs text-ink-tertiary">{note}</dd>}
                            </div>
                          ))}
                      </dl>
                      {(generatedAtLabel || sourceLabel) && (
                        <p className="mt-6 border-t border-line pt-4 text-xs text-ink-tertiary">
                          {sourceLabel}
                          {generatedAtLabel && ` · generated ${generatedAtLabel}`}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {itineraryMeta?.flightInsight?.source === 'unavailable' && itineraryMeta.flightInsight.reason && (
                  <p className="mb-8 flex gap-2 rounded-lg border border-line bg-surface-sunken p-4 text-sm text-ink-secondary">
                    <AirplaneTilt aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary" />
                    {itineraryMeta.flightInsight.reason}
                  </p>
                )}

                {itineraryMeta?.flightInsight?.source === 'ml-model' && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle as="h2" className="flex flex-wrap items-center gap-3 text-xl">
                        <AirplaneTilt className="h-6 w-6 text-ink" />
                        Forecast flight fares
                        {typeof itineraryMeta.flightInsight.confidence === 'number' && (
                          <Badge variant="info">{itineraryMeta.flightInsight.confidence}% model confidence</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-ink-secondary">
                        From the fare model, {itineraryMeta.flightInsight.travelClass} class, for {itineraryMeta.flightInsight.travelers ?? formData.travelers}{' '}
                        {(itineraryMeta.flightInsight.travelers ?? formData.travelers) === 1 ? 'traveller' : 'travellers'}.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <dl className="grid gap-4 sm:grid-cols-2">
                        {(
                          [
                            ['Outbound', sourceCity?.name, destinationCity?.name, itineraryMeta.flightInsight.outbound, itineraryMeta.flightInsight.perPerson?.outbound],
                            ['Return', destinationCity?.name, sourceCity?.name, itineraryMeta.flightInsight.return, itineraryMeta.flightInsight.perPerson?.return],
                          ] as const
                        ).map(([label, from, to, total, each]) => (
                          <div key={label} className="rounded-lg border border-line bg-surface-sunken p-4">
                            <dt className="text-xs text-ink-tertiary">
                              {label}, {from} to {to}
                            </dt>
                            <dd className="mt-1 font-mono text-2xl text-ink [font-variant-numeric:tabular-nums]">{formatCurrency(total || 0)}</dd>
                            {each !== undefined && (
                              <dd className="text-xs text-ink-tertiary">{formatCurrency(each)} per person</dd>
                            )}
                          </div>
                        ))}
                      </dl>
                      {sourceCity && destinationCity && (
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/search?${new URLSearchParams({
                              from: sourceCity.name,
                              to: destinationCity.name,
                              ...(formData.startDate ? { date: formData.startDate } : {}),
                              ...(formData.endDate && formData.endDate !== formData.startDate ? { return: formData.endDate } : {}),
                              adults: String(formData.travelers),
                            })}`}
                          >
                            Compare live fares for these dates
                          </Link>
                        </Button>
                      )}
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
