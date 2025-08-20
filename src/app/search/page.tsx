'use client';

import React, { useState } from 'react';
import { SearchForm } from '@/components/search/SearchForm';
import { FlightResults } from '@/components/search/FlightResults';
import { PricePredictionChart } from '@/components/charts/PricePredictionChart';
import { SearchParams, SearchResults, Flight, PricePrediction, PriceHistory } from '@/types/travel';
import { ModernLayout } from '@/components/layout/ModernLayout';
import { AnimatedSection, FadeInWhenVisible, StaggeredContainer } from '@/components/ui/animations';
import { ModernCard } from '@/components/ui/modern-card';
import { ModernBadge, StatusBadge, PriceBadge } from '@/components/ui/modern-badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChartBarIcon,
  PaperAirplaneIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'flights' | 'trains' | 'prediction'>('flights');

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      
      if (result.success) {
        setSearchResults(result.data);
        setActiveTab('flights');
        
        // Get price prediction for flights
        if (result.data.flights.length > 0) {
          await fetchPricePrediction(result.data.searchId, params);
        }
      } else {
        console.error('Search failed:', result.error);
        // Handle error - show toast or error message
      }
    } catch (error) {
      console.error('Search error:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const fetchPricePrediction = async (searchId: string, params: SearchParams) => {
    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchId,
          origin: params.origin.code,
          destination: params.destination.code,
          departureDate: params.departureDate.toISOString(),
          returnDate: params.returnDate?.toISOString(),
          travelType: 'flight',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setPrediction(result.data.prediction);
        setPriceHistory(result.data.priceHistory);
      }
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    // In a real app, you might navigate to booking page or show booking form
    console.log('Selected flight:', flight);
  };

  const handleCreatePriceAlert = (targetPrice: number) => {
    // In a real app, create price alert
    console.log('Create price alert for:', targetPrice);
  };

  const renderTabContent = () => {
    if (!searchResults) return null;

    switch (activeTab) {
      case 'flights':
        return (
          <FadeInWhenVisible>
            <FlightResults
              flights={searchResults.flights}
              loading={loading}
              onSelectFlight={handleSelectFlight}
            />
          </FadeInWhenVisible>
        );
      case 'trains':
        return (
          <FadeInWhenVisible>
            <StaggeredContainer className="space-y-4">
              {searchResults.trains.length > 0 ? (
                searchResults.trains.map((train) => (
                  <ModernCard key={train.id} hover glowOnHover>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{train.operator}</h3>
                          <p className="text-blue-600 font-medium">{train.outbound[0].trainName}</p>
                        </div>
                        <PriceBadge amount={train.price.total} highlight />
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-neutral-600">
                        <span>{train.outbound[0].class}</span>
                        <ModernBadge variant="info">{train.amenities.join(', ')}</ModernBadge>
                      </div>
                    </div>
                  </ModernCard>
                ))
              ) : (
                <ModernCard>
                  <div className="p-8 text-center">
                    <BuildingOffice2Icon className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-neutral-600">No trains found for your search criteria.</p>
                  </div>
                </ModernCard>
              )}
            </StaggeredContainer>
          </FadeInWhenVisible>
        );
      case 'prediction':
        return prediction && priceHistory.length > 0 ? (
          <FadeInWhenVisible>
            <PricePredictionChart
              prediction={prediction}
              priceHistory={priceHistory}
              onCreateAlert={handleCreatePriceAlert}
            />
          </FadeInWhenVisible>
        ) : (
          <ModernCard>
            <div className="p-8 text-center">
              <ChartBarIcon className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-neutral-600">Price prediction data not available.</p>
            </div>
          </ModernCard>
        );
      default:
        return null;
    }
  };

  return (
    <ModernLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <AnimatedSection className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
              <MagnifyingGlassIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Search & Compare
            </h1>
          </div>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Find the perfect travel options with AI-powered insights and real-time price predictions
          </p>
        </AnimatedSection>

        {/* Search Form */}
        <AnimatedSection delay={0.2} className="mb-12">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </AnimatedSection>

        {/* Selected Items Summary */}
        {selectedFlight && (
          <AnimatedSection delay={0.3} className="mb-8">
            <ModernCard className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800">Your Selection</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PaperAirplaneIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">{selectedFlight.airline}</p>
                      <p className="text-sm text-green-700">
                        {selectedFlight.outbound[0].origin.code} → {selectedFlight.outbound[0].destination.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <PriceBadge amount={selectedFlight.price.total} highlight />
                    <Button className="bg-green-600 hover:bg-green-700">
                      Book Flight
                    </Button>
                  </div>
                </div>
              </div>
            </ModernCard>
          </AnimatedSection>
        )}

        {/* Search Results */}
        {searchResults && (
          <AnimatedSection delay={0.4}>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-8">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
                <TabsTrigger value="flights" className="flex items-center space-x-2">
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>Flights</span>
                  <ModernBadge size="sm">{searchResults.flights.length}</ModernBadge>
                </TabsTrigger>
                <TabsTrigger value="trains" className="flex items-center space-x-2">
                  <BuildingOffice2Icon className="w-4 h-4" />
                  <span>Trains</span>
                  <ModernBadge size="sm">{searchResults.trains.length}</ModernBadge>
                </TabsTrigger>
                {prediction && (
                  <TabsTrigger value="prediction" className="flex items-center space-x-2">
                    <ChartBarIcon className="w-4 h-4" />
                    <span>AI Prediction</span>
                    <ModernBadge variant="success" size="sm">AI</ModernBadge>
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="flights" className="mt-8">
                {renderTabContent()}
              </TabsContent>
              
              <TabsContent value="trains" className="mt-8">
                {renderTabContent()}
              </TabsContent>
              
              {prediction && (
                <TabsContent value="prediction" className="mt-8">
                  {renderTabContent()}
                </TabsContent>
              )}
            </Tabs>
          </AnimatedSection>
        )}
      </div>
    </ModernLayout>
  );
}
