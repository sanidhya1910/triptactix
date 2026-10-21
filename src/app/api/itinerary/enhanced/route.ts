import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EnhancedItineraryRequest, ItineraryError, PerplexityItineraryService, isAIConfigured } from '@/lib/perplexity-service';
import { callMLAPI, isModelConfigured } from '@/lib/resilient-fetch';
import { canonicalCity } from '@/lib/cities';
import { isISODate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// Cities the fare model is trained on.
const ML_SUPPORTED = new Set(['New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad']);

/** One traveller's one-way fare from the model, or null when it can't give one. */
async function predictFare(from: string, to: string, date: string, travelClass: string) {
  if (!ML_SUPPORTED.has(canonicalCity(from)) || !ML_SUPPORTED.has(canonicalCity(to))) return null;
  const res = await callMLAPI<{ success?: boolean; predicted_price?: number; confidence?: number }>(
    '/predict',
    { airline: 'IndiGo', source_city: canonicalCity(from), destination_city: canonicalCity(to), departure_date: date, travel_class: travelClass },
    { maxRetries: 1, timeout: 5000 },
  );
  if (!res?.success || typeof res.predicted_price !== 'number') return null;
  return { price: res.predicted_price, confidence: res.confidence ?? null };
}

const schema = z
  .object({
    destination: z.string().trim().min(2, 'Choose a destination'),
    startDate: z.string().refine(isISODate, 'Use a yyyy-mm-dd start date'),
    endDate: z.string().refine(isISODate, 'Use a yyyy-mm-dd end date'),
    budget: z.enum(['budget', 'mid-range', 'luxury']),
    travelers: z.number().int().min(1).max(20),
    interests: z.array(z.string()).optional(),
    accommodationType: z.enum(['hotel', 'hostel', 'apartment', 'resort']).optional(),
    travelStyle: z.enum(['relaxed', 'adventure', 'cultural', 'family', 'business']).optional(),
    includeFlight: z.boolean().default(false),
    flightSource: z.string().optional(),
    groupType: z.enum(['solo', 'couple', 'family', 'friends', 'business']).optional(),
    fitnessLevel: z.enum(['low', 'moderate', 'high']).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    specificInterests: z.array(z.string()).optional(),
  })
  // Same-day trips are fine; ending before starting is not.
  .refine((v) => v.endDate >= v.startDate, { message: 'The trip ends before it starts.', path: ['endDate'] });

const STATUS: Record<ItineraryError['code'], number> = { ai_unavailable: 503, ai_busy: 429, ai_timeout: 504, ai_failed: 502 };

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, code: 'bad_request', error: parsed.error.issues[0]?.message ?? 'Invalid request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const params = parsed.data;

  // Say so straight away rather than spending a fare lookup first.
  if (!isAIConfigured()) {
    return NextResponse.json({ success: false, code: 'ai_unavailable', error: 'AI itineraries aren’t connected yet.' }, { status: 503 });
  }

  // Flights from the fare model, for the whole group. The model prices one traveller one
  // way, so each leg is multiplied by the number of travellers. Without the model there is
  // no invented fare: the AI's own estimate is used if it gives one, and labelled as such.
  let flightBudget: EnhancedItineraryRequest['flightBudget'];
  let flightInsight: Record<string, unknown> | null = null;
  const flightClass = params.budget === 'luxury' ? 'business' : 'economy';
  if (params.includeFlight && params.flightSource) {
    if (!isModelConfigured()) {
      flightInsight = { source: 'unavailable', reason: 'The fare prediction model isn’t connected, so flight costs are the AI’s estimate.' };
    } else {
      const [outbound, inbound] = await Promise.all([
        predictFare(params.flightSource, params.destination, params.startDate, flightClass),
        predictFare(params.destination, params.flightSource, params.endDate, flightClass),
      ]);
      if (outbound && inbound) {
        flightBudget = { outbound: outbound.price * params.travelers, return: inbound.price * params.travelers };
        flightInsight = {
          source: 'ml-model',
          travelClass: flightClass,
          perPerson: { outbound: outbound.price, return: inbound.price },
          outbound: flightBudget.outbound,
          return: flightBudget.return,
          travelers: params.travelers,
          confidence:
            outbound.confidence !== null && inbound.confidence !== null
              ? Math.round(((outbound.confidence + inbound.confidence) / 2) * 100)
              : null,
        };
      } else {
        flightInsight = {
          source: 'unavailable',
          reason: 'The fare model covers flights between Delhi, Mumbai, Bengaluru, Chennai, Hyderabad and Kolkata, so flight costs are the AI’s estimate.',
        };
      }
    }
  }

  try {
    const itinerary = await new PerplexityItineraryService().generateEnhancedItinerary({ ...params, flightBudget });
    return NextResponse.json({
      success: true,
      data: { itinerary, flightInsight, generatedAt: new Date().toISOString(), source: 'perplexity-ai' },
    });
  } catch (error) {
    if (error instanceof ItineraryError) {
      return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: STATUS[error.code] });
    }
    return NextResponse.json(
      { success: false, code: 'ai_failed', error: 'Something went wrong while building the itinerary. Try again.' },
      { status: 500 },
    );
  }
}
