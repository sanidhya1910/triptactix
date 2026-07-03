import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchParams, SearchResults, Flight, Train, Hotel } from '@/types/travel';
import { SerpAPIService } from '@/lib/serpapi-service';
import { RealtimeFlightService } from '@/lib/realtime-flights';
import { mlService } from '@/lib/ml-service';
import { canonicalCity } from '@/lib/cities';
import { callMLAPI, NetworkError } from '@/lib/resilient-fetch';

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

    // Handle network errors specifically
    if (error instanceof NetworkError) {
      console.warn(`Network error (${error.code}): ${error.message}`);
      return NextResponse.json(
        { success: false, error: 'External services temporarily unavailable', code: error.code },
        { status: 503 }
      );
    }
    
    if (error && typeof error === 'object' && 'code' in error) {
      const networkError = error as { code: string; message?: string };
      if (networkError.code === 'ECONNRESET' || networkError.code === 'ETIMEDOUT' || networkError.code === 'ECONNREFUSED') {
        console.warn(`Network error (${networkError.code}): External service unavailable`);
        return NextResponse.json(
          { success: false, error: 'External services temporarily unavailable', code: networkError.code },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function performSearch(params: SearchParams & { useMLPredictions?: boolean }): Promise<SearchResults> {
  const [flights, trains, hotels] = await Promise.all([
    searchFlights(params),
    searchTrains(params),
    searchHotels(params),
  ]);

  return {
    flights,
    trains,
    hotels,
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
        // Skip ML API calls during build process
        if (!process.env.NEXT_BUILD && process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
          const src = canonicalCity(params.origin.city);
          const dst = canonicalCity(params.destination.city);
          const routeMinPrice = Math.min(...serpFlights.map(f => f.price.total));

          // Only make network calls in actual runtime, not build
          const isRuntimeEnvironment = process.env.NODE_ENV === 'development' ||
                                     (process.env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.pid);

          if (isRuntimeEnvironment) {
            try {
              const mlResult = await callMLAPI<any>('/analyze-price', {
                source_city: src,
                destination_city: dst,
                current_price: isFinite(routeMinPrice) ? routeMinPrice : 15000,
                departure_date: formatDate(params.departureDate)
              }, {
                maxRetries: 2,
                timeout: 3000
              });

              if (mlResult?.success && mlResult?.analysis?.current_vs_predicted?.predicted_price) {
                pythonPredicted = mlResult.analysis.current_vs_predicted.predicted_price;
              }
            } catch (error) {
              if (error instanceof NetworkError) {
                console.warn(`ML API network error (${error.code}): ${error.message}`);
              } else {
                console.warn('ML API call failed:', error instanceof Error ? error.message : error);
              }
            }
          }
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

        // Add mock ML predictions to fallback flights
        return transformedFlights.map(f => {
          const mockPredicted = Math.round(f.price.total * (0.9 + Math.random() * 0.2));
          const savingsPercent = Math.round(((f.price.total - mockPredicted) / mockPredicted) * 100);
          return {
            ...f,
            mlPrediction: {
              predictedPrice: mockPredicted,
              confidence: 0.55 + Math.random() * 0.25,
              recommendation: savingsPercent <= -10 ? 'Excellent deal — below predicted price' :
                savingsPercent >= 10 ? 'Consider waiting — above predicted price' :
                'Fair price — near predicted range',
              priceRange: { min: f.price.total * 0.8, max: f.price.total * 1.2 },
              savingsPercent,
            },
          };
        });
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

// Rough inter-city rail distances (km) for realistic durations & fares.
const RAIL_DISTANCE_KM: Record<string, number> = {
  'new delhi-mumbai': 1385, 'new delhi-bangalore': 2150, 'new delhi-chennai': 2180,
  'new delhi-kolkata': 1450, 'new delhi-hyderabad': 1500, 'mumbai-bangalore': 980,
  'mumbai-chennai': 1280, 'mumbai-kolkata': 1960, 'mumbai-hyderabad': 710,
  'bangalore-chennai': 360, 'bangalore-hyderabad': 570, 'chennai-hyderabad': 630,
  'chennai-kolkata': 1660, 'bangalore-kolkata': 1870, 'kolkata-hyderabad': 1490,
};

function railDistanceKm(a: string, b: string): number {
  const k1 = `${canonicalCity(a).toLowerCase()}-${canonicalCity(b).toLowerCase()}`;
  const k2 = `${canonicalCity(b).toLowerCase()}-${canonicalCity(a).toLowerCase()}`;
  return RAIL_DISTANCE_KM[k1] || RAIL_DISTANCE_KM[k2] || 900;
}

async function searchTrains(params: SearchParams): Promise<Train[]> {
  const distance = railDistanceKm(params.origin.city, params.destination.city);

  // Per-km fares (₹) roughly aligned to Indian Railways class pricing.
  const classFare: Record<string, number> = { SL: 0.55, '3A': 1.5, '2A': 2.2, '1A': 3.7, CC: 1.3 };

  const templates = [
    { number: '12951', name: 'Rajdhani Express', depHour: 16, speed: 85, classes: ['1A', '2A', '3A'], amenities: ['AC', 'Meals included', 'Bedding', 'Charging'] },
    { number: '12259', name: 'Duronto Express', depHour: 22, speed: 80, classes: ['2A', '3A', 'SL'], amenities: ['AC', 'Pantry car', 'Bedding'] },
    { number: '12627', name: 'Superfast Express', depHour: 6, speed: 60, classes: ['2A', '3A', 'SL'], amenities: ['Pantry car', 'Charging'] },
    { number: '12211', name: 'Garib Rath', depHour: 13, speed: 75, classes: ['3A', 'CC'], amenities: ['AC', 'Economy bedding'] },
  ];

  const trains: Train[] = [];
  for (const t of templates) {
    const durationMin = Math.round((distance / t.speed) * 60);
    const departureTime = new Date(params.departureDate);
    departureTime.setHours(t.depHour, [0, 15, 30, 45][t.number.charCodeAt(4) % 4], 0, 0);
    const arrivalTime = new Date(departureTime.getTime() + durationMin * 60000);

    for (const cls of t.classes) {
      const base = Math.max(250, Math.round((distance * classFare[cls]) / 10) * 10);
      const total = base + Math.round(base * 0.05);
      trains.push({
        id: `train-${t.number}-${cls}`,
        operator: 'Indian Railways',
        class: cls,
        outbound: [{
          id: `train-${t.number}-${cls}-out`,
          origin: params.origin,
          destination: params.destination,
          departureTime,
          arrivalTime,
          duration: durationMin,
          trainNumber: t.number,
          trainName: t.name,
          operator: 'Indian Railways',
          class: cls,
        }],
        price: { total, currency: 'INR', breakdown: { base, taxes: total - base, fees: 0 } },
        amenities: t.amenities,
        refundable: true,
        changeable: true,
      });
    }
  }

  return trains.sort((a, b) => a.price.total - b.price.total);
}

async function searchHotels(params: SearchParams): Promise<Hotel[]> {
  // Try real hotels via SerpAPI; fall back to realistic generated options.
  try {
    const real = await SerpAPIService.searchHotels({
      destination: params.destination.city,
      checkInDate: formatDate(params.departureDate),
      checkOutDate: formatDate(params.returnDate ?? new Date(params.departureDate.getTime() + 2 * 86400000)),
      adults: params.passengers.adults,
      currency: 'INR',
    });
    if (real.length > 0) {
      return real.slice(0, 6).map((h: any, i: number): Hotel => {
        const perNight = h.ratePerNight?.extractedLowest || h.totalRate?.extractedLowest || 4500;
        return {
          id: `serp-hotel-${i}`,
          name: h.name || `Hotel ${i + 1}`,
          location: { address: h.nearbyPlaces?.[0]?.name || `${params.destination.city}`, city: params.destination.city, country: 'India', coordinates: { lat: 0, lng: 0 } },
          rating: h.overallRating || 4,
          starRating: h.extractedHotelClass || 4,
          images: h.images?.slice(0, 1).map((im: any) => im.thumbnail) || [],
          amenities: h.amenities?.slice(0, 6) || ['WiFi', 'Breakfast'],
          rooms: [buildRoom(`serp-${i}`, perNight, params)],
        };
      });
    }
  } catch (e) {
    console.warn('SerpAPI hotels unavailable, using generated hotels:', e instanceof Error ? e.message : e);
  }
  return generateHotels(params);
}

function buildRoom(idSuffix: string, perNight: number, params: SearchParams): any {
  const nights = params.returnDate
    ? Math.max(1, Math.ceil((params.returnDate.getTime() - params.departureDate.getTime()) / 86400000))
    : 2;
  const total = perNight * nights;
  return {
    id: `room-${idSuffix}`, type: 'standard', name: 'Standard Room',
    description: 'Comfortable room with modern amenities',
    capacity: { adults: 2, children: 1 },
    price: { total, currency: 'INR', perNight, breakdown: { base: Math.round(total * 0.85), taxes: Math.round(total * 0.15), fees: 0 } },
    amenities: ['WiFi', 'AC', 'TV'], images: [], availability: true, refundable: true, changeable: true,
  };
}

function generateHotels(params: SearchParams): Hotel[] {
  const city = params.destination.city;
  const metros = new Set(['New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad']);
  const tierBase = metros.has(canonicalCity(city)) ? 5000 : 3200;
  const options = [
    { name: `The Grand ${city}`, star: 5, mult: 2.6, area: 'City Centre', amenities: ['Pool', 'Spa', 'WiFi', 'Restaurant', 'Gym', 'Bar'] },
    { name: `${city} Marriott`, star: 5, mult: 2.2, area: 'Business District', amenities: ['Pool', 'WiFi', 'Restaurant', 'Gym'] },
    { name: `Courtyard ${city}`, star: 4, mult: 1.5, area: 'Airport Road', amenities: ['WiFi', 'Breakfast', 'Gym', 'Restaurant'] },
    { name: `Ginger ${city}`, star: 3, mult: 1.0, area: 'Railway Station', amenities: ['WiFi', 'Breakfast', 'AC'] },
    { name: `FabHotel ${city} Inn`, star: 3, mult: 0.8, area: 'Old Town', amenities: ['WiFi', 'AC', 'Breakfast'] },
    { name: `Zostel ${city}`, star: 2, mult: 0.55, area: 'Backpacker Hub', amenities: ['WiFi', 'Common Kitchen', 'Lounge'] },
  ];
  return options.map((o, i): Hotel => {
    const perNight = Math.round((tierBase * o.mult) / 100) * 100;
    return {
      id: `hotel-${i}`,
      name: o.name,
      location: { address: `${o.area}, ${city}`, city, country: 'India', coordinates: { lat: 0, lng: 0 } },
      rating: Math.min(5, 3.6 + o.star * 0.25),
      starRating: o.star,
      images: [],
      amenities: o.amenities,
      rooms: [buildRoom(`gen-${i}`, perNight, params)],
    };
  });
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
