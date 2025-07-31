import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchParams, SearchResults, Flight, Train, Hotel } from '@/types/travel';
import RapidAPIService from '@/lib/rapidapi';
import { HotelSearchRequest, FlightSearchRequest } from '@/types/rapidapi';

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
  // Simulate API calls to external providers
  const [flights, trains, hotels] = await Promise.all([
    searchFlights(params),
    searchTrains(params),
    searchHotels(params),
  ]);

  return {
    flights,
    trains,
    hotels,
    packages: [], // Will be generated from combinations
    searchId: generateSearchId(),
    searchParams: params,
    timestamp: new Date(),
  };
}

async function searchFlights(params: SearchParams): Promise<Flight[]> {
  try {
    // Try RapidAPI first
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
      bookingClass: params.travelClass,
      amenities: ['wifi', 'entertainment', 'meals'],
      refundable: true,
      changeable: true,
    }));

    if (transformedFlights.length > 0) {
      return transformedFlights.slice(0, 5);
    }
    
  } catch (error) {
    console.error('RapidAPI flight search failed, using mock data:', error);
  }

  // Fallback to mock flights with INR pricing
  const mockFlights: Flight[] = [
    {
      id: 'flight-1',
      outbound: [
        {
          id: 'segment-1',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 8 * 60 * 60 * 1000), // 8 AM
          arrivalTime: new Date(params.departureDate.getTime() + 11 * 60 * 60 * 1000), // 11 AM
          duration: 180, // 3 hours
          airline: 'IndiGo',
          flightNumber: '6E-2341',
          aircraft: 'Airbus A320',
          stops: 0,
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'segment-2',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 14 * 60 * 60 * 1000), // 2 PM
              arrivalTime: new Date(params.returnDate.getTime() + 17 * 60 * 60 * 1000), // 5 PM
              duration: 180,
              airline: 'IndiGo',
              flightNumber: '6E-2342',
              aircraft: 'Airbus A320',
              stops: 0,
            },
          ]
        : undefined,
      price: {
        total: 8500 + Math.random() * 3000,
        currency: 'INR',
        breakdown: {
          base: 7200,
          taxes: 1000,
          fees: 300,
        },
      },
      airline: 'IndiGo',
      bookingClass: params.travelClass,
      amenities: ['wifi', 'entertainment', 'meals'],
      refundable: true,
      changeable: true,
    },
    {
      id: 'flight-2',
      outbound: [
        {
          id: 'segment-3',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 15 * 60 * 60 * 1000), // 3 PM
          arrivalTime: new Date(params.departureDate.getTime() + 18 * 60 * 60 * 1000), // 6 PM
          duration: 180,
          airline: 'Air India',
          flightNumber: 'AI-1205',
          aircraft: 'Boeing 737',
          stops: 0,
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'segment-4',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 10 * 60 * 60 * 1000), // 10 AM
              arrivalTime: new Date(params.returnDate.getTime() + 13 * 60 * 60 * 1000), // 1 PM
              duration: 180,
              airline: 'Air India',
              flightNumber: 'AI-1206',
              aircraft: 'Boeing 737',
              stops: 0,
            },
          ]
        : undefined,
      price: {
        total: 6500 + Math.random() * 2000,
        currency: 'INR',
        breakdown: {
          base: 5500,
          taxes: 800,
          fees: 200,
        },
      },
      airline: 'Air India',
      bookingClass: params.travelClass,
      amenities: ['wifi', 'entertainment'],
      refundable: false,
      changeable: true,
    },
  ];

  // Sort by price
  return mockFlights.sort((a, b) => a.price.total - b.price.total);
}

