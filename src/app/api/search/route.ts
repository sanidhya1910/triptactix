import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchParams, SearchResults, Flight, Train } from '@/types/travel';
import { SerpAPIService } from '@/lib/serpapi-service';
import { RealtimeFlightService } from '@/lib/realtime-flights';
import { mlService } from '@/lib/ml-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const searchSchema = z.object({
  origin: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    city: z.string(),
    country: z.string(),
    type: z.enum(['airport', 'station', 'city']),
  }),
  destination: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    city: z.string(),
    country: z.string(),
    type: z.enum(['airport', 'station', 'city']),
  }),
  departureDate: z.string().transform((str) => new Date(str)),
  returnDate: z.string().transform((str) => new Date(str)).optional(),
  passengers: z.object({
    adults: z.number().min(1).max(9),
    children: z.number().min(0).max(9),
    infants: z.number().min(0).max(9),
  }),
  travelClass: z.enum(['economy', 'premium', 'business', 'first']),
  useMLPredictions: z.boolean().optional().default(false), // New ML flag
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = searchSchema.parse(body);

    const searchResults = await performSearch(searchParams);

    return NextResponse.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error('Search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

async function performSearch(params: SearchParams & { useMLPredictions?: boolean }): Promise<SearchResults> {
  const [flights, trains] = await Promise.all([
    searchFlights(params),
    searchTrains(params),
  ]);

  return {
    flights,
    trains,
    hotels: [],
    packages: [],
    searchId: generateSearchId(),
    searchParams: params,
    timestamp: new Date(),
    mlMode: params.useMLPredictions || false, // Add ML mode indicator
  };
}

async function searchFlights(params: SearchParams & { useMLPredictions?: boolean }): Promise<Flight[]> {
  try {
    console.log('Searching flights with SerpAPI (Google Flights)...');
    
    // Use only SerpAPI for flight search
    const serpFlights = await SerpAPIService.searchFlights({
      origin: params.origin.city,
      destination: params.destination.city,
      departureDate: formatDate(params.departureDate),
      returnDate: params.returnDate ? formatDate(params.returnDate) : undefined,
      adults: params.passengers.adults,
      children: params.passengers.children || 0,
      currency: 'INR'
    });

    if (serpFlights.length > 0) {
      console.log(`Found ${serpFlights.length} flights from SerpAPI (Google Flights)`);
      // Compute route-level predicted price using Python ML API for consistency with analysis card
      let pythonPredicted: number | undefined;
      try {
        // ML prediction integration - skip during build to avoid ECONNRESET
      let pythonPredicted = null;
      try {
        // Skip ML API calls during build process
        if (!process.env.NEXT_BUILD && process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
          const normalizeCity = (c: string): string => {
            const map: Record<string, string> = {
              'Mumbai': 'Mumbai',
              'Bombay': 'Mumbai', 
              'Bengaluru': 'Bangalore',
            };
            return map[c] || c;
          };
          const src = normalizeCity(params.origin.city);
          const dst = normalizeCity(params.destination.city);
          const routeMinPrice = Math.min(...serpFlights.map(f => f.price.total));
          
          // Only make network calls in actual runtime, not build
          const isRuntimeEnvironment = process.env.NODE_ENV === 'development' || 
                                     (process.env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.pid);
          
          if (isRuntimeEnvironment) {
            try {
              const resp = await fetch('http://localhost:8000/analyze-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source_city: src,
                  destination_city: dst,
                  current_price: isFinite(routeMinPrice) ? routeMinPrice : 15000,
                  departure_date: formatDate(params.departureDate)
                }),
                signal: AbortSignal.timeout(5000) // 5 second timeout
              });
              if (resp.ok) {
                const data = await resp.json();
                if (data?.success && data?.analysis?.current_vs_predicted?.predicted_price) {
                  pythonPredicted = data.analysis.current_vs_predicted.predicted_price;
                }
              } else {
                console.warn('Python analyze-price returned non-OK status');
              }
            } catch (fetchError) {
              // Handle network errors gracefully during build
              console.warn('Python analyze-price call failed during build/runtime:', fetchError instanceof Error ? fetchError.message : fetchError);
            }
          }
        }
      } catch (mlApiError) {
        console.warn('ML price prediction failed:', mlApiError);
      }
      } catch (mlApiError) {
        console.warn('ML price prediction failed:', mlApiError);
      }

      // Enhance flights with ML insights
      try {
        const enhancedFlights = await mlService.enhanceSearchResults(
          serpFlights,
          params.origin.city,
          params.destination.city,
          formatDate(params.departureDate)
        );
        console.log('Enhanced flights with ML insights');
        
        // Transform SerpAPI results to our Flight format
        const transformedFlights: Flight[] = enhancedFlights.map(flight => {
          
          // Parse the time properly - SerpAPI returns full timestamps like "2025-08-30 02:20"
          const parseFlightTime = (date: string, time: string): Date => {
            try {
              console.log(`Parsing flight time: date="${date}", time="${time}"`);
              
              // The time field already contains the full timestamp
              if (time.includes(' ')) {
                // Format: "2025-08-30 02:20"
                const parsed = new Date(time);
                console.log(`Parsed full timestamp "${time}" to:`, parsed);
                return parsed;
              } else {
                // Fallback: combine date and time
                const combined = `${date}T${time}:00`;
                const parsed = new Date(combined);
                console.log(`Combined date+time "${combined}" to:`, parsed);
                return parsed;
              }
            } catch (error) {
              console.error(`Error parsing time ${date}T${time}:`, error);
              // Fallback to a default time
              return new Date(`${date}T12:00:00`);
            }
          };
          
          return {
            id: `serp_${flight.id}`,
            airline: flight.airline,
            bookingClass: params.travelClass,
            outbound: [
              {
                id: `${flight.id}-outbound`,
                origin: params.origin,
                destination: params.destination,
                departureTime: parseFlightTime(flight.departure.date, flight.departure.time),
                arrivalTime: parseFlightTime(flight.arrival.date, flight.arrival.time),
                duration: parseDuration(flight.duration),
                airline: flight.airline,
                flightNumber: flight.flightNumber,
                aircraft: 'Aircraft',
                stops: flight.stops,
              },
            ],
            inbound: params.returnDate
              ? [
                  {
                  id: `${flight.id}-inbound`,
                  origin: params.destination,
                  destination: params.origin,
                  departureTime: new Date(params.returnDate.getTime() + 14 * 60 * 60 * 1000),
                  arrivalTime: new Date(params.returnDate.getTime() + 17 * 60 * 60 * 1000),
                  duration: parseDuration(flight.duration),
                  airline: flight.airline,
                  flightNumber: flight.flightNumber.replace(/\d+$/, (match: string) => (parseInt(match) + 1).toString()),
                  aircraft: 'Aircraft',
                  stops: flight.stops,
                },
              ]
            : undefined,
          price: {
            total: flight.price.total || 4500,
            currency: flight.price.currency,
            breakdown: {
              base: (flight.price.total || 4500) * 0.8,
              taxes: (flight.price.total || 4500) * 0.2,
              fees: 0,
            },
          },
          availability: {
            seats: Math.floor(Math.random() * 9) + 1,
            lastUpdated: new Date(),
          },
          policies: {
            cancellation: 'Cancellation allowed up to 24 hours before departure',
            baggage: {
              cabin: '7kg',
              checked: '20kg',
            },
          },
          amenities: ['In-flight meal', 'Entertainment'],
          refundable: true,
          changeable: true,
          source: 'Google Flights',
          // Add ML prediction data
          mlPrediction: flight.mlInsights ? {
            predictedPrice: pythonPredicted ?? flight.mlInsights.predictedPrice,
            confidence: flight.mlInsights.confidence,
            recommendation: flight.mlInsights.recommendation,
            priceRange: {
              min: flight.price.total * 0.8,
              max: flight.price.total * 1.2
            },
            // savings vs predicted to align with analysis card
            savingsPercent: (() => {
              const baseline = pythonPredicted ?? flight.mlInsights!.predictedPrice;
              return Math.round(((flight.price.total - baseline) / baseline) * 100);
            })()
          } : undefined
          };
        });

        return transformedFlights;
      } catch (mlError) {
        console.error('ML enhancement failed:', mlError);
        // Continue with non-enhanced flights
        const transformedFlights: Flight[] = serpFlights.map(flight => {
          
          const parseFlightTime = (date: string, time: string): Date => {
            try {
              console.log(`Parsing flight time (fallback): date="${date}", time="${time}"`);
              
              if (time.includes(' ')) {
                const parsed = new Date(time);
                console.log(`Parsed full timestamp "${time}" to:`, parsed);
                return parsed;
              } else {
                const combined = `${date}T${time}:00`;
                const parsed = new Date(combined);
                console.log(`Combined date+time "${combined}" to:`, parsed);
                return parsed;
              }
            } catch (error) {
              console.error(`Error parsing time ${date}T${time}:`, error);
              return new Date(`${date}T12:00:00`);
            }
          };
          
          return {
            id: `serp_${flight.id}`,
            airline: flight.airline,
            bookingClass: params.travelClass,
            outbound: [
              {
                id: `${flight.id}-outbound`,
                origin: params.origin,
                destination: params.destination,
                departureTime: parseFlightTime(flight.departure.date, flight.departure.time),
                arrivalTime: parseFlightTime(flight.arrival.date, flight.arrival.time),
                duration: parseDuration(flight.duration),
                airline: flight.airline,
                flightNumber: flight.flightNumber,
                aircraft: 'Aircraft',
                stops: flight.stops,
              },
            ],
            inbound: params.returnDate
              ? [
                  {
                  id: `${flight.id}-inbound`,
                  origin: params.destination,
                  destination: params.origin,
                  departureTime: new Date(params.returnDate.getTime() + 14 * 60 * 60 * 1000),
                  arrivalTime: new Date(params.returnDate.getTime() + 17 * 60 * 60 * 1000),
                  duration: parseDuration(flight.duration),
                  airline: flight.airline,
                  flightNumber: flight.flightNumber.replace(/\d+$/, (match: string) => (parseInt(match) + 1).toString()),
                  aircraft: 'Aircraft',
                  stops: flight.stops,
                },
              ]
            : undefined,
          price: {
            total: flight.price.total || 4500,
            currency: flight.price.currency,
            breakdown: {
              base: (flight.price.total || 4500) * 0.8,
              taxes: (flight.price.total || 4500) * 0.2,
              fees: 0,
            },
          },
          availability: {
            seats: Math.floor(Math.random() * 9) + 1,
            lastUpdated: new Date(),
          },
          policies: {
            cancellation: 'Cancellation allowed up to 24 hours before departure',
            baggage: {
              cabin: '7kg',
              checked: '20kg',
            },
          },
          amenities: ['In-flight meal', 'Entertainment'],
          refundable: true,
          changeable: true,
          source: 'Google Flights'
          };
        });

        return transformedFlights;
      }
    }
    
    console.log('SerpAPI returned no results, trying real-time service fallback...');
    
    // Use RealtimeFlightService as fallback if SerpAPI fails
    const flights = await RealtimeFlightService.searchFlights(params);
    
    if (flights.length > 0) {
      console.log(`Found ${flights.length} flights from real-time sources`);
      return flights;
    }
    
    console.log('All flight search methods failed, returning empty array');
    return [];
    
  } catch (error) {
    console.error('Flight search error:', error);
    
    // As final fallback, try RealtimeFlightService
    try {
      console.log('Primary search failed, trying RealtimeFlightService fallback...');
      const fallbackFlights = await RealtimeFlightService.searchFlights(params);
      if (fallbackFlights.length > 0) {
        console.log(`Fallback found ${fallbackFlights.length} flights`);
        return fallbackFlights;
      }
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
    }
    
    return [];
  }
}

// Helper function to format dates for SerpAPI
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function searchTrains(params: SearchParams): Promise<Train[]> {
  // Mock train data with INR pricing for Indian routes
  const mockTrains: Train[] = [
    {
      id: 'train-1',
      operator: 'Indian Railways',
      class: 'AC First Class',
      outbound: [
        {
          id: 'outbound-train-1',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 4 * 60 * 60 * 1000),
          arrivalTime: new Date(params.departureDate.getTime() + 12 * 60 * 60 * 1000),
          duration: 480, // 8 hours
          trainNumber: '12345',
          trainName: 'Express Premium',
          operator: 'Indian Railways',
          class: 'AC First Class',
        },
      ],
      price: {
        total: 2500,
        currency: 'INR',
        breakdown: {
          base: 2200,
          taxes: 300,
          fees: 0,
        },
      },
      amenities: ['AC', 'Meals', 'WiFi'],
      refundable: true,
      changeable: true,
    },
  ];

  return mockTrains;
}

function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)h?\s*(\d+)?m?/);
  if (match) {
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    return hours * 60 + minutes;
  }
  return 180; // Default 3 hours
}
