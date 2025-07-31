import { z } from 'zod';

export const ItineraryRequestSchema = z.object({
  destination: z.string().min(2, 'Destination must be at least 2 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.enum(['budget', 'mid-range', 'luxury']),
  travelers: z.number().min(1).max(20),
  interests: z.array(z.string()).optional(),
  accommodationType: z.enum(['hotel', 'hostel', 'apartment', 'resort']).optional(),
  travelStyle: z.enum(['relaxed', 'adventure', 'cultural', 'family', 'business']).optional(),
});

export type ItineraryRequest = z.infer<typeof ItineraryRequestSchema>;

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
  meals: Meal[];
  accommodation: Accommodation;
  transportation: Transportation[];
  estimatedCost: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  location: string;
  duration: string;
  cost: number;
  category: 'sightseeing' | 'adventure' | 'cultural' | 'relaxation' | 'shopping' | 'entertainment';
  timeSlot: 'morning' | 'afternoon' | 'evening';
  coordinates?: {
    lat: number;
    lng: number;
  };
  images?: string[];
  tips?: string[];
}

export interface Meal {
  id: string;
  name: string;
  restaurant: string;
  cuisine: string;
  location: string;
  cost: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  rating?: number;
  specialDietary?: string[];
}

export interface Accommodation {
  id: string;
  name: string;
  type: string;
  location: string;
  checkIn: string;
  checkOut: string;
  cost: number;
  rating?: number;
  amenities?: string[];
  images?: string[];
}

export interface Transportation {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'taxi' | 'rental-car' | 'walking';
  from: string;
  to: string;
  departure: string;
  arrival: string;
  cost: number;
  duration: string;
  provider?: string;
}

export interface Itinerary {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalCost: number;
  days: ItineraryDay[];
  summary: {
    highlights: string[];
    totalActivities: number;
    totalMeals: number;
    avgDailyCost: number;
    weatherInfo?: {
      temperature: string;
      conditions: string;
      recommendation: string;
    };
  };
  tips: string[];
  emergencyInfo: {
    embassy?: string;
    hospitals: string[];
    emergencyNumbers: string[];
  };
}

export interface AIItineraryResponse {
  success: boolean;
  itinerary?: Itinerary;
  error?: string;
  suggestions?: string[];
}