async function searchTrains(params: SearchParams): Promise<Train[]> {
  // Mock train search with INR pricing - integrate with IRCTC API in future
  const mockTrains: Train[] = [
    {
      id: 'train-1',
      outbound: [
        {
          id: 'train-segment-1',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 6 * 60 * 60 * 1000), // 6 AM
          arrivalTime: new Date(params.departureDate.getTime() + 12 * 60 * 60 * 1000), // 12 PM
          duration: 360, // 6 hours
          trainNumber: '12345',
          trainName: 'Rajdhani Express',
          operator: 'Indian Railways',
          class: params.travelClass === 'economy' ? '3AC' : '1AC',
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'train-segment-2',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 18 * 60 * 60 * 1000), // 6 PM
              arrivalTime: new Date(params.returnDate.getTime() + 24 * 60 * 60 * 1000), // 12 AM next day
              duration: 360,
              trainNumber: '12346',
              trainName: 'Rajdhani Express',
              operator: 'Indian Railways',
              class: params.travelClass === 'economy' ? '3AC' : '1AC',
            },
          ]
        : undefined,
      price: {
        total: params.travelClass === 'economy' ? 2800 + Math.random() * 500 : 5500 + Math.random() * 1000,
        currency: 'INR',
        breakdown: {
          base: params.travelClass === 'economy' ? 2400 : 4800,
          taxes: params.travelClass === 'economy' ? 300 : 500,
          fees: params.travelClass === 'economy' ? 100 : 200,
        },
      },
      operator: 'Indian Railways',
      class: params.travelClass === 'economy' ? '3AC' : '1AC',
      amenities: ['wifi', 'meals', 'ac', 'bedding'],
      refundable: true,
      changeable: true,
    },
    {
      id: 'train-2',
      outbound: [
        {
          id: 'train-segment-3',
          origin: params.origin,
          destination: params.destination,
          departureTime: new Date(params.departureDate.getTime() + 14 * 60 * 60 * 1000), // 2 PM
          arrivalTime: new Date(params.departureDate.getTime() + 22 * 60 * 60 * 1000), // 10 PM
          duration: 480, // 8 hours
          trainNumber: '12567',
          trainName: 'Shatabdi Express',
          operator: 'Indian Railways',
          class: params.travelClass === 'economy' ? 'SL' : '2AC',
        },
      ],
      inbound: params.returnDate
        ? [
            {
              id: 'train-segment-4',
              origin: params.destination,
              destination: params.origin,
              departureTime: new Date(params.returnDate.getTime() + 8 * 60 * 60 * 1000), // 8 AM
              arrivalTime: new Date(params.returnDate.getTime() + 16 * 60 * 60 * 1000), // 4 PM
              duration: 480,
              trainNumber: '12568',
              trainName: 'Shatabdi Express',
              operator: 'Indian Railways',
              class: params.travelClass === 'economy' ? 'SL' : '2AC',
            },
          ]
        : undefined,
      price: {
        total: params.travelClass === 'economy' ? 1800 + Math.random() * 300 : 3500 + Math.random() * 500,
        currency: 'INR',
        breakdown: {
          base: params.travelClass === 'economy' ? 1500 : 3000,
          taxes: params.travelClass === 'economy' ? 250 : 400,
          fees: params.travelClass === 'economy' ? 50 : 100,
        },
      },
      operator: 'Indian Railways',
      class: params.travelClass === 'economy' ? 'SL' : '2AC',
      amenities: ['meals', 'ac'],
      refundable: true,
      changeable: true,
    },
  ];

  return mockTrains;
}

