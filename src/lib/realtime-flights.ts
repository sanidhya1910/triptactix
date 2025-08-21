import { Flight, SearchParams } from '@/types/travel';

interface FlightSearchCache {
  [key: string]: {
    data: Flight[];
    timestamp: number;
    expiresIn: number; // minutes
  };
}

export class RealtimeFlightService {
  private static cache: FlightSearchCache = {};
  private static readonly CACHE_DURATION = 15; // minutes

  /**
   * Main search function - simplified to return mock data
   * This can be extended with real APIs in the future
   */
  static async searchFlights(params: SearchParams): Promise<Flight[]> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('Returning cached flight data');
      return cached;
    }

    console.log('Generating enhanced mock flight data...');
    
    try {
      // Generate enhanced mock data with realistic flight patterns
      const flights = this.getEnhancedMockFlights(params);
      
      // Cache the results
      this.setCache(cacheKey, flights);
      
      return flights;
    } catch (error) {
      console.error('Flight search failed:', error);
      return this.getMockFlights(params);
    }
  }

  /**
   * Generate cache key from search parameters
   */
  private static generateCacheKey(params: SearchParams): string {
    const key = `${params.origin.city}-${params.destination.city}-${params.departureDate.toISOString().split('T')[0]}-${params.passengers.adults}-${params.travelClass}`;
    return key.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get cached results if still valid
   */
  private static getFromCache(key: string): Flight[] | null {
    const cached = this.cache[key];
    if (!cached) return null;

    const now = Date.now();
    const expiryTime = cached.timestamp + (cached.expiresIn * 60 * 1000);
    
    if (now < expiryTime) {
      return cached.data;
    }

    // Remove expired cache
    delete this.cache[key];
    return null;
  }

  /**
   * Cache flight results
   */
  private static setCache(key: string, data: Flight[], expiresIn: number = this.CACHE_DURATION): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
  }

  /**
   * Get airport code from city name
   */
  private static getAirportCode(city: string): string {
    const airportCodes: { [key: string]: string } = {
      'delhi': 'DEL',
      'new delhi': 'DEL',
      'mumbai': 'BOM',
      'bangalore': 'BLR',
      'bengaluru': 'BLR',
      'chennai': 'MAA',
      'kolkata': 'CCU',
      'hyderabad': 'HYD',
      'pune': 'PNQ',
      'ahmedabad': 'AMD',
      'kochi': 'COK',
      'goa': 'GOI',
      'jaipur': 'JAI',
      'lucknow': 'LKO',
      'chandigarh': 'IXC',
      'indore': 'IDR',
      'bhubaneswar': 'BBI',
      'coimbatore': 'CJB',
      'nagpur': 'NAG',
      'vadodara': 'BDQ'
    };

    return airportCodes[city.toLowerCase()] || city.toUpperCase().substring(0, 3);
  }

  /**
   * Generate enhanced mock flights with realistic data
   */
  private static getEnhancedMockFlights(params: SearchParams): Flight[] {
    const airlines = [
      { code: '6E', name: 'IndiGo', priceMultiplier: 1.0 },
      { code: 'AI', name: 'Air India', priceMultiplier: 1.2 },
      { code: 'SG', name: 'SpiceJet', priceMultiplier: 0.9 },
      { code: 'UK', name: 'Vistara', priceMultiplier: 1.3 },
      { code: 'G8', name: 'GoAir', priceMultiplier: 0.85 },
      { code: 'QP', name: 'Akasa Air', priceMultiplier: 1.1 }
    ];

    const basePrice = this.calculateBasePrice(params.origin.city, params.destination.city);
    const flights: Flight[] = [];

    airlines.forEach((airline, index) => {
      // Generate 2-3 flights per airline with different timings
      const flightsPerAirline = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < flightsPerAirline; i++) {
        const departureHour = 6 + Math.floor(Math.random() * 16); // 6 AM to 10 PM
        const departureMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
        const flightDuration = this.calculateFlightDuration(params.origin.city, params.destination.city);
        
        const departureTime = new Date(params.departureDate);
        departureTime.setHours(departureHour, departureMinute, 0, 0);
        
        const arrivalTime = new Date(departureTime);
        arrivalTime.setMinutes(arrivalTime.getMinutes() + flightDuration);
        
        const price = Math.round(basePrice * airline.priceMultiplier * (0.8 + Math.random() * 0.4));
        const stops = Math.random() < 0.7 ? 0 : 1; // 70% direct flights
        
        const flight: Flight = {
          id: `${airline.code}${1234 + index * 100 + i}`,
          airline: airline.name,
          price: {
            total: price,
            currency: 'INR',
            breakdown: {
              base: Math.round(price * 0.8),
              taxes: Math.round(price * 0.15),
              fees: Math.round(price * 0.05)
            }
          },
          outbound: [{
            id: `${airline.code}${1234 + index * 100 + i}_outbound`,
            origin: {
              id: this.getAirportCode(params.origin.city),
              name: params.origin.name,
              code: this.getAirportCode(params.origin.city),
              city: params.origin.city,
              country: params.origin.country,
              type: 'airport' as const
            },
            destination: {
              id: this.getAirportCode(params.destination.city),
              name: params.destination.name,
              code: this.getAirportCode(params.destination.city),
              city: params.destination.city,
              country: params.destination.country,
              type: 'airport' as const
            },
            departureTime,
            arrivalTime,
            duration: flightDuration,
            airline: airline.name,
            flightNumber: `${airline.code} ${1234 + index * 100 + i}`,
            aircraft: this.getRandomAircraft(),
            stops
          }],
          bookingClass: params.travelClass,
          stops,
          baggage: {
            checkedBags: stops === 0 ? 1 : 2,
            carryOnBags: 1,
            personalItem: true
          },
          amenities: ['WiFi', 'In-flight entertainment'],
          refundable: Math.random() > 0.5,
          changeable: true
        };
        
        flights.push(flight);
      }
    });

    // Sort by price
    return flights.sort((a, b) => a.price.total - b.price.total);
  }

  /**
   * Calculate base price between cities
   */
  private static calculateBasePrice(origin: string, destination: string): number {
    const distance = this.getDistanceBetweenCities(origin, destination);
    const baseRate = 3.5; // INR per km
    const basePrice = Math.max(distance * baseRate, 2500); // Minimum 2500 INR
    
    // Add random variation ±20%
    return Math.round(basePrice * (0.8 + Math.random() * 0.4));
  }

  /**
   * Estimate distance between cities (mock data)
   */
  private static getDistanceBetweenCities(city1: string, city2: string): number {
    const distances: { [key: string]: number } = {
      'delhi-mumbai': 1150,
      'mumbai-delhi': 1150,
      'delhi-bangalore': 1740,
      'bangalore-delhi': 1740,
      'mumbai-bangalore': 840,
      'bangalore-mumbai': 840,
      'delhi-chennai': 1760,
      'chennai-delhi': 1760,
      'mumbai-chennai': 1030,
      'chennai-mumbai': 1030,
      'bangalore-chennai': 290,
      'chennai-bangalore': 290,
      'delhi-kolkata': 1320,
      'kolkata-delhi': 1320,
      'mumbai-kolkata': 1650,
      'kolkata-mumbai': 1650,
      'delhi-hyderabad': 1270,
      'hyderabad-delhi': 1270
    };

    const key = `${city1.toLowerCase()}-${city2.toLowerCase()}`;
    return distances[key] || 1000; // Default 1000 km
  }

  /**
   * Calculate flight duration based on distance
   */
  private static calculateFlightDuration(origin: string, destination: string): number {
    const distance = this.getDistanceBetweenCities(origin, destination);
    const averageSpeed = 800; // km/h
    const flightTime = (distance / averageSpeed) * 60; // in minutes
    
    // Add taxi, takeoff, landing time
    return Math.round(flightTime + 30);
  }

  /**
   * Get random aircraft type
   */
  private static getRandomAircraft(): string {
    const aircraft = ['A320', 'B737', 'A321', 'B738', 'ATR 72', 'A319', 'B777'];
    return aircraft[Math.floor(Math.random() * aircraft.length)];
  }

  /**
   * Fallback mock flights with basic data
   */
  private static getMockFlights(params: SearchParams): Flight[] {
    return [{
      id: 'MOCK001',
      airline: 'IndiGo',
      price: {
        total: 5500,
        currency: 'INR',
        breakdown: {
          base: 4500,
          taxes: 800,
          fees: 200
        }
      },
      outbound: [{
        id: 'MOCK001_outbound',
        origin: {
          id: this.getAirportCode(params.origin.city),
          name: params.origin.name,
          code: this.getAirportCode(params.origin.city),
          city: params.origin.city,
          country: params.origin.country,
          type: 'airport' as const
        },
        destination: {
          id: this.getAirportCode(params.destination.city),
          name: params.destination.name,
          code: this.getAirportCode(params.destination.city),
          city: params.destination.city,
          country: params.destination.country,
          type: 'airport' as const
        },
        departureTime: new Date(params.departureDate.getTime() + 10 * 60 * 60 * 1000), // 10 AM
        arrivalTime: new Date(params.departureDate.getTime() + 12.5 * 60 * 60 * 1000), // 12:30 PM
        duration: 150,
        airline: 'IndiGo',
        flightNumber: '6E 2001',
        aircraft: 'A320',
        stops: 0
      }],
      bookingClass: params.travelClass,
      stops: 0,
      baggage: {
        checkedBags: 1,
        carryOnBags: 1,
        personalItem: true
      },
      amenities: ['WiFi'],
      refundable: false,
      changeable: true
    }];
  }
}

export default RealtimeFlightService;
