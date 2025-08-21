import { getJson } from 'serpapi';

// Local flight offer type replacing deleted '@/types/rapidapi'
export interface FlightOffer {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departure: {
    airport: string;
    airportCode: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    airportCode: string;
    time: string;
    date: string;
  };
  duration: string; // formatted like '2h 30m'
  price: {
    total: number;
    currency: string;
  };
  stops: number;
  class: string;
  baggage: {
    cabin: string;
    checked: string;
  };
  // Optional ML insights augmentation
  mlInsights?: {
    priceComparison: {
      category: string;
      recommendation: string;
      percentDifference: number;
      comparedToAverage: number;
    };
    isGoodDeal: boolean;
    predictedPrice: number;
    confidence: number;
    recommendation: string;
    historicalRank: string;
  };
}

export interface HotelOffer {
  id: string;
  name: string;
  description: string;
  type: string;
  link: string;
  logo?: string;
  sponsored: boolean;
  ecocertified?: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  checkInTime?: string;
  checkOutTime?: string;
  ratePerNight: {
    lowest: string;
    extractedLowest: number;
    beforeTaxesFees?: string;
    extractedBeforeTaxesFees?: number;
  };
  totalRate: {
    lowest: string;
    extractedLowest: number;
    beforeTaxesFees?: string;
    extractedBeforeTaxesFees?: number;
  };
  prices: Array<{
    source: string;
    logo?: string;
    ratePerNight: {
      lowest: string;
      extractedLowest: number;
      beforeTaxesFees?: string;
      extractedBeforeTaxesFees?: number;
    };
  }>;
  nearbyPlaces?: Array<{
    name: string;
    transportations: Array<{
      type: string;
      duration: string;
    }>;
  }>;
  hotelClass?: string;
  extractedHotelClass?: number;
  images: Array<{
    thumbnail: string;
    originalImage: string;
  }>;
  overallRating?: number;
  reviews?: number;
  ratings?: Array<{
    stars: number;
    count: number;
  }>;
  locationRating?: number;
  amenities: string[];
  excludedAmenities?: string[];
  healthAndSafety?: {
    groups: Array<{
      title: string;
      list: Array<{
        title: string;
        available: boolean;
      }>;
    }>;
    detailsLink?: string;
  };
  essentialInfo?: string[];
  propertyToken?: string;
}

export interface SerpAPISearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  currency?: string;
}

export interface HotelSearchParams {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  currency?: string;
  sortBy?: 'price' | 'rating' | 'reviews';
}

export class SerpAPIService {
  private static readonly API_KEY = process.env.SERPAPI_KEY;

  constructor() {
    if (!SerpAPIService.API_KEY) {
      throw new Error('SERPAPI_KEY environment variable is required');
    }
  }

