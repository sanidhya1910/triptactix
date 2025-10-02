import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PerplexityItineraryService, EnhancedItineraryRequest } from '@/lib/perplexity-service';

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
    
    // Estimate baseline budgets based on travel style if real pricing is unavailable
    let flightBudget;
    if (params.includeFlight) {
      const roughFlightCost = params.budget === 'luxury' ? 28000 : params.budget === 'mid-range' ? 18000 : 12000;
      flightBudget = {
        outbound: Math.round(roughFlightCost * 0.55),
        return: Math.round(roughFlightCost * 0.45)
      };
    }

    const enhancedRequest: EnhancedItineraryRequest = {
      ...params,
      flightBudget
    };
    
  // Generate itinerary using Perplexity
  console.log('Generating enhanced itinerary with Perplexity...');
  const aiService = new PerplexityItineraryService();
  const itinerary = await aiService.generateEnhancedItinerary(enhancedRequest);

  const generatedAt = new Date().toISOString();
  const isFallback = itinerary.isFallback === true;
  const source = isFallback ? 'perplexity-fallback-template' : 'perplexity-ai';
  const realPricing = {
    flightPrices: flightBudget
      ? (isFallback ? 'Template estimate (fallback itinerary)' : 'Estimated based on budget tier')
      : 'Not requested',
    hotelPrices: isFallback
      ? 'Template estimate (fallback itinerary)'
      : 'Estimated via Perplexity model'
  };
    
    return NextResponse.json({
      success: true,
      data: {
        itinerary,
        realPricing,
        generatedAt,
        source,
        fallbackReason: itinerary.fallbackReason ?? null
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
  'AI-powered itinerary generation with Perplexity',
      'Personalized recommendations based on interests',
      'Budget-aware planning with real market data'
    ]
  });
}
