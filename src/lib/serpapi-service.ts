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

export interface SerpAPISearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  currency?: string;
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
      console.log('SerpAPI search params:', params);

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

      console.log('SerpAPI request params:', searchParams);

      return new Promise((resolve, reject) => {
        getJson(searchParams, (json: any) => {
          try {
            if (json.error) {
              console.error('SerpAPI error:', json.error);
              reject(new Error(`SerpAPI error: ${json.error}`));
              return;
            }

            console.log('SerpAPI raw response keys:', Object.keys(json));
            
            const flights = this.transformFlightData(json, params.currency || 'USD');
            console.log(`SerpAPI found ${flights.length} flights`);
            resolve(flights);
          } catch (error) {
            console.error('Error processing SerpAPI response:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('SerpAPI search error:', error);
      throw error;
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