  static async searchFlights(params: SerpAPISearchParams): Promise<FlightOffer[]> {
    if (!this.API_KEY) {
      throw new Error('SERPAPI_KEY environment variable is required');
    }

    try {
      console.log('SerpAPI flight search params:', params);

      const searchParams = {
        engine: 'google_flights',
        departure_id: this.getAirportCode(params.origin),
        arrival_id: this.getAirportCode(params.destination),
        outbound_date: params.departureDate,
        ...(params.returnDate ? { 
          return_date: params.returnDate,
          type: 1 // Round trip
        } : {
          type: 2 // One way
        }),
        currency: params.currency || 'USD',
        hl: 'en',
        api_key: this.API_KEY
      };

      console.log('SerpAPI flight request params:', searchParams);

      return new Promise((resolve, reject) => {
        getJson(searchParams, (json: any) => {
          try {
            if (json.error) {
              console.error('SerpAPI flight error:', json.error);
              reject(new Error(`SerpAPI error: ${json.error}`));
              return;
            }

            console.log('SerpAPI flight raw response keys:', Object.keys(json));
            
            const flights = this.transformFlightData(json, params.currency || 'USD');
            console.log(`SerpAPI found ${flights.length} flights`);
            resolve(flights);
          } catch (error) {
            console.error('Error processing SerpAPI flight response:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('SerpAPI flight search error:', error);
      throw error;
    }
  }

  static async searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
    if (!this.API_KEY) {
      throw new Error('SERPAPI_KEY environment variable is required');
    }

    try {
      console.log('SerpAPI hotel search params:', params);

      const searchParams = {
        engine: 'google_hotels',
        q: params.destination,
        check_in_date: params.checkInDate,
        check_out_date: params.checkOutDate,
        adults: params.adults,
        children: params.children || 0,
        currency: params.currency || 'INR',
        hl: 'en',
        gl: 'in', // India for Indian results
        api_key: this.API_KEY
      };

      console.log('SerpAPI hotel request params:', searchParams);

      return new Promise((resolve, reject) => {
        getJson(searchParams, (json: any) => {
          try {
            if (json.error) {
              console.error('SerpAPI hotel error:', json.error);
              reject(new Error(`SerpAPI hotel error: ${json.error}`));
              return;
            }

            console.log('SerpAPI hotel raw response keys:', Object.keys(json));
            
            const hotels = this.transformHotelData(json, params.currency || 'INR');
            console.log(`SerpAPI found ${hotels.length} hotels`);
            resolve(hotels);
          } catch (error) {
            console.error('Error processing SerpAPI hotel response:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('SerpAPI hotel search error:', error);
      throw error;
    }
  }

  /**
   * Get cheapest round-trip flight price for itinerary planning
   */
  static async getCheapestFlightPrice(
    origin: string, 
    destination: string, 
    departureDate: string, 
    returnDate: string,
    passengers: number = 1
  ): Promise<{ price: number; currency: string } | null> {
    try {
      const flights = await this.searchFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        adults: passengers,
        currency: 'INR'
      });

      if (flights.length === 0) return null;

      // Find the cheapest flight
      const cheapest = flights.reduce((min, flight) => 
        flight.price.total < min.price.total ? flight : min
      );

      return {
        price: cheapest.price.total,
        currency: cheapest.price.currency
      };
    } catch (error) {
      console.error('Error getting cheapest flight price:', error);
      return null;
    }
  }

  /**
   * Get hotel price range for itinerary planning
   */
  static async getHotelPriceRange(
    destination: string,
    checkInDate: string,
    checkOutDate: string,
    guests: number = 2
  ): Promise<{ budget: number; midRange: number; luxury: number; currency: string } | null> {
    try {
      const hotels = await this.searchHotels({
        destination,
        checkInDate,
        checkOutDate,
        adults: guests,
        currency: 'INR'
      });

      if (hotels.length === 0) return null;

      // Sort hotels by price
      const sortedByPrice = hotels
        .filter(h => h.totalRate.extractedLowest > 0)
        .sort((a, b) => a.totalRate.extractedLowest - b.totalRate.extractedLowest);

      if (sortedByPrice.length === 0) return null;

      // Calculate price segments
      const prices = sortedByPrice.map(h => h.totalRate.extractedLowest);
      const budget = prices[Math.floor(prices.length * 0.2)] || prices[0]; // 20th percentile
      const midRange = prices[Math.floor(prices.length * 0.5)] || prices[0]; // 50th percentile (median)
      const luxury = prices[Math.floor(prices.length * 0.8)] || prices[prices.length - 1]; // 80th percentile

      return {
        budget: Math.round(budget),
        midRange: Math.round(midRange),
        luxury: Math.round(luxury),
        currency: 'INR'
      };
    } catch (error) {
      console.error('Error getting hotel price range:', error);
      return null;
    }
  }

  private static transformFlightData(data: any, currency: string): FlightOffer[] {
    const flights: FlightOffer[] = [];

    // Process best_flights if available
    if (data.best_flights && Array.isArray(data.best_flights)) {
      console.log(`Processing ${data.best_flights.length} best flights from SerpAPI`);
      for (const flight of data.best_flights) {
        const transformedFlight = this.transformSingleFlight(flight, currency, 'best');
        if (transformedFlight) {
          flights.push(transformedFlight);
        }
      }
    }

    // Process other_flights
    if (data.other_flights && Array.isArray(data.other_flights)) {
      console.log(`Processing ${data.other_flights.length} other flights from SerpAPI`);
      for (const flight of data.other_flights) {
        const transformedFlight = this.transformSingleFlight(flight, currency, 'other');
        if (transformedFlight) {
          flights.push(transformedFlight);
        }
      }
    }

    return flights;
  }

  private static transformHotelData(data: any, currency: string): HotelOffer[] {
    const hotels: HotelOffer[] = [];

    if (data.properties && Array.isArray(data.properties)) {
      console.log(`Processing ${data.properties.length} hotels from SerpAPI`);
      
      for (const hotel of data.properties) {
        try {
          const transformedHotel: HotelOffer = {
            id: hotel.property_token || `hotel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: hotel.name || 'Unknown Hotel',
            description: hotel.description || '',
            type: hotel.type || 'hotel',
            link: hotel.link || '',
            logo: hotel.logo,
            sponsored: hotel.sponsored || false,
            ecocertified: hotel.eco_certified,
            coordinates: hotel.gps_coordinates ? {
              latitude: hotel.gps_coordinates.latitude,
              longitude: hotel.gps_coordinates.longitude
            } : undefined,
            checkInTime: hotel.check_in_time,
            checkOutTime: hotel.check_out_time,
            ratePerNight: {
              lowest: hotel.rate_per_night?.lowest || '₹0',
              extractedLowest: hotel.rate_per_night?.extracted_lowest || 0,
              beforeTaxesFees: hotel.rate_per_night?.before_taxes_fees,
              extractedBeforeTaxesFees: hotel.rate_per_night?.extracted_before_taxes_fees
            },
            totalRate: {
              lowest: hotel.total_rate?.lowest || '₹0',
              extractedLowest: hotel.total_rate?.extracted_lowest || 0,
              beforeTaxesFees: hotel.total_rate?.before_taxes_fees,
              extractedBeforeTaxesFees: hotel.total_rate?.extracted_before_taxes_fees
            },
            prices: hotel.prices || [],
            nearbyPlaces: hotel.nearby_places,
            hotelClass: hotel.hotel_class,
            extractedHotelClass: hotel.extracted_hotel_class,
            images: hotel.images || [{ thumbnail: '', originalImage: '' }],
            overallRating: hotel.overall_rating,
            reviews: hotel.reviews,
            ratings: hotel.ratings,
            locationRating: hotel.location_rating,
            amenities: hotel.amenities || [],
            excludedAmenities: hotel.excluded_amenities,
            healthAndSafety: hotel.health_and_safety,
            essentialInfo: hotel.essential_info,
            propertyToken: hotel.property_token
          };

          hotels.push(transformedHotel);
        } catch (error) {
          console.error('Error transforming hotel data:', error);
        }
      }
    }

    return hotels;
  }

  private static transformSingleFlight(flightData: any, currency: string, type: string): FlightOffer | null {
    try {
      if (!flightData.flights || !Array.isArray(flightData.flights) || flightData.flights.length === 0) {
        return null;
      }

      const firstFlight = flightData.flights[0];
      const lastFlight = flightData.flights[flightData.flights.length - 1];

      // Handle multiple flights (with layovers)
      const segments = flightData.flights.map((flight: any) => ({
        airline: flight.airline || 'Unknown Airline',
        flightNumber: flight.flight_number || 'N/A',
        departure: {
          airport: flight.departure_airport?.name || 'Unknown Airport',
          code: flight.departure_airport?.id || 'N/A',
          time: flight.departure_airport?.time || 'N/A'
        },
        arrival: {
          airport: flight.arrival_airport?.name || 'Unknown Airport', 
          code: flight.arrival_airport?.id || 'N/A',
          time: flight.arrival_airport?.time || 'N/A'
        },
        duration: flight.duration || 0,
        airplane: flight.airplane || 'Unknown Aircraft'
      }));

      return {
        id: `serpapi_${flightData.booking_token || Date.now()}`,
        airline: firstFlight.airline || 'Unknown Airline',
        airlineCode: this.extractAirlineCode(firstFlight.airline) || 'XX',
        flightNumber: firstFlight.flight_number || 'N/A',
        departure: {
          airport: firstFlight.departure_airport?.name || 'Unknown Airport',
          airportCode: firstFlight.departure_airport?.id || 'N/A',
          time: firstFlight.departure_airport?.time || 'N/A',
          date: firstFlight.departure_airport?.time?.split(' ')[0] || new Date().toISOString().split('T')[0]
        },
        arrival: {
          airport: lastFlight.arrival_airport?.name || 'Unknown Airport',
          airportCode: lastFlight.arrival_airport?.id || 'N/A', 
          time: lastFlight.arrival_airport?.time || 'N/A',
          date: lastFlight.arrival_airport?.time?.split(' ')[0] || new Date().toISOString().split('T')[0]
        },
        duration: this.formatDuration(flightData.total_duration || firstFlight.duration || 0),
        price: {
          total: flightData.price || 0,
          currency: currency
        },
        stops: flightData.layovers ? flightData.layovers.length : 0,
        class: firstFlight.travel_class || 'Economy',
        baggage: {
          cabin: '1 piece',
          checked: '1 piece'
        }
      };
    } catch (error) {
      console.error('Error transforming single flight:', error);
      return null;
    }
  }

  private static getAirportCode(location: string): string {
    // Common airport mappings
    const airportMappings: { [key: string]: string } = {
      'mumbai': 'BOM',
      'delhi': 'DEL',
      'new delhi': 'DEL',
      'bangalore': 'BLR',
      'chennai': 'MAA',
      'kolkata': 'CCU',
      'hyderabad': 'HYD',
      'pune': 'PNQ',
      'goa': 'GOI',
      'cochin': 'COK',
      'trivandrum': 'TRV',
      'ahmedabad': 'AMD',
      'jaipur': 'JAI',
      'lucknow': 'LKO',
      'bhubaneswar': 'BBI',
      'indore': 'IDR',
      'coimbatore': 'CJB',
      'mangalore': 'IXE',
      'nagpur': 'NAG',
      'surat': 'STV',
      'rajkot': 'RAJ',
      'vijayawada': 'VGA',
      'tirupati': 'TIR',
      'madurai': 'IXM',
      'new york': 'JFK',
      'los angeles': 'LAX',
      'london': 'LHR',
      'paris': 'CDG',
      'tokyo': 'NRT',
      'dubai': 'DXB',
      'singapore': 'SIN',
      'bangkok': 'BKK',
      'hong kong': 'HKG',
      'beijing': 'PEK',
      'austin': 'AUS',
      'sydney': 'SYD'
    };

    const normalized = location.toLowerCase().trim();
    
    // Return mapped code if available
    if (airportMappings[normalized]) {
      return airportMappings[normalized];
    }

    // If it's already a 3-letter code, return as is
    if (/^[A-Z]{3}$/.test(location.toUpperCase())) {
      return location.toUpperCase();
    }

    // Special handling for multi-word cities
    if (normalized.includes('delhi')) {
      return 'DEL';
    }
    if (normalized.includes('mumbai')) {
      return 'BOM';
    }
    if (normalized.includes('bangalore') || normalized.includes('bengaluru')) {
      return 'BLR';
    }
    
    // Default fallback - return first 3 letters uppercased
    return location.substring(0, 3).toUpperCase();
  }

  private static extractAirlineCode(airlineName: string): string | null {
    if (!airlineName) return null;
    
    // Common airline code mappings
    const airlineCodesMap: { [key: string]: string } = {
      'IndiGo': '6E',
      'Air India': 'AI',
      'Air India Express': 'IX',
      'SpiceJet': 'SG',
      'GoFirst': 'G8',
      'Vistara': 'UK',
      'AirAsia India': 'I5',
      'Emirates': 'EK',
      'Lufthansa': 'LH',
      'British Airways': 'BA',
      'Qatar Airways': 'QR',
      'Singapore Airlines': 'SQ',
      'Thai Airways': 'TG'
    };

    return airlineCodesMap[airlineName] || airlineName.substring(0, 2).toUpperCase();
  }

  private static formatDuration(minutes: number): string {
    if (!minutes || minutes <= 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  }
}
