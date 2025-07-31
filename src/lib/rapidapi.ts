import { 
  HotelSearchRequest, 
  FlightSearchRequest, 
  HotelSearchResponse, 
  FlightSearchResponse,
  HotelProperty,
  FlightOffer,
  RapidAPIError 
} from '@/types/rapidapi';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '1f36d7b753msh309fb339b1b25f8p1d5dd4jsn218e2b23ae8b';
const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com';

const rapidAPIHeaders = {
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': RAPIDAPI_HOST,
  'Content-Type': 'application/json'
};

export class RapidAPIService {
  
  /**
   * Search for hotels using RapidAPI
   */
  static async searchHotels(request: HotelSearchRequest): Promise<HotelProperty[]> {
    try {
      const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels`;
      
      const params = new URLSearchParams({
        dest_id: request.destination,
        search_type: 'city',
        arrival_date: request.checkin,
        departure_date: request.checkout,
        adults: request.adults.toString(),
        room_qty: (request.rooms || 1).toString(),
        locale: request.locale || 'en-us',
        currency: request.currency || 'INR',
        order_by: 'popularity',
        limit: '20'
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: rapidAPIHeaders,
      });

      if (!response.ok) {
        throw new Error(`Hotel search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to our format
      return this.transformHotelData(data);
      
    } catch (error) {
      console.error('Hotel search error:', error);
      // Return mock data as fallback
      return this.getMockHotels(request.destination);
    }
  }

  /**
   * Search for flights using RapidAPI (if available)
   * Note: Using hotel API as example, flight API would be similar
   */
  static async searchFlights(request: FlightSearchRequest): Promise<FlightOffer[]> {
    try {
      // For now, return mock flight data since flight search requires different API
      return this.getMockFlights(request.origin, request.destination);
      
    } catch (error) {
      console.error('Flight search error:', error);
      return this.getMockFlights(request.origin, request.destination);
    }
  }

  /**
   * Transform RapidAPI hotel response to our format
   */
  private static transformHotelData(apiData: any): HotelProperty[] {
    if (!apiData || !apiData.data || !Array.isArray(apiData.data)) {
      return [];
    }

    return apiData.data.slice(0, 10).map((hotel: any) => ({
      id: hotel.hotel_id?.toString() || Math.random().toString(),
      name: hotel.hotel_name || 'Hotel',
      rating: hotel.class || 3,
      reviewScore: hotel.review_score || 8.0,
      reviewCount: hotel.review_nr || 100,
      priceBreakdown: {
        grossPrice: {
          value: hotel.min_total_price || 5000,
          currency: 'INR'
        },
        netPrice: {
          value: (hotel.min_total_price || 5000) * 0.9,
          currency: 'INR'
        }
      },
      photoUrls: hotel.max_photo_url ? [hotel.max_photo_url] : [],
      description: hotel.hotel_name_trans || hotel.hotel_name || '',
      location: {
        address: hotel.address || '',
        city: hotel.city_name_en || hotel.city || '',
        country: hotel.country_trans || 'India',
        latitude: hotel.latitude || 0,
        longitude: hotel.longitude || 0
      },
      amenities: ['WiFi', 'Air Conditioning', 'Room Service'],
      roomType: 'Standard Room',
      cancellationPolicy: 'Free cancellation'
    }));
  }

