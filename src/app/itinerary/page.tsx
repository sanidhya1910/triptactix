'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  CheckIcon
} from '@heroicons/react/24/outline';

interface ItineraryDay {
  day: number;
  date: string;
  activities: {
    time: string;
    title: string;
    description: string;
    location: string;
    duration: string;
    cost?: string;
    type: 'sightseeing' | 'food' | 'hotel' | 'transport' | 'shopping' | 'activity';
  }[];
}

const sampleItinerary: ItineraryDay[] = [
  {
    day: 1,
    date: 'March 15, 2024',
    activities: [
      {
        time: '09:00',
        title: 'Arrival & Hotel Check-in',
        description: 'Arrive at Goa airport and transfer to your beachside hotel',
        location: 'Baga Beach Resort',
        duration: '2 hours',
        cost: '₹2,500',
        type: 'hotel'
      },
      {
        time: '12:00',
        title: 'Lunch at Beach Shack',
        description: 'Try authentic Goan seafood at a popular beach shack',
        location: 'Britto\'s Beach Shack',
        duration: '1.5 hours',
        cost: '₹1,200',
        type: 'food'
      },
      {
        time: '15:00',
        title: 'Calangute Beach',
        description: 'Relax on the golden sands and enjoy water sports',
        location: 'Calangute Beach',
        duration: '3 hours',
        cost: '₹500',
        type: 'activity'
      }
    ]
  },
  {
    day: 2,
    date: 'March 16, 2024',
    activities: [
      {
        time: '08:00',
        title: 'Old Goa Churches',
        description: 'Visit historic churches including Basilica of Bom Jesus',
        location: 'Old Goa',
        duration: '4 hours',
        cost: '₹300',
        type: 'sightseeing'
      },
      {
        time: '13:00',
        title: 'Traditional Goan Lunch',
        description: 'Experience authentic Goan cuisine in a heritage restaurant',
        location: 'Viva Panjim',
        duration: '1.5 hours',
        cost: '₹800',
        type: 'food'
      },
      {
        time: '16:00',
        title: 'Spice Plantation Tour',
        description: 'Learn about spice cultivation and enjoy elephant rides',
        location: 'Sahakari Spice Farm',
        duration: '3 hours',
        cost: '₹1,500',
        type: 'activity'
      }
    ]
  }
];

export default function ItineraryPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasItinerary, setHasItinerary] = useState(false);
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: '2',
    budget: '',
    interests: [] as string[]
  });

  const interests = [
    'Adventure Sports',
    'Historical Sites',
    'Food & Cuisine',
    'Beach Activities',
    'Shopping',
    'Photography',
    'Nightlife',
    'Nature & Wildlife',
    'Art & Culture',
    'Spiritual Places'
  ];

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      setHasItinerary(true);
    }, 3000);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sightseeing':
        return <CameraIcon className="w-5 h-5" />;
      case 'food':
        return <HeartIcon className="w-5 h-5" />;
      case 'hotel':
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

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'sightseeing':
        return 'bg-blue-100 text-blue-800';
      case 'food':
        return 'bg-red-100 text-red-800';
      case 'hotel':
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

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Creating Your Perfect Itinerary</h2>
          <p className="text-neutral-600 mb-8">Our AI is planning amazing experiences for you...</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-black rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="text-2xl font-bold text-black">
              Triptactix
            </a>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-neutral-600 hover:text-black transition-colors">
                Home
              </a>
              <a href="/search" className="text-neutral-600 hover:text-black transition-colors">
                Search
              </a>
              <a href="/itinerary" className="text-black font-semibold">
                AI Planner
              </a>
              <a href="/dashboard" className="text-neutral-600 hover:text-black transition-colors">
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!hasItinerary ? (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-black mb-4">
                AI-Powered Trip Planner
              </h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Tell us your preferences and let our AI create a personalized itinerary just for you
              </p>
            </div>

            {/* Planning Form */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Plan Your Perfect Trip</CardTitle>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-8">
                  {/* Destination & Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Destination
                      </label>
                      <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <Input
                          placeholder="Where do you want to go?"
                          className="pl-10"
                          value={formData.destination}
                          onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Start Date
                      </label>
                      <div className="relative">
                        <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <Input
                          type="date"
                          className="pl-10"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <Input
                          type="date"
                          className="pl-10"
                          value={formData.endDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Travelers & Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Number of Travelers
                      </label>
                      <div className="relative">
                        <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <select 
                          className="w-full h-12 pl-10 pr-4 border-2 border-neutral-300 rounded-lg bg-white text-neutral-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors"
                          value={formData.travelers}
                          onChange={(e) => setFormData(prev => ({ ...prev, travelers: e.target.value }))}
                        >
                          <option value="1">1 Person</option>
                          <option value="2">2 People</option>
                          <option value="3">3 People</option>
                          <option value="4">4 People</option>
                          <option value="5+">5+ People</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Budget (Optional)
                      </label>
                      <div className="relative">
                        <CurrencyRupeeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <Input
                          placeholder="Enter your budget"
                          className="pl-10"
                          value={formData.budget}
                          onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-sm font-semibold text-black mb-4">
                      What are you interested in? (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {interests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            formData.interests.includes(interest)
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="text-center pt-6">
                    <Button
                      type="submit"
                      size="lg"
                      className="px-12 py-4 text-lg"
                    >
                      <SparklesIcon className="w-5 h-5 mr-2" />
                      Generate AI Itinerary
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Generated Itinerary */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-black">Your AI-Generated Itinerary</h1>
                  <p className="text-neutral-600 mt-2">Goa, India • March 15-17, 2024 • 2 Travelers</p>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline">
                    Edit Trip
                  </Button>
                  <Button>
                    Save Itinerary
                  </Button>
                </div>
              </div>
            </div>

            {/* Trip Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <ClockIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">Duration</p>
                  <p className="text-lg font-bold text-black">3 Days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <MapPinIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">Activities</p>
                  <p className="text-lg font-bold text-black">6 Planned</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <CurrencyRupeeIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">Est. Cost</p>
                  <p className="text-lg font-bold text-black">₹12,600</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <StarIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">AI Score</p>
                  <p className="text-lg font-bold text-black">95%</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Itinerary */}
            <div className="space-y-8">
              {sampleItinerary.map((day) => (
                <Card key={day.day}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {day.day}
                      </div>
                      Day {day.day} - {day.date}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {day.activities.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors">
                          <div className="text-sm font-semibold text-neutral-900 min-w-[60px]">
                            {activity.time}
                          </div>
                          
                          <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-semibold text-black">{activity.title}</h4>
                            <p className="text-neutral-600 text-sm mt-1">{activity.description}</p>
                            <div className="flex items-center text-xs text-neutral-500 mt-2 space-x-4">
                              <span className="flex items-center">
                                <MapPinIcon className="w-3 h-3 mr-1" />
                                {activity.location}
                              </span>
                              <span className="flex items-center">
                                <ClockIcon className="w-3 h-3 mr-1" />
                                {activity.duration}
                              </span>
                              {activity.cost && (
                                <span className="flex items-center font-semibold text-black">
                                  <CurrencyRupeeIcon className="w-3 h-3 mr-1" />
                                  {activity.cost}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
