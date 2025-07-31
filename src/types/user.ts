import { DefaultSession } from 'next-auth';
import { SearchParams } from './travel';

// User and authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  currency: string;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    browser: boolean;
    priceAlerts: boolean;
    bookingUpdates: boolean;
    marketing: boolean;
  };
  defaultSearch: {
    travelClass: 'economy' | 'premium' | 'business' | 'first';
    passengers: {
      adults: number;
      children: number;
      infants: number;
    };
  };
}

// Booking types
export interface Booking {
  id: string;
  userId: string;
  type: 'flight' | 'train' | 'hotel' | 'package';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'failed';
  reference: string;
  bookingDate: Date;
  travelDate: Date;
  returnDate?: Date;
  details: BookingDetails;
  payment: PaymentInfo;
  cancellation?: CancellationInfo;
  modifications: BookingModification[];
}

export type BookingDetails = FlightBooking | TrainBooking | HotelBooking | PackageBooking;

export interface FlightBooking {
  type: 'flight';
  flightId: string;
  passengers: Passenger[];
  seats: SeatAssignment[];
  baggage: BaggageInfo[];
}

export interface TrainBooking {
  type: 'train';
  trainId: string;
  passengers: Passenger[];
  seats: SeatAssignment[];
}

export interface HotelBooking {
  type: 'hotel';
  hotelId: string;
  roomId: string;
  guests: Guest[];
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

export interface PackageBooking {
  type: 'package';
  packageId: string;
  travel: FlightBooking | TrainBooking;
  hotel?: HotelBooking;
}

export interface Passenger {
  id: string;
  title: 'mr' | 'mrs' | 'ms' | 'dr';
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality: string;
  passport?: {
    number: string;
    expiryDate: Date;
    issuingCountry: string;
  };
  type: 'adult' | 'child' | 'infant';
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  type: 'adult' | 'child';
}

export interface SeatAssignment {
  passengerId: string;
  seatNumber: string;
  seatClass: string;
}

export interface BaggageInfo {
  passengerId: string;
  type: 'carry_on' | 'checked' | 'personal';
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface PaymentInfo {
  id: string;
  method: 'card' | 'bank_transfer' | 'digital_wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: {
    total: number;
    currency: string;
  };
  transactionId: string;
  processedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

export interface CancellationInfo {
  reason: string;
  cancelledAt: Date;
  refundEligible: boolean;
  refundAmount: number;
  cancellationFee: number;
}

export interface BookingModification {
  id: string;
  type: 'date_change' | 'passenger_change' | 'seat_change' | 'upgrade';
  requestedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
  cost: number;
  details: Record<string, any>;
}

// Alert and notification types
export interface PriceAlert {
  id: string;
  userId: string;
  searchParams: SearchParams;
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'price_drop' | 'booking_update' | 'payment_reminder' | 'travel_reminder' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Extend next-auth session type
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      avatar?: string;
    } & DefaultSession['user'];
  }
}
