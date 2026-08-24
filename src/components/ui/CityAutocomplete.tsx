'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { MapPin, CaretDown } from '@phosphor-icons/react/ssr';
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
  /** Restrict suggestions to the six routes the fare model covers. */
  mlMode?: boolean;
  id?: string;
  invalid?: boolean;
}

export default function CityAutocomplete({
  placeholder,
  value,
  onChange,
  className = '',
  mlMode = false,
  id,
  invalid = false,
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [justSelected, setJustSelected] = useState(false);
  
  const reactId = useId();
  const listboxId = `city-options-${reactId}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Sync input field with inputValue state
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== inputValue) {
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
      return;
    }
    
    // Delay closing to allow click on dropdown items
    setTimeout(() => {
      
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
        <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`h-10 w-full rounded-md border bg-surface pl-9 pr-9 text-sm text-ink transition-colors placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand/15 ${
            invalid
              ? 'border-neg-fg focus:border-neg-fg focus:ring-neg-fg/15'
              : selectedCity
                ? 'border-pos-fg/40 focus:border-brand'
                : inputValue && !selectedCity
                  ? 'border-caution-fg/45 focus:border-caution-fg'
                  : 'border-line-strong hover:border-ink/25 focus:border-brand'
          }`}
          autoComplete="off"
        />
        <CaretDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && filteredCities.length > 0 && (
        <div
          ref={listRef}
          role="listbox"
          id={listboxId}
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-xl"
        >
          {filteredCities.map((city, index) => (
            <div
              key={`${city.code}-${city.name}`}
              onClick={() => handleCitySelect(city)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking
              role="option"
              aria-selected={index === highlightedIndex}
              className={`cursor-pointer border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-hover ${
                index === highlightedIndex ? 'bg-surface-hover' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink">
                    {city.name}, {city.country}
                  </div>
                  {city.airport && (
                    <div className="mt-0.5 text-sm text-ink-secondary">{city.airport}</div>
                  )}
                </div>
                <div className="rounded-sm bg-surface-sunken px-2 py-1 font-mono text-xs text-ink-secondary">
                  {city.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation message */}
      {inputValue && !selectedCity && !isOpen && (
        <p className="mt-1.5 text-xs text-caution-fg">Pick a city from the list to continue.</p>
      )}
    </div>
  );
}
