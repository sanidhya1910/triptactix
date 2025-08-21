import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SerpAPIService } from '@/lib/serpapi-service';
import { GroqItineraryService, EnhancedItineraryRequest } from '@/lib/groq-service';

export const dynamic = 'force-dynamic';

const enhancedItinerarySchema = z.object({
  destination: z.string().min(2, 'Destination must be at least 2 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budget: z.enum(['budget', 'mid-range', 'luxury']),
  travelers: z.number().min(1).max(20),
  interests: z.array(z.string()).optional(),
  accommodationType: z.enum(['hotel', 'hostel', 'apartment', 'resort']).optional(),
  travelStyle: z.enum(['relaxed', 'adventure', 'cultural', 'family', 'business']).optional(),
  
  // Enhanced fields
  includeFlight: z.boolean().default(false),
  flightSource: z.string().optional(),
  groupType: z.enum(['solo', 'couple', 'family', 'friends', 'business']).optional(),
  fitnessLevel: z.enum(['low', 'moderate', 'high']).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  specificInterests: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received enhanced itinerary request:', body);
    
    const params = enhancedItinerarySchema.parse(body);
    
    // Get real flight and hotel pricing if requested
    let flightBudget;
    let hotelBudget;
    
    if (params.includeFlight && params.flightSource) {
      console.log('Fetching real flight prices...');
      try {
        const flightPricing = await SerpAPIService.getCheapestFlightPrice(
          params.flightSource,
          params.destination,
          params.startDate,
          params.endDate,
          params.travelers
        );
        
        if (flightPricing) {
          flightBudget = {
            outbound: Math.round(flightPricing.price * 0.6), // Assume outbound is 60% of total
            return: Math.round(flightPricing.price * 0.4)    // Return is 40% of total
          };
          console.log('Found flight pricing:', flightBudget);
        }
      } catch (error) {
        console.error('Error fetching flight prices:', error);
        // Continue with estimated prices
      }
    }
    
    // Get real hotel pricing
    console.log('Fetching real hotel prices...');
    try {
      const hotelPricing = await SerpAPIService.getHotelPriceRange(
        params.destination,
        params.startDate,
        params.endDate,
        params.travelers
      );
      
      if (hotelPricing) {
        hotelBudget = {
          budget: hotelPricing.budget,
          midRange: hotelPricing.midRange,
          luxury: hotelPricing.luxury
        };
        console.log('Found hotel pricing:', hotelBudget);
      }
    } catch (error) {
      console.error('Error fetching hotel prices:', error);
      // Continue with estimated prices
    }
    
    // Create enhanced request
    const enhancedRequest: EnhancedItineraryRequest = {
      ...params,
      flightBudget,
      hotelBudget
    };
    
    // Generate itinerary using Groq
    console.log('Generating enhanced itinerary with Groq...');
    const groqService = new GroqItineraryService();
    const itinerary = await groqService.generateEnhancedItinerary(enhancedRequest);
    
    return NextResponse.json({
      success: true,
      data: {
        itinerary,
        realPricing: {
          flightPrices: flightBudget ? 'Real prices fetched' : 'Estimated prices used',
          hotelPrices: hotelBudget ? 'Real prices fetched' : 'Estimated prices used'
        },
        generatedAt: new Date().toISOString(),
        source: 'groq-ai-with-real-pricing'
      }
    });
    
  } catch (error) {
    console.error('Enhanced itinerary generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid parameters', 
          details: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate itinerary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Enhanced Itinerary API is running',
    endpoints: {
      POST: '/api/itinerary/enhanced - Generate enhanced itinerary with real pricing'
    },
    features: [
      'Real flight pricing via SerpAPI',
      'Real hotel pricing via Google Hotels',
      'AI-powered itinerary generation with Groq',
      'Personalized recommendations based on interests',
      'Budget-aware planning with real market data'
    ]
  });
}
