import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchParams, SearchResults, Flight, Train } from '@/types/travel';
import RapidAPIService from '@/lib/rapidapi';
import RealtimeFlightService from '@/lib/realtime-flights';
import { FlightSearchRequest } from '@/types/rapidapi';

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
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = searchSchema.parse(body);

    // In a real application, you would call external APIs here
    const searchResults = await performSearch(searchParams);

    return NextResponse.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error('Search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search for travel options',
        },
      },
      { status: 500 }
    );
  }
}

async function performSearch(params: SearchParams): Promise<SearchResults> {
  // Search for flights and trains only (no hotels)
  const [flights, trains] = await Promise.all([
    searchFlights(params),
    searchTrains(params),
  ]);

  return {
    flights,
    trains,
    hotels: [], // Empty array - hotel search removed
    packages: [], // Will be generated from combinations
    searchId: generateSearchId(),
    searchParams: params,
    timestamp: new Date(),
  };
}

async function searchFlights(params: SearchParams): Promise<Flight[]> {
  try {
    console.log('Searching flights with real-time data...');
    
    // Always use the real-time flight service for current prices
    const flights = await RealtimeFlightService.searchFlights(params);
    
    if (flights.length > 0) {
      console.log(`Found ${flights.length} flights from real-time sources`);
      return flights;
    }
    
    console.log('Real-time search returned no results, trying RapidAPI fallback...');
    
    // Fallback to RapidAPI
    const flightRequest: FlightSearchRequest = {
      origin: params.origin.city,
      destination: params.destination.city,
      departureDate: RapidAPIService.formatDate(params.departureDate),
      returnDate: params.returnDate ? RapidAPIService.formatDate(params.returnDate) : undefined,
      adults: params.passengers.adults,
      currency: 'INR'
    };

    const rapidFlights = await RapidAPIService.searchFlights(flightRequest);
    
    // Transform RapidAPI results to our Flight format
    const transformedFlights: Flight[] = rapidFlights.map(flight => ({
      id: flight.id,
      bookingClass: params.travelClass,
      outbound: [
        {
          id: `${flight.id}-outbound`,
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(`${flight.departure.date}T${flight.departure.time}`),
          arrivalTime: new Date(`${flight.arrival.date}T${flight.arrival.time}`),
          duration: parseInt(flight.duration.replace(/[^\d]/g, '')) || 180, // extract minutes
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          aircraft: 'Modern Aircraft',
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
              duration: parseInt(flight.duration.replace(/[^\d]/g, '')) || 180,
              airline: flight.airline,
              flightNumber: flight.flightNumber.replace(/\d+$/, (match) => (parseInt(match) + 1).toString()),
              aircraft: 'Modern Aircraft',
              stops: flight.stops,
            },
          ]
        : undefined,
      price: {
        total: flight.price.total,
        currency: 'INR',
        breakdown: {
          base: flight.price.base || flight.price.total * 0.8,
          taxes: flight.price.taxes || flight.price.total * 0.15,
          fees: flight.price.total * 0.05,
        },
      },
      airline: flight.airline,
      stops: flight.stops,
      baggage: {
        checkedBags: 1,
        carryOnBags: 1,
        personalItem: true,
      },
      amenities: ['meals', 'wifi', 'entertainment'],
      refundable: true,
      changeable: true,
      source: 'rapidapi'
    }));

    if (transformedFlights.length > 0) {
      return transformedFlights.slice(0, 10);
    }
    
  } catch (error) {
    console.error('Flight search failed, using mock data:', error);
  }

  // Final fallback to mock data with INR pricing
  const mockFlights: Flight[] = [
    {
      id: 'flight-1',
      bookingClass: params.travelClass,
      outbound: [
        {
          id: 'outbound-1',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours from departure date
          arrivalTime: new Date(params.departureDate.getTime() + 5 * 60 * 60 * 1000), // 5 hours from departure date
          duration: 180, // 3 hours
          airline: 'IndiGo',
          flightNumber: '6E 123',
          aircraft: 'Airbus A320',
          stops: 0,
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'inbound-1',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 14 * 60 * 60 * 1000),
              arrivalTime: new Date(params.returnDate.getTime() + 17 * 60 * 60 * 1000),
              duration: 180,
              airline: 'IndiGo',
              flightNumber: '6E 124',
              aircraft: 'Airbus A320',
              stops: 0,
            },
          ]
        : undefined,
      price: {
        total: 4500,
        currency: 'INR',
        breakdown: { base: 3800, taxes: 500, fees: 200 },
      },
      airline: 'IndiGo',
      stops: 0,
      baggage: {
        checkedBags: 1,
        carryOnBags: 1,
        personalItem: true,
      },
      amenities: ['meals', 'wifi'],
      refundable: true,
      changeable: true,
      source: 'mock',
      mlPrediction: {
        predictedPrice: 4200,
        confidence: 0.85,
        recommendation: 'Good price - consider booking',
        priceRange: { min: 4000, max: 5000 },
        savingsPercent: 7
      }
    },
    {
      id: 'flight-2',
      bookingClass: params.travelClass,
      outbound: [
        {
          id: 'outbound-2',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 6 * 60 * 60 * 1000),
          arrivalTime: new Date(params.departureDate.getTime() + 9 * 60 * 60 * 1000),
          duration: 180,
          airline: 'SpiceJet',
          flightNumber: 'SG 456',
          aircraft: 'Boeing 737',
          stops: 0,
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'inbound-2',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 18 * 60 * 60 * 1000),
              arrivalTime: new Date(params.returnDate.getTime() + 21 * 60 * 60 * 1000),
              duration: 180,
              airline: 'SpiceJet',
              flightNumber: 'SG 457',
              aircraft: 'Boeing 737',
              stops: 0,
            },
          ]
        : undefined,
      price: {
        total: 4200,
        currency: 'INR',
        breakdown: { base: 3600, taxes: 450, fees: 150 },
      },
      airline: 'SpiceJet',
      stops: 0,
      baggage: {
        checkedBags: 1,
        carryOnBags: 1,
        personalItem: true,
      },
      amenities: ['meals'],
      refundable: false,
      changeable: true,
      source: 'mock',
      mlPrediction: {
        predictedPrice: 4000,
        confidence: 0.78,
        recommendation: 'Price slightly above prediction',
        priceRange: { min: 3800, max: 4500 },
        savingsPercent: 5
      }
    },
  ];

  return mockFlights;
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
          id: 'train-outbound-1',
          trainName: 'Rajdhani Express',
          trainNumber: '12001',
          operator: 'Indian Railways',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 8 * 60 * 60 * 1000),
          arrivalTime: new Date(params.departureDate.getTime() + 20 * 60 * 60 * 1000),
          duration: 720, // 12 hours
          class: 'AC First Class',
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'train-inbound-1',
              trainName: 'Rajdhani Express',
              trainNumber: '12002',
              operator: 'Indian Railways',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 19 * 60 * 60 * 1000),
              arrivalTime: new Date(params.returnDate.getTime() + 31 * 60 * 60 * 1000),
              duration: 720,
              class: 'AC First Class',
            },
          ]
        : undefined,
      price: {
        total: 2800,
        currency: 'INR',
        breakdown: { base: 2500, taxes: 200, fees: 100 },
      },
      amenities: ['meals', 'ac'],
      refundable: true,
      changeable: true,
    },
  ];

  return mockTrains;
}

function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
