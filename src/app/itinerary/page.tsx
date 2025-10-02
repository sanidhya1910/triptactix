'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Navbar } from '@/components/layout/Navbar';
import { 
  SparklesIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  StarIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  CameraIcon,
  ShoppingBagIcon,
  HeartIcon,
  CheckIcon,
  PaperAirplaneIcon,
  GlobeAltIcon,
  FireIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { City } from '@/lib/cities';
import { motion, AnimatePresence } from 'framer-motion';
import { GeneratedItinerary } from '@/lib/perplexity-service';

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

interface ItineraryMeta {
  realPricing?: {
    flightPrices?: string;
    hotelPrices?: string;
  };
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasItinerary, setHasItinerary] = useState(false);
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
    
    if (!destinationCity) {
      alert('Please select a valid destination');
      return;
    }
    
    if (!startDate) {
      alert('Please select a start date');
      return;
    }
    
    if (!endDate) {
      alert('Please select an end date');
      return;
    }
    
    if (formData.includeFlight && !sourceCity) {
      alert('Please select your departure city');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const requestData = {
        destination: destinationCity.name,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
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
      alert('Failed to generate itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getBudgetInfo = (budget: string) => {
    switch (budget) {
      case 'budget':
        return { color: 'bg-green-100 text-green-800', range: '₹2,000-4,000/day', icon: '₹' };
      case 'mid-range':
        return { color: 'bg-blue-100 text-blue-800', range: '₹4,000-8,000/day', icon: '₹₹' };
      case 'luxury':
        return { color: 'bg-purple-100 text-purple-800', range: '₹8,000+/day', icon: '₹₹₹' };
      default:
        return { color: 'bg-gray-100 text-gray-800', range: '', icon: '' };
    }
  };

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'sightseeing':
        return <CameraIcon className="w-5 h-5" />;
      case 'food':
        return <HeartIcon className="w-5 h-5" />;
      case 'accommodation':
        return <BuildingOfficeIcon className="w-5 h-5" />;
      case 'transport':
        return <ArrowRightIcon className="w-5 h-5" />;
      case 'shopping':
        return <ShoppingBagIcon className="w-5 h-5" />;
      case 'activity':
        return <StarIcon className="w-5 h-5" />;
      default:
        return <MapPinIcon className="w-5 h-5" />;
    }
  };

  const getActivityColor = (category: string) => {
    switch (category) {
      case 'sightseeing':
        return 'bg-blue-100 text-blue-800';
      case 'food':
        return 'bg-red-100 text-red-800';
      case 'accommodation':
        return 'bg-purple-100 text-purple-800';
      case 'transport':
        return 'bg-gray-100 text-gray-800';
      case 'shopping':
        return 'bg-pink-100 text-pink-800';
      case 'activity':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-8">
              <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-black rounded-full mx-auto animate-ping opacity-20"></div>
          </div>
          <h2 className="text-3xl font-bold text-black mb-4">
            Creating Your Perfect Itinerary
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Our AI is crafting personalized experiences with real-time pricing from the best sources...
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-black rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="itinerary" showGetStarted={false} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {!hasItinerary ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-black mb-4">
                AI-Powered Trip Planner
              </h1>
              <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
                Get personalized itineraries with real flight prices, hotel recommendations, and AI-curated experiences
              </p>
            </div>

            {/* Enhanced Planning Form */}
            <Card className="max-w-5xl mx-auto shadow-xl border border-neutral-200 bg-white">
              <CardHeader className="bg-black text-white rounded-t-lg">
                <CardTitle className="text-2xl text-center flex items-center justify-center">
                  <GlobeAltIcon className="w-6 h-6 mr-2" />
                  Plan Your Perfect Journey
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={handleGenerate} className="space-y-8">
                  {/* Destination & Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        <MapPinIcon className="w-4 h-4 inline mr-1" />
                        Where do you want to go?
                      </label>
                      <CityAutocomplete
                        placeholder="Search destination..."
                        value={formData.destination}
                        onChange={(city, inputValue) => {
                          setDestinationCity(city);
                          setFormData(prev => ({ ...prev, destination: city?.name || inputValue }));
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
                        Start Date
                      </label>
                      <DatePicker
                        date={startDate}
                        onDateChange={setStartDate}
                        placeholder="Select start date"
                        minDate={today}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
                        End Date
                      </label>
                      <DatePicker
                        date={endDate}
                        onDateChange={setEndDate}
                        placeholder="Select end date"
                        minDate={startDate ?? today}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Flight Option */}
                  <Card className="border-2 border-dashed border-neutral-300 bg-neutral-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <PaperAirplaneIcon className="w-5 h-5 text-black" />
                          <Label htmlFor="includeFlight" className="text-lg font-semibold text-black">
                            Include Flight Booking
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
                              <label className="block text-sm font-semibold text-black mb-3">
                                <PaperAirplaneIcon className="w-4 h-4 inline mr-1" />
                                Flying from which city?
                              </label>
                              <CityAutocomplete
                                placeholder="Search your departure city..."
                                value={formData.flightSource}
                                onChange={(city, inputValue) => {
                                  setSourceCity(city);
                                  setFormData(prev => ({ ...prev, flightSource: city?.name || inputValue }));
                                }}
                                className="w-full"
                              />
                              <p className="text-xs text-neutral-600 mt-2">
                                We&apos;ll fetch real-time flight prices to include in your budget
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>

                  {/* Travelers & Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-3">
                        <UsersIcon className="w-4 h-4 inline mr-1" />
                        Number of Travelers
                      </label>
                      <select 
                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors"
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
                      <label className="block text-sm font-semibold text-black mb-3">
                        <CurrencyRupeeIcon className="w-4 h-4 inline mr-1" />
                        Budget Level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['budget', 'mid-range', 'luxury'] as const).map((budget) => {
                          const budgetInfo = getBudgetInfo(budget);
                          return (
                            <button
                              key={budget}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, budget }))}
                              className={`p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                                formData.budget === budget
                                  ? 'border-black bg-black text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
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
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Group Type
                      </label>
                      <select 
                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg bg-white focus:border-black transition-colors"
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
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Travel Style
                      </label>
                      <select 
                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg bg-white focus:border-black transition-colors"
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
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Fitness Level
                      </label>
                      <select 
                        className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg bg-white focus:border-black transition-colors"
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
                    <label className="block text-sm font-semibold text-black mb-4">
                      <FireIcon className="w-4 h-4 inline mr-1" />
                      What interests you most? (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          className={`p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                            formData.interests.includes(interest)
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dietary Restrictions */}
                  <div>
                    <label className="block text-sm font-semibold text-black mb-4">
                      Dietary Preferences (Optional)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {dietaryOptions.map((dietary) => (
                        <button
                          key={dietary}
                          type="button"
                          onClick={() => handleDietaryToggle(dietary)}
                          className={`p-3 rounded-lg border-2 text-xs font-medium transition-all ${
                            formData.dietaryRestrictions.includes(dietary)
                              ? 'border-neutral-800 bg-neutral-800 text-white'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {dietary}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="text-center pt-8">
                    <Button
                      type="submit"
                      size="lg"
                      className="px-12 py-4 text-lg bg-black hover:bg-neutral-800 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                      disabled={!destinationCity}
                    >
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      Generate My Perfect Itinerary
                    </Button>
                    <p className="text-xs text-neutral-500 mt-3">
                      Powered by AI with real-time pricing from Google Flights & Hotels
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Generated Itinerary Display
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold text-black mb-2">
                  Your Perfect Itinerary
                </h1>
                <p className="text-neutral-600 text-lg text-center md:text-left">
                  {destinationCity?.name} • {startDate && endDate ? `${format(startDate, 'MMM dd')} to ${format(endDate, 'MMM dd')}` : 'Select dates'} • {formData.travelers} travelers
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
                  className="border-2 hover:border-black hover:text-black"
                >
                  Edit Trip
                </Button>
                <Button className="bg-black hover:bg-neutral-800 text-white">
                  Save Itinerary
                </Button>
              </div>
            </div>

            {(generatedItinerary?.isFallback || itineraryMeta?.isFallback) && (
              <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Showing curated backup itinerary
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {generatedItinerary?.fallbackReason || itineraryMeta?.fallbackReason || 'Perplexity took too long to respond, so we generated a smart template to keep you moving.'}
                  </p>
                </div>
              </div>
            )}

            {generatedItinerary && (
              <>
                {/* Trip Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-white border-2 border-neutral-200">
                    <CardContent className="p-6 text-center">
                      <CalendarDaysIcon className="w-8 h-8 text-black mx-auto mb-3" />
                      <p className="text-sm text-neutral-600 font-medium">Duration</p>
                      <p className="text-2xl font-bold text-black">
                        {itineraryDuration || 0} Days
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-2 border-neutral-200">
                    <CardContent className="p-6 text-center">
                      <MapPinIcon className="w-8 h-8 text-black mx-auto mb-3" />
                      <p className="text-sm text-neutral-600 font-medium">Activities</p>
                      <p className="text-2xl font-bold text-black">
                        {generatedItinerary.days?.reduce<number>((acc, day) => acc + day.activities.length, 0) ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-2 border-neutral-200">
                    <CardContent className="p-6 text-center">
                      <CurrencyRupeeIcon className="w-8 h-8 text-black mx-auto mb-3" />
                      <p className="text-sm text-neutral-600 font-medium">Total Budget</p>
                      <p className="text-2xl font-bold text-black">
                        {generatedItinerary.budgetBreakdown?.total ? 
                          formatCurrency(generatedItinerary.budgetBreakdown.total) : 
                          'N/A'
                        }
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border-2 border-neutral-200">
                    <CardContent className="p-6 text-center">
                      <StarIcon className="w-8 h-8 text-black mx-auto mb-3" />
                      <p className="text-sm text-neutral-600 font-medium">AI Score</p>
                      <p className="text-2xl font-bold text-black">95%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing Breakdown */}
                {generatedItinerary.budgetBreakdown && (
                  <Card className="mb-8 border-2 border-neutral-200 bg-neutral-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <CurrencyRupeeIcon className="w-6 h-6 mr-2 text-black" />
                        Real-Time Pricing Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {formData.includeFlight && generatedItinerary.budgetBreakdown.flights && (
                          <div className="text-center">
                            <div className="bg-white p-4 rounded-lg border border-neutral-200">
                              <PaperAirplaneIcon className="w-8 h-8 text-black mx-auto mb-2" />
                              <p className="text-sm font-medium text-black">Flight Cost</p>
                              <p className="text-2xl font-bold text-black">
                                {formatCurrency(generatedItinerary.budgetBreakdown.flights)}
                              </p>
                              <p className="text-xs text-neutral-600 mt-1">
                                {sourceCity?.name} → {destinationCity?.name}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {generatedItinerary.budgetBreakdown.accommodation && (
                          <div className="text-center">
                            <div className="bg-white p-4 rounded-lg border border-neutral-200">
                              <BuildingOfficeIcon className="w-8 h-8 text-black mx-auto mb-2" />
                              <p className="text-sm font-medium text-black">Hotel Cost</p>
                              <p className="text-2xl font-bold text-black">
                                {formatCurrency(generatedItinerary.budgetBreakdown.accommodation)}
                              </p>
                              <p className="text-xs text-neutral-600 mt-1">Total stay</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className="bg-white p-4 rounded-lg border border-neutral-200">
                            <HeartIcon className="w-8 h-8 text-black mx-auto mb-2" />
                            <p className="text-sm font-medium text-black">Activities & Food</p>
                            <p className="text-2xl font-bold text-black">
                              {formatCurrency(
                                (generatedItinerary.budgetBreakdown.activities || 0) + 
                                (generatedItinerary.budgetBreakdown.food || 0)
                              )}
                            </p>
                            <p className="text-xs text-neutral-600 mt-1">Estimated total</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-black text-white rounded-lg text-center space-y-1">
                        <p className="text-sm font-medium">
                          {itineraryMeta?.realPricing?.hotelPrices || 'Hotel pricing generated with Perplexity heuristics'}
                        </p>
                        {itineraryMeta?.realPricing?.flightPrices && (
                          <p className="text-xs text-neutral-200">
                            Flights: {itineraryMeta.realPricing.flightPrices}
                          </p>
                        )}
                        {generatedAtLabel && (
                          <p className="text-xs text-neutral-200">
                            Generated {generatedAtLabel}
                          </p>
                        )}
                        {sourceLabel && (
                          <p className="text-xs uppercase tracking-wide text-neutral-300">
                            Source: {sourceLabel}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {generatedItinerary.transportation && (
                  <Card className="mb-8 border-2 border-neutral-200 bg-white">
                    <CardHeader className="bg-neutral-50 border-b">
                      <CardTitle className="flex items-center text-xl">
                        <PaperAirplaneIcon className="w-6 h-6 mr-2 text-black" />
                        Transportation Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {generatedItinerary.transportation.flights && (
                          <div className="p-5 border border-neutral-200 rounded-xl bg-neutral-50">
                            <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                              <PaperAirplaneIcon className="w-5 h-5" /> Flight Guidance
                            </h3>
                            <div className="space-y-3 text-sm text-neutral-700">
                              <div>
                                <p className="font-semibold text-neutral-800">Outbound</p>
                                <p className="text-neutral-600">
                                  {formatCurrency(generatedItinerary.transportation.flights.outbound.estimatedCost || 0)}
                                </p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  {generatedItinerary.transportation.flights.outbound.tips?.map((tip, tipIndex) => (
                                    <li key={tipIndex}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-800">Return</p>
                                <p className="text-neutral-600">
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

                        <div className="p-5 border border-neutral-200 rounded-xl bg-neutral-50">
                          <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                            <ArrowRightIcon className="w-5 h-5" /> Local Transport
                          </h3>
                          <p className="text-sm text-neutral-700 mb-4">
                            Estimated Daily Cost: {formatCurrency(generatedItinerary.transportation.local?.estimatedDailyCost || 0)}
                          </p>
                          <ul className="list-disc list-inside space-y-2 text-sm text-neutral-700">
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
                  <Card className="mb-8 border-2 border-neutral-200 bg-white">
                    <CardHeader className="bg-neutral-50 border-b">
                      <CardTitle className="flex items-center text-xl">
                        <BuildingOfficeIcon className="w-6 h-6 mr-2 text-black" />
                        Handpicked Stays for You
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {generatedItinerary.accommodation.recommendations.map((hotel, index) => (
                          <div
                            key={index}
                            className="border border-neutral-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-black">{hotel.name}</h3>
                                <p className="text-sm text-neutral-600 font-medium">{hotel.area}</p>
                              </div>
                              {hotel.rating && (
                                <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-semibold">
                                  <StarIcon className="w-4 h-4" />
                                  <span>{formatRating(hotel.rating)}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-neutral-700">
                              <span>
                                {formatCurrency(hotel.estimatedCostPerNight || hotel.pricePerNight || 0)}
                                <span className="text-xs text-neutral-500 ml-1">per night</span>
                              </span>
                              {hotel.totalPrice && (
                                <span>
                                  {formatCurrency(hotel.totalPrice)}
                                  <span className="text-xs text-neutral-500 ml-1">total</span>
                                </span>
                              )}
                            </div>

                            {hotel.reason && (
                              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{hotel.reason}</p>
                            )}

                            {hotel.amenities && hotel.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {hotel.amenities.slice(0, 6).map((amenity: string, amenityIndex: number) => (
                                  <Badge
                                    key={amenityIndex}
                                    variant="outline"
                                    className="border-neutral-300 text-neutral-700 bg-neutral-100 capitalize"
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
                      <Card className="shadow-lg border border-neutral-200 bg-white overflow-hidden">
                        <CardHeader className="bg-neutral-50 border-b">
                          <CardTitle className="flex items-center text-xl">
                            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                              {day.day}
                            </div>
                            <div>
                              <span className="text-black">Day {day.day}</span>
                              <p className="text-sm font-normal text-neutral-600">{day.date}</p>
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
                                className="flex items-start space-x-4 p-4 rounded-xl border border-gray-200 hover:border-black hover:shadow-md transition-all duration-300 bg-white"
                              >
                                <div className="flex flex-col items-center">
                                  <div className="text-sm font-bold text-black bg-neutral-100 px-3 py-1 rounded-full mb-2">
                                    {activity.time}
                                  </div>
                                  <div className={`p-3 rounded-full ${getActivityColor(activity.category)} shadow-sm`}>
                                    {getActivityIcon(activity.category)}
                                  </div>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="text-lg font-semibold text-black mb-1">
                                        {activity.title}
                                      </h4>
                                      <p className="text-neutral-600 mb-3 leading-relaxed">
                                        {activity.description}
                                      </p>
                                      
                                      <div className="flex flex-wrap items-center gap-4 text-sm">
                                        {activity.location && (
                                          <span className="flex items-center text-neutral-500">
                                            <MapPinIcon className="w-4 h-4 mr-1" />
                                            {activity.location}
                                          </span>
                                        )}
                                        {activity.duration && (
                                          <span className="flex items-center text-neutral-500">
                                            <ClockIcon className="w-4 h-4 mr-1" />
                                            {activity.duration}
                                          </span>
                                        )}
                                        {activity.estimatedCost && (
                                          <span className="flex items-center text-black font-semibold">
                                            <CurrencyRupeeIcon className="w-4 h-4 mr-1" />
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
                              <h4 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
                                <HeartIcon className="w-5 h-5" /> Meal Highlights
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {day.meals.map((meal, mealIndex) => (
                                  <div
                                    key={mealIndex}
                                    className="p-4 border border-neutral-200 rounded-xl bg-neutral-50"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-semibold text-neutral-800 uppercase tracking-wide">
                                          {meal.time}
                                        </p>
                                        <h5 className="text-lg font-semibold text-black">
                                          {meal.restaurant}
                                        </h5>
                                      </div>
                                      <Badge variant="secondary" className="bg-black text-white">
                                        {formatCurrency(meal.estimatedCost || 0)}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-neutral-600 mt-2">
                                      Cuisine: {meal.cuisine}
                                    </p>
                                    {meal.speciality && (
                                      <p className="text-sm text-neutral-500 mt-1">
                                        Signature: {meal.speciality}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {typeof day.estimatedDailyCost === 'number' && day.estimatedDailyCost > 0 && (
                            <div className="mt-8 flex items-center justify-end text-sm text-neutral-600">
                              <span className="font-medium text-black mr-2">Estimated spend for this day:</span>
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
                  <Card className="mt-8 border-2 border-neutral-200 bg-neutral-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <SparklesIcon className="w-6 h-6 mr-2 text-black" />
                        AI Travel Tips & Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedItinerary.tips.general?.map((tip: string, index: number) => (
                          <div key={index} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-neutral-200">
                            <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-neutral-700 text-sm leading-relaxed">{tip}</p>
                          </div>
                        ))}
                        {generatedItinerary.tips.budgetSaving?.map((tip: string, index: number) => (
                          <div key={`budget-${index}`} className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-neutral-200">
                            <div className="w-6 h-6 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <CurrencyRupeeIcon className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-neutral-700 text-sm leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {generatedItinerary.bestTimeToVisit && (
                  <Card className="mt-8 border-2 border-neutral-200 bg-neutral-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <CalendarDaysIcon className="w-6 h-6 mr-2 text-black" />
                        Best Time to Visit Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-neutral-200">
                          <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">Weather</h4>
                          <p className="mt-2 text-neutral-700 leading-relaxed">
                            {generatedItinerary.bestTimeToVisit.weather}
                          </p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-neutral-200">
                          <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">Crowds</h4>
                          <p className="mt-2 text-neutral-700 leading-relaxed">
                            {generatedItinerary.bestTimeToVisit.crowds}
                          </p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-neutral-200">
                          <h4 className="text-sm font-semibold text-neutral-600 uppercase tracking-wide">Prices</h4>
                          <p className="mt-2 text-neutral-700 leading-relaxed">
                            {generatedItinerary.bestTimeToVisit.prices}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Generated Overview */}
                {generatedItinerary.overview && (
                  <Card className="mt-8 border-2 border-neutral-200 bg-neutral-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <SparklesIcon className="w-6 h-6 mr-2 text-black" />
                        Trip Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-neutral-700 leading-relaxed text-lg">
                        {generatedItinerary.overview}
                      </p>
                      
                      {generatedItinerary.highlights && generatedItinerary.highlights.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-semibold text-black mb-4 flex items-center">
                            <StarIcon className="w-5 h-5 mr-2 text-black" />
                            Trip Highlights
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {generatedItinerary.highlights.map((highlight: string, index: number) => (
                              <div key={index} className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-neutral-200">
                                <StarIcon className="w-4 h-4 text-black flex-shrink-0" />
                                <span className="text-neutral-700">{highlight}</span>
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
