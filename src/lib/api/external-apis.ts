/**
 * External API Integration Examples
 * 
 * This file demonstrates how to integrate with real travel APIs.
 * Replace the mock implementations in the search API route with these functions.
 */

import axios from 'axios';
import { Flight, Train, Hotel, SearchParams } from '@/types/travel';

// Amadeus API Integration (Flights)
export class AmadeusAPI {
  private static baseURL = process.env.AMADEUS_API_URL || 'https://test.api.amadeus.com';
  private static clientId = process.env.AMADEUS_CLIENT_ID;
  private static clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  private static accessToken: string | null = null;
  private static tokenExpiry: Date | null = null;

  static async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const response = await axios.post(`${this.baseURL}/v1/security/oauth2/token`, {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
    
    return this.accessToken!;
  }

  static async searchFlights(params: SearchParams): Promise<Flight[]> {
    const token = await this.getAccessToken();
    
    const searchData = {
      originLocationCode: params.origin.code,
      destinationLocationCode: params.destination.code,
      departureDate: params.departureDate.toISOString().split('T')[0],
      returnDate: params.returnDate?.toISOString().split('T')[0],
      adults: params.passengers.adults,
      children: params.passengers.children,
      infants: params.passengers.infants,
      travelClass: params.travelClass.toUpperCase(),
    };

    const response = await axios.get(`${this.baseURL}/v2/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: searchData,
    });

    return this.transformAmadeusFlights(response.data.data);
  }

  private static transformAmadeusFlights(amadeusFlights: any[]): Flight[] {
    return amadeusFlights.map((flight) => ({
      id: flight.id,
      outbound: flight.itineraries[0].segments.map((segment: any) => ({
        id: segment.id,
        origin: {
          id: segment.departure.iataCode,
          name: segment.departure.iataCode,
          code: segment.departure.iataCode,
          city: segment.departure.iataCode,
          country: 'Unknown',
          type: 'airport' as const,
        },
        destination: {
          id: segment.arrival.iataCode,
          name: segment.arrival.iataCode,
          code: segment.arrival.iataCode,
          city: segment.arrival.iataCode,
          country: 'Unknown',
          type: 'airport' as const,
        },
        departureTime: new Date(segment.departure.at),
        arrivalTime: new Date(segment.arrival.at),
        duration: this.parseDuration(segment.duration),
        airline: segment.carrierCode,
        flightNumber: `${segment.carrierCode}${segment.number}`,
        aircraft: segment.aircraft?.code || 'Unknown',
        stops: 0, // Calculate based on segments
      })),
      inbound: flight.itineraries[1]?.segments.map((segment: any) => ({
        // Similar transformation for return flight
      })),
      price: {
        total: parseFloat(flight.price.total),
        currency: flight.price.currency,
        breakdown: {
          base: parseFloat(flight.price.base),
          taxes: parseFloat(flight.price.total) - parseFloat(flight.price.base),
          fees: 0,
        },
      },
      airline: flight.itineraries[0].segments[0].carrierCode,
      bookingClass: flight.travelerPricings[0].fareDetailsBySegment[0].class,
      amenities: [], // Extract from amenities data
      refundable: flight.pricingOptions?.refundableFare || false,
      changeable: flight.pricingOptions?.changeableFare || false,
    }));
  }

  private static parseDuration(duration: string): number {
    // Parse ISO 8601 duration (PT3H30M) to minutes
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    const hours = parseInt(match?.[1] || '0');
    const minutes = parseInt(match?.[2] || '0');
    return hours * 60 + minutes;
  }
}

// Skyscanner API Integration (Alternative for Flights)
export class SkyscannerAPI {
  private static baseURL = process.env.SKYSCANNER_API_URL;
  private static apiKey = process.env.SKYSCANNER_API_KEY;

  static async searchFlights(params: SearchParams): Promise<Flight[]> {
    const response = await axios.get(`${this.baseURL}/v3/flights/live/search/create`, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      data: {
        query: {
          market: 'US',
          locale: 'en-US',
          currency: 'USD',
          queryLegs: [
            {
              originPlace: { queryPlace: params.origin.code },
              destinationPlace: { queryPlace: params.destination.code },
              date: { year: params.departureDate.getFullYear(), month: params.departureDate.getMonth() + 1, day: params.departureDate.getDate() },
            },
          ],
          adults: params.passengers.adults,
          children: params.passengers.children,
          infants: params.passengers.infants,
          cabinClass: params.travelClass.toUpperCase(),
        },
      },
    });

    return this.transformSkyscannerFlights(response.data);
  }

  private static transformSkyscannerFlights(data: any): Flight[] {
    // Transform Skyscanner response to Flight type
    return [];
  }
}

// Booking.com API Integration (Hotels)
export class BookingAPI {
  private static baseURL = process.env.BOOKING_COM_API_URL;
  private static apiKey = process.env.BOOKING_COM_API_KEY;

  static async searchHotels(params: SearchParams): Promise<Hotel[]> {
    const checkIn = params.departureDate.toISOString().split('T')[0];
    const checkOut = params.returnDate?.toISOString().split('T')[0] || 
                    new Date(params.departureDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await axios.get(`${this.baseURL}/v1/hotels/search`, {
      headers: { 'Authorization': `Basic ${this.apiKey}` },
      params: {
        dest_type: 'city',
        dest_id: params.destination.code,
        checkin_date: checkIn,
        checkout_date: checkOut,
        adults_number: params.passengers.adults,
        children_number: params.passengers.children,
        room_number: 1,
      },
    });

    return this.transformBookingHotels(response.data.result);
  }

  private static transformBookingHotels(hotels: any[]): Hotel[] {
    return hotels.map((hotel) => ({
      id: hotel.hotel_id.toString(),
      name: hotel.hotel_name,
      location: {
        address: hotel.address,
        city: hotel.city,
        country: hotel.country_trans,
        coordinates: {
          lat: parseFloat(hotel.latitude),
          lng: parseFloat(hotel.longitude),
        },
      },
      rating: parseFloat(hotel.review_score),
      starRating: hotel.class,
      images: hotel.photos?.map((photo: any) => photo.url_max) || [],
      amenities: hotel.facilities?.map((facility: any) => facility.name) || [],
      rooms: [{
        id: `${hotel.hotel_id}_room_1`,
        type: 'standard',
        name: 'Standard Room',
        description: hotel.hotel_name,
        capacity: {
          adults: 2,
          children: 1,
        },
        price: {
          total: parseFloat(hotel.min_total_price),
          currency: hotel.currency_code,
          perNight: parseFloat(hotel.min_total_price),
          breakdown: {
            base: parseFloat(hotel.min_total_price) * 0.85,
            taxes: parseFloat(hotel.min_total_price) * 0.15,
            fees: 0,
          },
        },
        amenities: [],
        images: hotel.photos?.slice(0, 3).map((photo: any) => photo.url_max) || [],
        availability: true,
        refundable: hotel.is_free_cancellable,
        changeable: true,
      }],
    }));
  }
}

// IRCTC API Integration (Indian Railways)
export class IRCTCApi {
  private static baseURL = process.env.IRCTC_API_URL;
  private static apiKey = process.env.IRCTC_API_KEY;

  static async searchTrains(params: SearchParams): Promise<Train[]> {
    const response = await axios.post(`${this.baseURL}/api/train-search`, {
      from: params.origin.code,
      to: params.destination.code,
      date: params.departureDate.toISOString().split('T')[0],
      class: this.mapTravelClassToIRCTC(params.travelClass),
    }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    return this.transformIRCTCTrains(response.data.trains);
  }

  private static mapTravelClassToIRCTC(travelClass: string): string {
    const mapping = {
      economy: '3A',
      premium: '2A',
      business: '1A',
      first: '1A',
    };
    return mapping[travelClass as keyof typeof mapping] || '3A';
  }

  private static transformIRCTCTrains(trains: any[]): Train[] {
    return trains.map((train) => ({
      id: train.train_number,
      outbound: [{
        id: `${train.train_number}_outbound`,
        origin: {
          id: train.from_station_code,
          name: train.from_station_name,
          code: train.from_station_code,
          city: train.from_station_name,
          country: 'India',
          type: 'station' as const,
        },
        destination: {
          id: train.to_station_code,
          name: train.to_station_name,
          code: train.to_station_code,
          city: train.to_station_name,
          country: 'India',
          type: 'station' as const,
        },
        departureTime: new Date(`${train.departure_date}T${train.departure_time}`),
        arrivalTime: new Date(`${train.arrival_date}T${train.arrival_time}`),
        duration: this.calculateDuration(train.departure_time, train.arrival_time),
        trainNumber: train.train_number,
        trainName: train.train_name,
        operator: 'Indian Railways',
        class: train.class,
      }],
      price: {
        total: parseFloat(train.fare),
        currency: 'INR',
        breakdown: {
          base: parseFloat(train.fare) * 0.9,
          taxes: parseFloat(train.fare) * 0.1,
          fees: 0,
        },
      },
      operator: 'Indian Railways',
      class: train.class,
      amenities: train.amenities || [],
      refundable: train.refundable || false,
      changeable: train.changeable || false,
    }));
  }

  private static calculateDuration(departureTime: string, arrivalTime: string): number {
    // Calculate duration in minutes
    const dep = new Date(`1970-01-01T${departureTime}`);
    const arr = new Date(`1970-01-01T${arrivalTime}`);
    return Math.abs(arr.getTime() - dep.getTime()) / (1000 * 60);
  }
}

// Price Prediction ML Service Integration
export class PricePredictionAPI {
  private static baseURL = process.env.PRICE_PREDICTION_API_URL;
  private static apiKey = process.env.PRICE_PREDICTION_API_KEY;

  static async getPricePrediction(searchParams: any): Promise<any> {
    const response = await axios.post(`${this.baseURL}/predict`, {
      origin: searchParams.origin,
      destination: searchParams.destination,
      departure_date: searchParams.departureDate,
      return_date: searchParams.returnDate,
      travel_type: searchParams.travelType,
      current_price: searchParams.currentPrice,
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  static async getHistoricalPrices(route: string, period: number = 30): Promise<any[]> {
    const response = await axios.get(`${this.baseURL}/history/${route}`, {
      params: { days: period },
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    return response.data;
  }
}

// Error handling utility
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public provider: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Rate limiting utility
export class RateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();

  static async checkLimit(provider: string, limit: number = 100, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now();
    const current = this.limits.get(provider);

    if (!current || now > current.resetTime) {
      this.limits.set(provider, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count++;
    return true;
  }
}

// Usage example in API route:
/*
export async function searchWithMultipleProviders(params: SearchParams) {
  const results = await Promise.allSettled([
    AmadeusAPI.searchFlights(params),
    SkyscannerAPI.searchFlights(params),
  ]);

  const flights = results
    .filter((result): result is PromiseFulfilledResult<Flight[]> => 
      result.status === 'fulfilled'
    )
    .flatMap(result => result.value);

  return flights;
}
*/
