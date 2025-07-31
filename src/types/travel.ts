// Core travel-related types
export interface Location {
  id: string;
  name: string;
  code: string; // Airport/station code
  city: string;
  country: string;
  type: 'airport' | 'station' | 'city';
}

export interface DateRange {
  from: Date;
  to?: Date;
}

export interface SearchParams {
  origin: Location;
  destination: Location;
  departureDate: Date;
  returnDate?: Date;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  travelClass: 'economy' | 'premium' | 'business' | 'first';
}

// Flight types
export interface FlightSegment {
  id: string;
  origin: Location;
  destination: Location;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // in minutes
  airline: string;
  flightNumber: string;
  aircraft: string;
  stops: number;
}

export interface Flight {
  id: string;
  outbound: FlightSegment[];
  inbound?: FlightSegment[];
  price: {
    total: number;
    currency: string;
    breakdown: {
      base: number;
      taxes: number;
      fees: number;
    };
  };
  airline: string;
  bookingClass: string;
  amenities: string[];
  refundable: boolean;
  changeable: boolean;
}

// Train types
export interface TrainSegment {
  id: string;
  origin: Location;
  destination: Location;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  trainNumber: string;
  trainName: string;
  operator: string;
  class: string;
}

export interface Train {
  id: string;
  outbound: TrainSegment[];
  inbound?: TrainSegment[];
  price: {
    total: number;
    currency: string;
    breakdown: {
      base: number;
      taxes: number;
      fees: number;
    };
  };
  operator: string;
  class: string;
  amenities: string[];
  refundable: boolean;
  changeable: boolean;
}

// Hotel types
export interface Hotel {
  id: string;
  name: string;
  location: {
    address: string;
    city: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  rating: number;
  starRating: number;
  images: string[];
  amenities: string[];
  rooms: HotelRoom[];
}

export interface HotelRoom {
  id: string;
  type: string;
  name: string;
  description: string;
  capacity: {
    adults: number;
    children: number;
  };
  price: {
    total: number;
    currency: string;
    perNight: number;
    breakdown: {
      base: number;
      taxes: number;
      fees: number;
    };
  };
  amenities: string[];
  images: string[];
  availability: boolean;
  refundable: boolean;
  changeable: boolean;
}

// Price prediction types
export interface PricePrediction {
  id: string;
  searchId: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number; // 0-1
  trend: 'up' | 'down' | 'stable';
  recommendation: 'book_now' | 'wait' | 'monitor';
  validUntil: Date;
  factors: {
    seasonality: number;
    demand: number;
    historical: number;
    events: string[];
  };
}

export interface PriceHistory {
  date: Date;
  price: number;
  type: 'actual' | 'predicted';
}

// Package types
export interface TravelPackage {
  id: string;
  name: string;
  description: string;
  travel: Flight | Train;
  hotel?: Hotel;
  room?: HotelRoom;
  duration: number; // in days
  totalPrice: {
    amount: number;
    currency: string;
    breakdown: {
      travel: number;
      accommodation: number;
      taxes: number;
      fees: number;
    };
  };
  includes: string[];
  excludes: string[];
  terms: string[];
}

export type SearchResults = {
  flights: Flight[];
  trains: Train[];
  hotels: Hotel[];
  packages: TravelPackage[];
  searchId: string;
  searchParams: SearchParams;
  timestamp: Date;
};
