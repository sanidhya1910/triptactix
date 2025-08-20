'use client';

import Link from 'next/link';
import { 
  PaperAirplaneIcon, 
  SparklesIcon,
  MapIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  StarIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { ModernLayout } from '@/components/layout/ModernLayout';
import { AnimatedSection, FadeInWhenVisible, StaggeredContainer, ScaleOnHover } from '@/components/ui/animations';
import { FeatureCard, ModernCard, GlassCard } from '@/components/ui/modern-card';
import { ModernBadge } from '@/components/ui/modern-badge';

export default function HomePage() {
  const features = [
    {
      icon: <MagnifyingGlassIcon className="w-6 h-6" />,
      title: 'Smart Search & Compare',
      description: 'AI-powered search across multiple platforms to find the best flights, trains, and travel packages with real-time pricing.',
    },
    {
      icon: <ChartBarIcon className="w-6 h-6" />,
      title: 'Price Predictions',
      description: 'Machine learning algorithms predict price trends and suggest the best time to book for maximum savings.',
    },
    {
      icon: <SparklesIcon className="w-6 h-6" />,
      title: 'AI Travel Planning',
      description: 'Get personalized itineraries created by AI that considers your preferences, budget, and travel style.',
    },
    {
      icon: <MapIcon className="w-6 h-6" />,
      title: 'Custom Packages',
      description: 'Create comprehensive travel packages combining flights, accommodation, and activities in one seamless booking.',
    },
    {
      icon: <ClockIcon className="w-6 h-6" />,
      title: 'Real-time Updates',
      description: 'Stay informed with live updates on prices, delays, gate changes, and travel advisories.',
    },
    {
      icon: <StarIcon className="w-6 h-6" />,
      title: 'Premium Experience',
      description: 'Enjoy white-glove service with 24/7 support, exclusive deals, and seamless booking management.',
    },
  ];

  return (
    <ModernLayout>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-bounce"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-yellow-300/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-pink-300/15 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute bottom-40 right-10 w-40 h-40 bg-green-300/20 rounded-full blur-2xl animate-pulse"></div>
        </div>
        
        {/* Floating Icons */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-32 left-20 text-white/20 animate-bounce">
            <PaperAirplaneIcon className="w-8 h-8 transform rotate-45" />
          </div>
          <div className="absolute top-64 right-32 text-white/20 animate-pulse">
            <MapIcon className="w-10 h-10" />
          </div>
          <div className="absolute bottom-32 left-32 text-white/20 animate-bounce">
            <StarIcon className="w-12 h-12" />
          </div>
        </div>
        
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <AnimatedSection direction="up" className="space-y-8">
            <div className="space-y-4">
              <ModernBadge variant="secondary" className="bg-white/20 text-white border-white/30 mb-4">
                ✨ AI-Powered Travel Planning
              </ModernBadge>
              
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                Your Perfect Trip
                <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  Starts Here
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                Discover your perfect trip with AI-powered planning. Get personalized itineraries, 
                real-time pricing, and seamless booking all in one intelligent platform.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <ScaleOnHover>
                <Button 
                  asChild
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 border-2 border-white shadow-2xl px-8 py-4 text-lg font-bold"
                >
                  <Link href="/itinerary" className="flex items-center gap-3">
                    <SparklesIcon className="w-5 h-5" />
                    Plan My Trip with AI
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </Button>
              </ScaleOnHover>
              
              <ScaleOnHover>
                <Button 
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-white/20 backdrop-blur-sm text-white border-2 border-white hover:bg-white/30 font-bold px-8 py-4 text-lg"
                >
                  <Link href="/search">Search & Compare</Link>
                </Button>
              </ScaleOnHover>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-white"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInWhenVisible>
            <div className="text-center mb-16">
              <ModernBadge variant="info" className="mb-4">
                🚀 Everything You Need
              </ModernBadge>
              <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
                Perfect Travel Made Simple
              </h2>
              <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
                Our AI-powered platform combines intelligent planning with comprehensive booking 
                to make travel effortless and enjoyable.
              </p>
            </div>
          </FadeInWhenVisible>

          <StaggeredContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FadeInWhenVisible key={feature.title}>
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              </FadeInWhenVisible>
            ))}
          </StaggeredContainer>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInWhenVisible>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: '100K+', label: 'Happy Travelers' },
                { number: '500+', label: 'Destinations' },
                { number: '50K+', label: 'Bookings Made' },
                { number: '98%', label: 'Satisfaction Rate' },
              ].map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <AnimatedSection delay={index * 0.1}>
                    <div className="text-4xl md:text-5xl font-bold mb-2">{stat.number}</div>
                    <div className="text-white/80 font-medium">{stat.label}</div>
                  </AnimatedSection>
                </div>
              ))}
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-neutral-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <FadeInWhenVisible>
            <GlassCard className="p-12 bg-white/60 backdrop-blur-sm">
              <h2 className="text-4xl font-bold text-neutral-900 mb-6">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-neutral-600 mb-8">
                Join thousands of travelers who trust Triptactix for their perfect trips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <ScaleOnHover>
                  <Button asChild size="lg" className="px-8 py-4 text-lg font-bold">
                    <Link href="/search">
                      Start Planning Now
                      <ArrowRightIcon className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </ScaleOnHover>
                <Button asChild variant="outline" size="lg" className="px-8 py-4 text-lg">
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </GlassCard>
          </FadeInWhenVisible>
        </div>
      </section>
    </ModernLayout>
  );
}
