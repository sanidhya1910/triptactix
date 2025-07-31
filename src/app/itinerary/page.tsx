'use client';

import { useState } from 'react';
import { ItineraryForm } from '@/components/itinerary/ItineraryForm';
import { ItineraryDisplay } from '@/components/itinerary/ItineraryDisplay';
import { type Itinerary } from '@/types/itinerary';
import { 
  SparklesIcon, 
  MapIcon, 
  GlobeAltIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function ItineraryPage() {
  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);
  const [showForm, setShowForm] = useState(true);

  const handleItineraryGenerated = (itinerary: Itinerary) => {
    setGeneratedItinerary(itinerary);
    setShowForm(false);
  };

  const handleCreateNew = () => {
    setGeneratedItinerary(null);
    setShowForm(true);
  };

  const handleBookNow = () => {
    // Redirect to booking page or show booking modal
    console.log('Booking itinerary:', generatedItinerary?.id);
    // In a real app, you'd integrate with your booking system
    alert('Booking functionality would be integrated here!');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Simple blue background */}
      <div className="absolute inset-0 bg-blue-600"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-16 w-24 h-24 bg-white/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-24 w-32 h-32 bg-yellow-300/25 rounded-full blur-2xl animate-bounce-gentle"></div>
        <div className="absolute bottom-16 left-20 w-28 h-28 bg-pink-300/20 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 right-16 w-36 h-36 bg-green-300/15 rounded-full blur-3xl animate-bounce-gentle" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Hero Section */}
      <div className="relative bg-blue-700/90 backdrop-blur-sm text-white border-b-4 border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30 shadow-2xl">
                <SparklesIcon className="w-8 h-8 text-yellow-300" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-black mb-4 drop-shadow-2xl">
              AI-Powered Travel Planner
            </h1>
            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto font-bold drop-shadow-lg">
              Tell us your dream destination and preferences. Our AI will craft a personalized itinerary 
              with handpicked activities, accommodations, and experiences just for you.
            </p>
            <div className="flex justify-center space-x-8 text-white">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                <MapIcon className="w-5 h-5" />
                <span className="font-bold">Personalized Routes</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                <GlobeAltIcon className="w-5 h-5" />
                <span className="font-bold">Global Destinations</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                <SparklesIcon className="w-5 h-5" />
                <span className="font-bold">AI-Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showForm ? (
          <div className="space-y-8">
            {/* How it Works */}
            <div className="text-center mb-12 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-heading font-black text-white mb-6 drop-shadow-lg">
                How It Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30 shadow-xl">
                    <span className="text-2xl font-black text-white">1</span>
                  </div>
                  <h3 className="font-black text-white mb-2 drop-shadow">Tell Us Your Plans</h3>
                  <p className="text-white/90 font-bold drop-shadow">
                    Share your destination, dates, budget, and travel preferences
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30 shadow-xl">
                    <span className="text-2xl font-black text-white">2</span>
                  </div>
                  <h3 className="font-black text-white mb-2 drop-shadow">AI Creates Your Plan</h3>
                  <p className="text-white/90 font-bold drop-shadow">
                    Our AI analyzes thousands of options to create your perfect itinerary
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30 shadow-xl">
                    <span className="text-2xl font-black text-white">3</span>
                  </div>
                  <h3 className="font-black text-white mb-2 drop-shadow">Book & Enjoy</h3>
                  <p className="text-white/90 font-bold drop-shadow">
                    Review, customize, and book your personalized travel experience
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <ItineraryForm onItineraryGenerated={handleItineraryGenerated} />

            {/* Features */}
            <div className="mt-16">
              <h2 className="text-2xl font-heading font-black text-white text-center mb-8 drop-shadow-lg">
                Why Choose Our AI Planner?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-2xl border-2 border-white/50">
                  <SparklesIcon className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-black text-neutral-900 mb-2">Smart Recommendations</h3>
                  <p className="text-sm text-neutral-900 font-bold">
                    AI-powered suggestions based on your interests and travel style
                  </p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-2xl border-2 border-white/50">
                  <MapIcon className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-black text-neutral-900 mb-2">Optimized Routes</h3>
                  <p className="text-sm text-neutral-900 font-bold">
                    Efficient routing to maximize your time and minimize travel costs
                  </p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-2xl border-2 border-white/50">
                  <GlobeAltIcon className="w-8 h-8 text-indigo-600 mb-3" />
                  <h3 className="font-black text-neutral-900 mb-2">Global Coverage</h3>
                  <p className="text-sm text-neutral-900 font-bold">
                    Comprehensive data for destinations worldwide
                  </p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-2xl border-2 border-white/50">
                  <ArrowPathIcon className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-black text-neutral-900 mb-2">Real-time Updates</h3>
                  <p className="text-sm text-neutral-900 font-bold">
                    Live pricing and availability from trusted travel providers
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Generated Itinerary */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-black text-white drop-shadow-lg">
                Your Personalized Itinerary
              </h2>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-xl hover:bg-blue-700 transition-all duration-200 border-2 border-white/30 relative overflow-hidden"
              >
                {/* Travel background icons */}
                <div className="absolute inset-0 opacity-20">
                  <ArrowPathIcon className="absolute top-2 left-2 w-4 h-4 rotate-12" />
                  <SparklesIcon className="absolute bottom-1 right-2 w-3 h-3 -rotate-12" />
                </div>
                <ArrowPathIcon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Create New Itinerary</span>
              </button>
            </div>

            {generatedItinerary && (
              <ItineraryDisplay 
                itinerary={generatedItinerary} 
                onBookNow={handleBookNow}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {showForm && (
        <div className="bg-blue-600 py-16 border-t-4 border-white/20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-heading font-black text-white mb-4 drop-shadow-lg">
              Ready to Plan Your Perfect Trip?
            </h2>
            <p className="text-lg text-white mb-8 font-bold drop-shadow">
              Join thousands of travelers who have discovered amazing destinations with our AI planner.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <div className="text-3xl font-black text-yellow-300 drop-shadow">10,000+</div>
                <div className="text-white font-bold drop-shadow">Itineraries Created</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <div className="text-3xl font-black text-yellow-300 drop-shadow">500+</div>
                <div className="text-white font-bold drop-shadow">Destinations Covered</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
                <div className="text-3xl font-black text-yellow-300 drop-shadow">98%</div>
                <div className="text-white font-bold drop-shadow">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
