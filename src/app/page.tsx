'use client';

import Link from 'next/link';
import { 
  ArrowRightIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  MapIcon,
  StarIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white/40 supports-[backdrop-filter]:bg-white/25 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-black">
              Triptactix
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/search" className="text-neutral-600 hover:text-black transition-colors">
                Search
              </Link>
              <Link href="/itinerary" className="text-neutral-600 hover:text-black transition-colors">
                AI Planner
              </Link>
              <Link href="/ml-dashboard" className="text-neutral-600 hover:text-black transition-colors">
                ML Analytics
              </Link>
              <Link href="/dashboard" className="text-neutral-600 hover:text-black transition-colors">
                Dashboard
              </Link>
              <Button asChild>
                <Link href="/search">
                  Get Started
                </Link>
              </Button>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                Menu
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - full screen with no horizontal padding */}
      <section className="pt-18 pb-8 px-2">
        <div className="w-full">
          <div className="relative rounded-3xl overflow-hidden ring-1 ring-neutral-200 min-h-[calc(102vh-7rem)]">
            {/* Background image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/hero.jpg')" }}
            />
            {/* Subtle overlay for readability (doesn't change text content) */}
            <div className="absolute inset-0 bg-white/25" />
            {/* Content */}
            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="max-w-5xl mx-auto text-center hero-container py-2 px-4 sm:px-6 md:px-8">
                <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm text-neutral-700 mb-8">
                  <SparklesIcon className="py w-4 h-4" />
                  AI-Powered Travel Planning
                </div>
                
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-semibold text-black mb-8 leading-tight tracking-tight">
                  Plan Your Perfect
                  <br />
                  <span className="text-neutral-600">Journey</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-neutral-600 mb-12 hero-subtext leading-relaxed">
                  Discover personalized travel experiences with AI-powered itinerary planning, 
                  real-time price comparisons, and seamless booking.
                </p>
                
                <div className="py-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button size="lg" className="px-8 py-4 text-lg" asChild>
                    <Link href="/itinerary" className="flex items-center gap-2">
                      Start Planning
                      <ArrowRightIcon className="w-5 h-5" />
                    </Link>
                  </Button>
                  
                  <Button variant="outline" size="lg" className="px-8 py-4 text-lg" asChild>
                    <Link href="/search">
                      Search Flights
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Everything You Need for Travel
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Our platform combines intelligent planning with comprehensive booking tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">AI Trip Planning</h3>
              <p className="text-neutral-600">
                Get personalized itineraries powered by artificial intelligence that match your preferences.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                <MagnifyingGlassIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Smart Search</h3>
              <p className="text-neutral-600">
                Compare prices across multiple platforms and find the best deals for flights and hotels.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-neutral-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-4">Price Predictions</h3>
              <p className="text-neutral-600">
                Get insights on when to book with our AI-powered price prediction algorithms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-black mb-2">0.8s</div>
              <div className="text-neutral-600">Latency</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black mb-2">6</div>
              <div className="text-neutral-600">Destinations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black mb-2">30K+</div>
              <div className="text-neutral-600">Dataset Size</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black mb-2">98%</div>
              <div className="text-neutral-600">Confidence upto</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
            Ready to Start Your Adventure?
          </h2>
          <p className="text-xl text-neutral-600 mb-8">
            Join thousands of travelers who plan their perfect trips with Triptactix.
          </p>
          <Button size="lg" className="px-8 py-4 text-lg" asChild>
            <Link href="/search" className="flex items-center gap-2">
              Start Planning Now
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h3 className="text-2xl font-bold mb-4">Triptactix</h3>
              <p className="text-neutral-300 mb-6 max-w-md">
                AI-powered travel planning platform for personalized itineraries and seamless booking experiences.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <div className="space-y-2">
                <Link href="/search" className="block text-neutral-300 hover:text-white transition-colors">
                  Search Flights
                </Link>
                <Link href="/itinerary" className="block text-neutral-300 hover:text-white transition-colors">
                  AI Planner
                </Link>
                <Link href="/dashboard" className="block text-neutral-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2">
                <Link href="#" className="block text-neutral-300 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="#" className="block text-neutral-300 hover:text-white transition-colors">
                  Contact
                </Link>
                <Link href="#" className="block text-neutral-300 hover:text-white transition-colors">
                  Privacy
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-neutral-800 mt-12 pt-8 text-center">
            <p className="text-neutral-400">
              © 2024 Triptactix. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
