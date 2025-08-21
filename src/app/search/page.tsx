'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CityAutocomplete from '@/components/ui/CityAutocomplete';
import { City } from '@/lib/cities';
import { 
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UsersIcon,
  ArrowRightIcon,
  StarIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

export default function SearchPage() {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('round-trip');
  const [loading, setLoading] = useState(false);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [selectedFromCity, setSelectedFromCity] = useState<City | null>(null);
  const [selectedToCity, setSelectedToCity] = useState<City | null>(null);

  const handleFromCityChange = (city: City | null, inputValue: string) => {
    setSelectedFromCity(city);
    setFromCity(inputValue);
  };

  const handleToCityChange = (city: City | null, inputValue: string) => {
    setSelectedToCity(city);
    setToCity(inputValue);
  };

  const handleSwapCities = () => {
    // Swap the selected cities
    const tempCity = selectedFromCity;
    const tempCityString = fromCity;
    
    setSelectedFromCity(selectedToCity);
    setFromCity(toCity);
    setSelectedToCity(tempCity);
    setToCity(tempCityString);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that both cities are selected
    if (!selectedFromCity || !selectedToCity) {
      alert('Please select valid cities for both origin and destination');
      return;
    }
    
    if (selectedFromCity.code === selectedToCity.code) {
      alert('Origin and destination cannot be the same');
      return;
    }
    
    setLoading(true);
    
    // Simulate API call with actual city data
    console.log('Searching flights from:', selectedFromCity, 'to:', selectedToCity);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

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
              <a href="/search" className="text-black font-semibold">
                Search
              </a>
              <a href="/itinerary" className="text-neutral-600 hover:text-black transition-colors">
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
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-4">
            Find Your Perfect Flight
          </h1>
          <p className="text-xl text-neutral-600 mb-2">
            Search and compare flights from multiple airlines
          </p>
          <p className="text-sm text-neutral-500">
            Start typing city names to see suggestions with airports
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-12">
          <CardHeader>
            <div className="flex justify-center space-x-4">
              <Button
                type="button"
                variant={tripType === 'round-trip' ? 'default' : 'outline'}
                onClick={() => setTripType('round-trip')}
                className="min-w-[120px]"
              >
                Round Trip
              </Button>
              <Button
                type="button"
                variant={tripType === 'one-way' ? 'default' : 'outline'}
                onClick={() => setTripType('one-way')}
                className="min-w-[120px]"
              >
                One Way
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Origin and Destination */}
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CityAutocomplete
                    placeholder="From (City or Airport)"
                    value={fromCity}
                    onChange={handleFromCityChange}
                  />
                  <CityAutocomplete
                    placeholder="To (City or Airport)"
                    value={toCity}
                    onChange={handleToCityChange}
                  />
                </div>
                
                {/* Swap Button - Desktop */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                  <div className="bg-neutral-50 rounded-full p-1 shadow-sm">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSwapCities}
                      className="w-12 h-12 rounded-full bg-white border-2 border-neutral-300 hover:border-black hover:bg-neutral-50 transition-all duration-200 shadow-md hover:shadow-lg p-0 flex items-center justify-center"
                      title="Swap origin and destination"
                    >
                      <ArrowsRightLeftIcon className="w-5 h-5 text-neutral-600 hover:text-black transition-colors" />
                    </Button>
                  </div>
                </div>
                
                {/* Mobile Swap Button */}
                <div className="flex justify-center mt-4 md:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSwapCities}
                    className="px-6 py-2 text-sm bg-white border-2 border-neutral-300 hover:border-black hover:bg-neutral-50 transition-colors"
                    title="Swap origin and destination"
                  >
                    <ArrowsRightLeftIcon className="w-4 h-4 mr-2" />
                    Swap Cities
                  </Button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <Input
                    type="date"
                    className="pl-10"
                    required
                  />
                </div>
                {tripType === 'round-trip' && (
                  <div className="relative">
                    <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <Input
                      type="date"
                      className="pl-10"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Passengers and Class */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <select className="w-full h-12 pl-10 pr-4 border-2 border-neutral-300 rounded-lg bg-white text-neutral-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors">
                    <option value="1">1 Adult</option>
                    <option value="2">2 Adults</option>
                    <option value="3">3 Adults</option>
                    <option value="4">4+ Adults</option>
                  </select>
                </div>
                <div>
                  <select className="w-full h-12 px-4 border-2 border-neutral-300 rounded-lg bg-white text-neutral-900 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors">
                    <option value="economy">Economy</option>
                    <option value="premium">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <div className="text-center">
                <Button
                  type="submit"
                  size="lg"
                  className="px-12 py-4 text-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                      Search Flights
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Sample Results (shown when not loading) */}
        {!loading && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-black mb-6">Flight Results</h2>
            
            {/* Sample Flight Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                      <PaperAirplaneIcon className="w-6 h-6 text-neutral-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-black">Air India Express</div>
                      <div className="text-neutral-600">AI-234</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <div className="font-semibold text-black">09:30</div>
                      <div className="text-sm text-neutral-600">DEL</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-0.5 bg-neutral-300"></div>
                      <div className="text-sm text-neutral-600">2h 30m</div>
                      <div className="w-16 h-0.5 bg-neutral-300"></div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black">12:00</div>
                      <div className="text-sm text-neutral-600">BOM</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-black">₹4,850</div>
                    <Button size="sm" className="mt-2">
                      Select
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Another Sample Flight Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                      <PaperAirplaneIcon className="w-6 h-6 text-neutral-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-black">IndiGo</div>
                      <div className="text-neutral-600">6E-456</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <div className="font-semibold text-black">14:15</div>
                      <div className="text-sm text-neutral-600">DEL</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-0.5 bg-neutral-300"></div>
                      <div className="text-sm text-neutral-600">2h 25m</div>
                      <div className="w-16 h-0.5 bg-neutral-300"></div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-black">16:40</div>
                      <div className="text-sm text-neutral-600">BOM</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-black">₹5,200</div>
                    <Button size="sm" className="mt-2">
                      Select
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