async function searchHotels(params: SearchParams): Promise<Hotel[]> {
  try {
    // Try RapidAPI first
    const checkOut = params.returnDate || new Date(params.departureDate.getTime() + 24 * 60 * 60 * 1000);
    
    const hotelRequest: HotelSearchRequest = {
      destination: params.destination.city,
      checkin: RapidAPIService.formatDate(params.departureDate),
      checkout: RapidAPIService.formatDate(checkOut),
      adults: params.passengers.adults,
      rooms: 1,
      currency: 'INR'
    };

    const rapidHotels = await RapidAPIService.searchHotels(hotelRequest);
    
    // Transform RapidAPI results to our Hotel format
    const transformedHotels: Hotel[] = rapidHotels.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      location: {
        address: hotel.location.address,
        city: hotel.location.city,
        country: hotel.location.country,
        coordinates: { 
          lat: hotel.location.latitude || 0, 
          lng: hotel.location.longitude || 0 
        },
      },
      rating: hotel.reviewScore || 8.0,
      starRating: hotel.rating || 4,
      images: hotel.photoUrls || ['/api/placeholder/400/300'],
      amenities: hotel.amenities || ['wifi', 'ac', 'restaurant'],
      rooms: [
        {
          id: `${hotel.id}-room-1`,
          type: 'standard',
          name: hotel.roomType || 'Standard Room',
          description: hotel.description || 'Comfortable accommodation',
          capacity: { adults: params.passengers.adults, children: params.passengers.children },
          price: {
            total: hotel.priceBreakdown.grossPrice.value,
            currency: 'INR',
            perNight: hotel.priceBreakdown.grossPrice.value,
            breakdown: { 
              base: hotel.priceBreakdown.netPrice.value, 
              taxes: hotel.priceBreakdown.grossPrice.value - hotel.priceBreakdown.netPrice.value, 
              fees: 0 
            },
          },
          amenities: hotel.amenities || ['wifi', 'tv', 'ac'],
          images: hotel.photoUrls || ['/api/placeholder/300/200'],
          availability: true,
          refundable: hotel.cancellationPolicy?.includes('Free') || false,
          changeable: true,
        },
      ],
    }));

    if (transformedHotels.length > 0) {
      return transformedHotels.slice(0, 5);
    }
    
  } catch (error) {
    console.error('RapidAPI hotel search failed, using mock data:', error);
  }

  // Fallback to mock data with INR pricing
  const checkOut = params.returnDate || new Date(params.departureDate.getTime() + 24 * 60 * 60 * 1000);
  
  const mockHotels: Hotel[] = [
    {
      id: 'hotel-1',
      name: 'Grand Plaza Hotel',
      location: {
        address: '123 Main Street',
        city: params.destination.city,
        country: params.destination.country,
        coordinates: { lat: 40.7128, lng: -74.0060 },
      },
      rating: 8.5,
      starRating: 4,
      images: ['/api/placeholder/400/300'],
      amenities: ['wifi', 'parking', 'restaurant', 'gym', 'spa'],
      rooms: [
        {
          id: 'room-1',
          type: 'standard',
          name: 'Standard Room',
          description: 'Comfortable room with city view',
          capacity: { adults: 2, children: 1 },
          price: {
            total: 8500 + Math.random() * 2000,
            currency: 'INR',
            perNight: 8500,
            breakdown: { base: 7200, taxes: 1100, fees: 200 },
          },
          amenities: ['wifi', 'tv', 'ac'],
          images: ['/api/placeholder/300/200'],
          availability: true,
          refundable: true,
          changeable: true,
        },
        {
          id: 'room-2',
          type: 'deluxe',
          name: 'Deluxe Suite',
          description: 'Spacious suite with premium amenities',
          capacity: { adults: 4, children: 2 },
          price: {
            total: 15000 + Math.random() * 3000,
            currency: 'INR',
            perNight: 15000,
            breakdown: { base: 12800, taxes: 1900, fees: 300 },
          },
          amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony'],
          images: ['/api/placeholder/300/200'],
          availability: true,
          refundable: true,
          changeable: true,
        },
      ],
    },
    {
      id: 'hotel-2',
      name: 'Budget Inn',
      location: {
        address: '456 Budget Street',
        city: params.destination.city,
        country: params.destination.country,
        coordinates: { lat: 40.7100, lng: -74.0020 },
      },
      rating: 7.2,
      starRating: 3,
      images: ['/api/placeholder/400/300'],
      amenities: ['wifi', 'parking'],
      rooms: [
        {
          id: 'room-3',
          type: 'economy',
          name: 'Economy Room',
          description: 'Basic room with essential amenities',
          capacity: { adults: 2, children: 0 },
          price: {
            total: 4500 + Math.random() * 1500,
            currency: 'INR',
            perNight: 4500,
            breakdown: { base: 3800, taxes: 600, fees: 100 },
          },
          amenities: ['wifi', 'tv'],
          images: ['/api/placeholder/300/200'],
          availability: true,
          refundable: false,
          changeable: false,
        },
      ],
    },
  ];

  return mockHotels;
}

function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
