'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPinIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { City, searchCities } from '@/lib/cities';

// Dataset cities for ML mode
const ML_DATASET_CITIES: City[] = [
  { name: 'New Delhi', code: 'DEL', country: 'India', airport: 'Indira Gandhi International Airport', region: 'North India' },
  { name: 'Mumbai', code: 'BOM', country: 'India', airport: 'Chhatrapati Shivaji Maharaj International Airport', region: 'West India' },
  { name: 'Bangalore', code: 'BLR', country: 'India', airport: 'Kempegowda International Airport', region: 'South India' },
  { name: 'Chennai', code: 'MAA', country: 'India', airport: 'Chennai International Airport', region: 'South India' },
  { name: 'Hyderabad', code: 'HYD', country: 'India', airport: 'Rajiv Gandhi International Airport', region: 'South India' },
  { name: 'Kolkata', code: 'CCU', country: 'India', airport: 'Netaji Subhash Chandra Bose International Airport', region: 'East India' },
];

interface CityAutocompleteProps {
  placeholder: string;
  value: string;
  onChange: (city: City | null, inputValue: string) => void;
  className?: string;
  mlMode?: boolean; // New prop for ML mode
}

export default function CityAutocomplete({ placeholder, value, onChange, className = '', mlMode = false }: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [justSelected, setJustSelected] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Sync input field with inputValue state
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== inputValue) {
      console.log('Syncing input field value from', inputRef.current.value, 'to', inputValue);
      inputRef.current.value = inputValue;
    }
  }, [inputValue]);

  const filterCities = (query: string) => {
    if (!query.trim()) {
      setFilteredCities([]);
      return;
    }

    if (mlMode) {
      // In ML mode, only show cities from our dataset
      const filtered = ML_DATASET_CITIES.filter(city =>
        city.name.toLowerCase().includes(query.toLowerCase()) ||
        city.code.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      // Normal mode - search all cities
      const filtered = searchCities(query, 10);
      setFilteredCities(filtered);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedCity(null);
    setHighlightedIndex(-1);
    
    filterCities(newValue);
    setIsOpen(newValue.length > 0);
    
    onChange(null, newValue);
  };

  const handleCitySelect = (city: City) => {
    const displayValue = `${city.name}, ${city.country}`;
    console.log('Selecting city:', city.name, 'Display value:', displayValue);
    
    // Set flag to prevent blur interference
    setJustSelected(true);
    
    // Update all state immediately
    setInputValue(displayValue);
    setSelectedCity(city);
    setIsOpen(false);
    setFilteredCities([]);
    setHighlightedIndex(-1);
    
    // Notify parent component
    onChange(city, displayValue);
    
    // Blur after a short delay to let state settle
    setTimeout(() => {
      inputRef.current?.blur();
      setJustSelected(false); // Reset flag after blur
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCities.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCities.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCities[highlightedIndex]) {
          handleCitySelect(filteredCities[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    if (inputValue && !selectedCity) {
      filterCities(inputValue);
      setIsOpen(filteredCities.length > 0);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't interfere if we just selected a city
    if (justSelected) {
      console.log('Skipping blur handling - just selected a city');
      return;
    }
    
    // Delay closing to allow click on dropdown items
    setTimeout(() => {
      console.log('Blur handler - selectedCity:', selectedCity, 'inputValue:', inputValue);
      
      // If we have a selected city, keep it as is
      if (selectedCity) {
        const displayValue = `${selectedCity.name}, ${selectedCity.country}`;
        setInputValue(displayValue);
        if (inputRef.current) {
          inputRef.current.value = displayValue;
        }
      } else if (inputValue && !selectedCity) {
        // If input doesn't match any city, show validation
        const allCities = searchCities(inputValue, 1000); // Get all matches
        const exactMatch = allCities.find(city => 
          inputValue.toLowerCase() === `${city.name}, ${city.country}`.toLowerCase()
        );
        
        if (!exactMatch) {
          // Allow partial input but mark as invalid
          onChange(null, inputValue);
        }
      }
      
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full h-12 pl-10 pr-10 border-2 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-black/10 transition-colors ${
            selectedCity 
              ? 'border-green-300 focus:border-green-500' 
              : inputValue && !selectedCity 
              ? 'border-amber-300 focus:border-amber-500'
              : 'border-neutral-300 focus:border-black'
          }`}
          autoComplete="off"
          required
          onInput={(e) => {
            console.log('Input event - target.value:', (e.target as HTMLInputElement).value, 'inputValue state:', inputValue);
          }}
        />
        <ChevronDownIcon 
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </div>

      {/* Dropdown */}
      {isOpen && filteredCities.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredCities.map((city, index) => (
            <div
              key={`${city.code}-${city.name}`}
              onClick={() => handleCitySelect(city)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
              className={`px-4 py-3 cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 ${
                index === highlightedIndex ? 'bg-neutral-100' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-black">
                    {city.name}, {city.country}
                  </div>
                  {city.airport && (
                    <div className="text-sm text-neutral-600">
                      {city.airport}
                    </div>
                  )}
                </div>
                <div className="text-sm font-mono text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                  {city.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation message */}
      {inputValue && !selectedCity && !isOpen && (
        <div className="absolute -bottom-6 left-0 text-sm text-amber-600">
          Please select a valid city from the dropdown
        </div>
      )}
    </div>
  );
}