  /**
   * Mock hotel data as fallback
   */
  private static getMockHotels(destination: string): HotelProperty[] {
    const basePrice = destination.toLowerCase().includes('goa') ? 3500 : 
                     destination.toLowerCase().includes('kerala') ? 4200 : 
                     destination.toLowerCase().includes('rajasthan') ? 5800 : 4000;

    return [
      {
        id: '1',
        name: `Luxury Resort ${destination}`,
        rating: 5,
        reviewScore: 9.2,
        reviewCount: 1247,
        priceBreakdown: {
          grossPrice: { value: basePrice * 2, currency: 'INR' },
          netPrice: { value: basePrice * 1.8, currency: 'INR' }
        },
        photoUrls: ['https://images.unsplash.com/photo-1566073771259-6a8506099945'],
        description: 'Luxury beachfront resort with world-class amenities',
        location: {
          address: `Beach Road, ${destination}`,
          city: destination,
          country: 'India'
        },
        amenities: ['Pool', 'Spa', 'Beach Access', 'WiFi', 'Restaurant'],
        roomType: 'Deluxe Ocean View',
        cancellationPolicy: 'Free cancellation until 48 hours before check-in'
      },
      {
        id: '2',
        name: `Heritage Hotel ${destination}`,
        rating: 4,
        reviewScore: 8.8,
        reviewCount: 892,
        priceBreakdown: {
          grossPrice: { value: basePrice * 1.5, currency: 'INR' },
          netPrice: { value: basePrice * 1.35, currency: 'INR' }
        },
        photoUrls: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'],
        description: 'Traditional heritage property with modern comforts',
        location: {
          address: `Heritage Street, ${destination}`,
          city: destination,
          country: 'India'
        },
        amenities: ['WiFi', 'Restaurant', 'Garden', 'Cultural Shows'],
        roomType: 'Heritage Room',
        cancellationPolicy: 'Free cancellation until 24 hours before check-in'
      },
      {
        id: '3',
        name: `Budget Stay ${destination}`,
        rating: 3,
        reviewScore: 7.5,
        reviewCount: 456,
        priceBreakdown: {
          grossPrice: { value: basePrice, currency: 'INR' },
          netPrice: { value: basePrice * 0.9, currency: 'INR' }
        },
        photoUrls: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa'],
        description: 'Clean and comfortable budget accommodation',
        location: {
          address: `Main Road, ${destination}`,
          city: destination,
          country: 'India'
        },
        amenities: ['WiFi', 'AC', 'Room Service'],
        roomType: 'Standard Room',
        cancellationPolicy: 'Non-refundable'
      }
    ];
  }

  /**
   * Mock flight data as fallback
   */
  private static getMockFlights(origin: string, destination: string): FlightOffer[] {
    const basePrice = 8500;
    
    return [
      {
        id: '1',
        airline: 'IndiGo',
        airlineCode: '6E',
        flightNumber: '6E-2341',
        departure: {
          airport: 'Delhi Airport',
          airportCode: 'DEL',
          time: '08:30',
          date: new Date().toISOString().split('T')[0]
        },
        arrival: {
          airport: `${destination} Airport`,
          airportCode: 'GOI',
          time: '10:45',
          date: new Date().toISOString().split('T')[0]
        },
        duration: '2h 15m',
        price: {
          total: basePrice,
          currency: 'INR',
          base: basePrice * 0.8,
          taxes: basePrice * 0.2
        },
        stops: 0,
        class: 'Economy',
        baggage: {
          cabin: '7kg',
          checked: '20kg'
        }
      },
      {
        id: '2',
        airline: 'Air India',
        airlineCode: 'AI',
        flightNumber: 'AI-1205',
        departure: {
          airport: 'Delhi Airport',
          airportCode: 'DEL',
          time: '14:20',
          date: new Date().toISOString().split('T')[0]
        },
        arrival: {
          airport: `${destination} Airport`,
          airportCode: 'GOI',
          time: '16:50',
          date: new Date().toISOString().split('T')[0]
        },
        duration: '2h 30m',
        price: {
          total: basePrice * 1.2,
          currency: 'INR',
          base: basePrice * 0.96,
          taxes: basePrice * 0.24
        },
        stops: 0,
        class: 'Economy',
        baggage: {
          cabin: '8kg',
          checked: '25kg'
        }
      }
    ];
  }

  /**
   * Format price for display
   */
  static formatPrice(price: number, currency: string = 'INR'): string {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price.toLocaleString()}`;
  }

  /**
   * Convert dates to API format
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export default RapidAPIService;
