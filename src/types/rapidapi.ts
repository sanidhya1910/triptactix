// RapidAPI Hotel and Flight Types

export interface HotelSearchRequest {
  destination: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms?: number;
  locale?: string;
  currency?: string;
}

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  currency?: string;
}

export interface HotelProperty {
  id: string;
  name: string;
  rating?: number;
  reviewScore?: number;
  reviewCount?: number;
  priceBreakdown: {
    grossPrice: {
      value: number;
      currency: string;
    };
    netPrice: {
      value: number;
      currency: string;
    };
  };
  photoUrls?: string[];
  description?: string;
  location: {
    address: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  amenities?: string[];
  roomType?: string;
  cancellationPolicy?: string;
}

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
  duration: string;
  price: {
    total: number;
    currency: string;
    base?: number;
    taxes?: number;
  };
  stops: number;
  class: string;
  baggage?: {
    cabin?: string;
    checked?: string;
  };
}

export interface HotelSearchResponse {
  status: string;
  data: {
    hotels: HotelProperty[];
    totalCount: number;
    searchId?: string;
  };
}

export interface FlightSearchResponse {
  status: string;
  data: {
    flights: FlightOffer[];
    totalCount: number;
    searchId?: string;
  };
}

export interface RapidAPIError {
  message: string;
  code?: string;
  status?: number;
}
