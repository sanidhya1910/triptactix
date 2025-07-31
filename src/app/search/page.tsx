'use client';

import React, { useState } from 'react';
import { SearchForm } from '@/components/search/SearchForm';
import { FlightResults } from '@/components/search/FlightResults';
import { HotelResults } from '@/components/search/HotelResults';
import { PricePredictionChart } from '@/components/charts/PricePredictionChart';
import { SearchParams, SearchResults, Flight, Hotel, HotelRoom, PricePrediction, PriceHistory } from '@/types/travel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BuildingOfficeIcon,
  ChartBarIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<{ hotel: Hotel; room: HotelRoom } | null>(null);
  const [prediction, setPrediction] = useState<PricePrediction | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'flights' | 'trains' | 'hotels' | 'prediction'>('flights');

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

  const handleSelectRoom = (hotel: Hotel, room: HotelRoom) => {
    setSelectedHotel({ hotel, room });
    // In a real app, you might navigate to booking page or show booking form
    console.log('Selected hotel room:', { hotel, room });
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
          <FlightResults
            flights={searchResults.flights}
            loading={loading}
            onSelectFlight={handleSelectFlight}
          />
        );
      case 'trains':
        return (
          <div className="space-y-4">
            {searchResults.trains.length > 0 ? (
              searchResults.trains.map((train) => (
                <Card key={train.id}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold">{train.operator}</h3>
                    <p className="font-bold text-neutral-900">{train.outbound[0].trainName}</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${train.price.total.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="font-bold text-neutral-900">No trains found for your search criteria.</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      case 'hotels':
        return (
          <HotelResults
            hotels={searchResults.hotels}
            checkIn={searchResults.searchParams.departureDate}
            checkOut={searchResults.searchParams.returnDate || new Date(searchResults.searchParams.departureDate.getTime() + 24 * 60 * 60 * 1000)}
            loading={loading}
            onSelectRoom={handleSelectRoom}
          />
        );
      case 'prediction':
        return prediction && priceHistory.length > 0 ? (
          <PricePredictionChart
            prediction={prediction}
            priceHistory={priceHistory}
            onCreateAlert={handleCreatePriceAlert}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-bold text-neutral-900">Price prediction data not available.</p>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Triptactix</h1>
          <p className="font-bold text-neutral-900">Find the perfect trip with AI-powered insights</p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Selected Items Summary */}
        {(selectedFlight || selectedHotel) && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-2">Selected Items</h3>
              <div className="space-y-2">
                {selectedFlight && (
                  <div className="flex items-center space-x-2">
                    <PaperAirplaneIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Flight: {selectedFlight.airline} - ${selectedFlight.price.total.toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedHotel && (
                  <div className="flex items-center space-x-2">
                    <BuildingOfficeIcon className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      Hotel: {selectedHotel.hotel.name}, {selectedHotel.room.name} - ${selectedHotel.room.price.total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <Button className="mt-3 bg-green-600 hover:bg-green-700">
                Create Package & Book
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-white rounded-lg shadow-sm border">
              <Button
                variant={activeTab === 'flights' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('flights')}
                className="flex items-center space-x-2"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>Flights ({searchResults.flights.length})</span>
              </Button>
              <Button
                variant={activeTab === 'trains' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('trains')}
                className="flex items-center space-x-2"
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>Trains ({searchResults.trains.length})</span>
              </Button>
              <Button
                variant={activeTab === 'hotels' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('hotels')}
                className="flex items-center space-x-2"
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>Hotels ({searchResults.hotels.length})</span>
              </Button>
              {prediction && (
                <Button
                  variant={activeTab === 'prediction' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('prediction')}
                  className="flex items-center space-x-2"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  <span>Price Prediction</span>
                </Button>
              )}
            </div>

            {/* Tab Content */}
            <div>{renderTabContent()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
