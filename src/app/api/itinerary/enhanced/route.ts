import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PerplexityItineraryService, EnhancedItineraryRequest } from '@/lib/perplexity-service';
import { callMLAPI } from '@/lib/resilient-fetch';
import { canonicalCity } from '@/lib/cities';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cities the flight-price model is trained on.
const ML_SUPPORTED = new Set(['New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad']);

/**
 * Predict a one-way fare with the real ML model for a supported metro route.
 * Returns null when the route/date isn't usable so callers fall back to estimates.
 */
async function predictFare(
  from: string, to: string, date: string, travelClass: string
): Promise<{ price: number; confidence: number } | null> {
  if (!ML_SUPPORTED.has(canonicalCity(from)) || !ML_SUPPORTED.has(canonicalCity(to))) return null;
  const res = await callMLAPI<any>('/predict', {
    airline: 'IndiGo', source_city: canonicalCity(from), destination_city: canonicalCity(to),
    departure_date: date, departure_time: '10:00', total_stops: 0, travel_class: travelClass,
  }, { maxRetries: 1, timeout: 3500 });
  if (!res?.success || typeof res.predicted_price !== 'number') return null;
  return { price: res.predicted_price, confidence: res.confidence ?? 0.7 };
}

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
    
    // Flight budget: prefer the real ML price model for supported metro routes,
    // and fall back to budget-tier estimates otherwise.
    let flightBudget;
    let flightInsight: any = null;
    const flightClass = params.budget === 'luxury' ? 'business' : 'economy';

    if (params.includeFlight && params.flightSource) {
      const [outbound, inbound] = await Promise.all([
        predictFare(params.flightSource, params.destination, params.startDate, flightClass),
        predictFare(params.destination, params.flightSource, params.endDate, flightClass),
      ]);

      if (outbound && inbound) {
        flightBudget = { outbound: outbound.price, return: inbound.price };
        // When to book the outbound flight, from the model.
        const advice = await callMLAPI<any>('/analyze-price', {
          current_price: outbound.price,
          source_city: canonicalCity(params.flightSource),
          destination_city: canonicalCity(params.destination),
          departure_date: params.startDate,
        }, { maxRetries: 1, timeout: 3500 });
        flightInsight = {
          source: 'ml-model',
          travelClass: flightClass,
          outbound: outbound.price,
          return: inbound.price,
          confidence: Math.round(((outbound.confidence + inbound.confidence) / 2) * 100),
          bookingAdvice: advice?.success ? {
            action: advice.analysis?.action,
            recommendation: advice.analysis?.recommendation,
            bestDays: advice.analysis?.best_booking_days?.slice(0, 3) ?? [],
          } : null,
        };
      } else {
        const roughFlightCost = params.budget === 'luxury' ? 28000 : params.budget === 'mid-range' ? 18000 : 12000;
        flightBudget = { outbound: Math.round(roughFlightCost * 0.55), return: Math.round(roughFlightCost * 0.45) };
        flightInsight = { source: 'estimate', reason: 'Route outside the 6 supported metros' };
      }
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
    flightPrices: !flightBudget
      ? 'Not requested'
      : flightInsight?.source === 'ml-model'
        ? `Real ML model prediction (${flightInsight.confidence}% confidence)`
        : 'Budget-tier estimate (route outside supported metros)',
    hotelPrices: isFallback
      ? 'Template estimate (fallback itinerary)'
      : 'Estimated via Perplexity model'
  };
    
    return NextResponse.json({
      success: true,
      data: {
        itinerary,
        realPricing,
        flightInsight,
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
