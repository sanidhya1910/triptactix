'use client';

import Link from 'next/link';
import { 
  PaperAirplaneIcon, 
  BuildingStorefrontIcon, 
  SparklesIcon,
  MapIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  StarIcon,
  ArrowRightIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600"></div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl animate-bounce-gentle"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-yellow-300/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl animate-bounce-gentle" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-green-300/25 rounded-full blur-2xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-32 left-20 text-white/30 animate-bounce">
          <PaperAirplaneIcon className="w-8 h-8 transform rotate-45" />
        </div>
        <div className="absolute top-64 right-32 text-white/30 animate-pulse">
          <BuildingStorefrontIcon className="w-10 h-10" />
        </div>
        <div className="absolute bottom-32 left-32 text-white/30 animate-bounce" style={{animationDelay: '1.5s'}}>
          <MapIcon className="w-12 h-12" />
        </div>
        <div className="absolute bottom-48 right-20 text-white/30 animate-pulse" style={{animationDelay: '3s'}}>
          <StarIcon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm10 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>
      
      <nav className="bg-white/95 backdrop-blur-lg border-b-2 border-white/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center border-2 border-white shadow-lg">
                <PaperAirplaneIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-heading font-black text-neutral-900">Triptactix</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/search" className="text-neutral-900 hover:text-blue-600 transition-colors font-bold">
                Search & Compare
              </Link>
              <Link href="/itinerary" className="text-neutral-900 hover:text-blue-600 transition-colors font-bold">
                AI Planner
              </Link>
              <Link href="/dashboard" className="text-neutral-900 hover:text-blue-600 transition-colors font-bold">
                My Trips
              </Link>
              <Button asChild size="sm" className="bg-blue-600 text-white font-bold hover:bg-blue-700 border-2 border-white/50 shadow-xl relative overflow-hidden">
                <Link href="/itinerary" className="relative z-10">
                  <div className="absolute inset-0 opacity-20">
                    <MapPinIcon className="absolute top-1 left-2 w-3 h-3 rotate-12" />
                    <PaperAirplaneIcon className="absolute bottom-1 right-2 w-3 h-3 -rotate-12" />
                  </div>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-blue-700 mb-8 border-2 border-white/50 shadow-lg">
            <SparklesIcon className="w-4 h-4" />
            New: AI-Powered Itinerary Generator
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-black text-white mb-6 drop-shadow-2xl">
            Your Perfect Trip,
            <span className="block text-yellow-300 drop-shadow-lg">
              Planned by AI
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white mb-12 max-w-3xl mx-auto leading-relaxed font-bold drop-shadow-lg">
            Discover your perfect trip with AI-powered planning. Get personalized itineraries, 
            real-time pricing, and seamless booking all in one intelligent platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 border-2 border-white shadow-2xl"
            >
              <Link href="/itinerary" className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                Plan My Trip with AI
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              size="lg"
              className="bg-white/20 backdrop-blur-sm text-white border-2 border-white hover:bg-white/30 font-bold"
            >
              <Link href="/search">Search & Compare</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white relative">
        {/* Decorative background elements for features section */}
        <div className="absolute inset-0 bg-blue-50"></div>
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-black text-neutral-900 mb-4">
              Everything You Need for Perfect Travel
            </h2>
            <p className="text-lg text-neutral-800 max-w-2xl mx-auto font-medium">
              Our AI-powered platform combines intelligent planning with comprehensive booking to make travel effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI Itinerary Generator */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-blue-200 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-blue-400">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-300 shadow-lg">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">AI Itinerary Generator</h3>
              <p className="text-neutral-800 mb-4 font-medium">
                Input your destination and preferences, and watch our AI create a personalized day-by-day travel plan with activities, meals, and accommodations.
              </p>
              <Link href="/itinerary" className="text-blue-600 font-bold hover:text-blue-700 inline-flex items-center gap-1 transition-colors">
                Try AI Planner <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Multi-Modal Search */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-blue-200 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-blue-400">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-300 shadow-lg">
                <MapIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">Smart Search & Compare</h3>
              <p className="text-neutral-800 mb-4 font-medium">
                Search flights, trains, and hotels simultaneously. Compare prices across multiple providers to find the best deals for your budget.
              </p>
              <Link href="/search" className="text-blue-600 font-bold hover:text-blue-700 inline-flex items-center gap-1 transition-colors">
                Start Searching <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Price Prediction */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-blue-200 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-blue-400">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 border-2 border-blue-300 shadow-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">AI Price Prediction</h3>
              <p className="text-neutral-800 mb-4 font-medium">
                Machine learning algorithms predict future price trends, helping you decide whether to book now or wait for better deals.
              </p>
              <Link href="/search" className="text-blue-600 font-bold hover:text-blue-700 inline-flex items-center gap-1 transition-colors">
                View Predictions <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Custom Packages */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-green-200 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-green-400">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center mb-6 border-2 border-green-300 shadow-lg">
                <CalendarDaysIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">Custom Travel Packages</h3>
              <p className="text-neutral-800 mb-4 font-medium">
                Combine flights, accommodations, and activities into personalized packages. Save money with bundled deals and simplified booking.
              </p>
              <Link href="/itinerary" className="text-green-600 font-bold hover:text-green-700 inline-flex items-center gap-1 transition-colors">
                Create Package <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Booking Management */}
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-orange-200 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-orange-400">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6 border-2 border-orange-300 shadow-lg">
                <StarIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 mb-3">Trip Management</h3>
              <p className="text-neutral-800 mb-4 font-medium">
                Manage all your bookings in one place. Track itineraries, receive updates, and access your travel documents anytime, anywhere.
              </p>
              <Link href="/dashboard" className="text-secondary-600 font-medium hover:text-secondary-700 inline-flex items-center gap-1">
                View Dashboard <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Global Coverage */}
            <div className="bg-white p-8 rounded-2xl border-2 border-secondary-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-secondary-600 rounded-xl flex items-center justify-center mb-6">
                <BuildingStorefrontIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-800 mb-3">Global Provider Network</h3>
              <p className="text-neutral-700 mb-4">
                Access inventory from trusted partners worldwide including Amadeus, Booking.com, Skyscanner, and local providers for comprehensive coverage.
              </p>
              <Link href="/search" className="text-blue-600 font-medium hover:text-blue-700 inline-flex items-center gap-1">
                Explore Options <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How AI Planning Works */}
      <section className="py-20 bg-gradient-to-br from-sky-50/50 to-blue-100/50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-sky-400/5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-800 mb-4">
              How Our AI Creates Your Perfect Trip
            </h2>
            <p className="text-lg text-neutral-700 max-w-2xl mx-auto">
              Our advanced AI analyzes millions of data points to craft personalized itineraries that match your style, budget, and interests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-800 mb-3">Share Your Vision</h3>
              <p className="text-neutral-700">
                Tell us your destination, travel dates, budget range, accommodation preferences, and interests. The more details, the better our AI can personalize your trip.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-800 mb-3">AI Magic Happens</h3>
              <p className="text-neutral-700">
                Our AI processes your preferences against millions of travel options, local insights, weather patterns, and real-time pricing to create your perfect itinerary.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-800 mb-3">Get & Book</h3>
              <p className="text-neutral-700">
                Receive a detailed day-by-day itinerary with activities, restaurants, accommodations, and transportation. Review, customize, and book with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to Experience AI-Powered Travel Planning?
          </h2>
          <p className="text-xl text-white mb-8">
            Join thousands of travelers who have discovered their perfect trips with Triptactix AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg"
              className="bg-white text-primary-600 px-8 py-4 text-lg font-medium rounded-xl hover:bg-neutral-50 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link href="/itinerary" className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                Start Planning Now
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg border-2 border-white text-white hover:bg-white hover:text-primary-600 rounded-xl transition-all duration-200"
            >
              <Link href="/search">Browse Options</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="py-5 relative">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-16 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-16 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-black text-white mb-4 drop-shadow-lg">
              Get in Touch
            </h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto font-medium drop-shadow">
              Have questions about your travel plans? We're here to help you create the perfect itinerary.
            </p>
          </div>

          <div className="p-8">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-black text-white drop-shadow">
                    <UserIcon className="w-4 h-4" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border-2 border-white/30 rounded-lg bg-white text-neutral-900 font-medium focus:border-white focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-black text-white drop-shadow">
                    <EnvelopeIcon className="w-4 h-4" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border-2 border-white/30 rounded-lg bg-white text-neutral-900 font-medium focus:border-white focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black text-white drop-shadow">
                  <PhoneIcon className="w-4 h-4" />
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 12345 67890"
                  className="w-full px-4 py-3 border-2 border-white/30 rounded-lg bg-white text-neutral-900 font-medium focus:border-white focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black text-white drop-shadow">
                  <EnvelopeIcon className="w-4 h-4" />
                  Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your travel plans or how we can help you..."
                  className="w-full px-4 py-3 border-2 border-white/30 rounded-lg bg-white text-neutral-900 font-medium focus:border-white focus:outline-none focus:ring-2 focus:ring-white transition-colors resize-none"
                  required
                ></textarea>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-4 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg text-lg relative overflow-hidden"
              >
                {/* Travel-themed background icons */}
                <div className="absolute inset-0 opacity-10">
                  <EnvelopeIcon className="absolute top-2 left-4 w-5 h-5 rotate-12" />
                  <PaperAirplaneIcon className="absolute bottom-2 right-6 w-4 h-4 -rotate-12" />
                  <UserIcon className="absolute top-3 right-12 w-4 h-4 rotate-45" />
                </div>
                <div className="flex items-center justify-center gap-2 relative z-10">
                  <PaperAirplaneIcon className="w-5 h-5" />
                  Send Message
                </div>
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <PaperAirplaneIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-heading font-bold">Triptactix</span>
            </div>
            <p className="text-neutral-200 mb-8">
              AI-powered travel planning for the modern explorer
            </p>
            <div className="flex justify-center space-x-8 text-neutral-200">
              <Link href="/itinerary" className="hover:text-white transition-colors">
                AI Planner
              </Link>
              <Link href="/search" className="hover:text-white transition-colors">
                Search
              </Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">
                My Trips
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
