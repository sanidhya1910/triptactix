import { NextRequest, NextResponse } from 'next/server';
import { canonicalCity } from '@/lib/cities';
import { isISODate } from '@/lib/dates';
import { historicalRange } from '@/lib/ml-service';
import { callMLAPI, isModelConfigured } from '@/lib/resilient-fetch';

export const dynamic = 'force-dynamic';

interface ModelResponse {
  success?: boolean;
  predicted_price?: number;
  confidence?: number;
  price_range?: { min?: number; max?: number };
}

/**
 * A fare forecast from the trained model behind ML_API_URL.
 *
 * Without the model this answers 503 "model_unavailable" and still includes the route's
 * real historical range, so the page can show context without presenting it as a
 * forecast. It used to fall back to a statistical guess (or a flat ₹8,000) labelled as
 * a prediction.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from')?.trim();
  const to = searchParams.get('to')?.trim();
  const departureDate = searchParams.get('departureDate') ?? '';
  const airline = searchParams.get('airline') ?? undefined;
  const travelClass = searchParams.get('travelClass') ?? 'economy';

  if (!from || !to || !isISODate(departureDate)) {
    return NextResponse.json(
      { error: 'Required: from, to, and departureDate as yyyy-mm-dd.', code: 'bad_request' },
      { status: 400 },
    );
  }
  if (canonicalCity(from).toLowerCase() === canonicalCity(to).toLowerCase()) {
    return NextResponse.json({ error: 'Choose two different cities.', code: 'same_city' }, { status: 400 });
  }

  const historical = historicalRange(from, to, { departureDate, airline, travelClass });

  if (!isModelConfigured()) {
    return NextResponse.json(
      { error: 'The fare prediction model isn’t connected.', code: 'model_unavailable', historical },
      { status: 503 },
    );
  }

  const ml = await callMLAPI<ModelResponse>(
    '/predict',
    {
      airline: airline || 'IndiGo',
      source_city: canonicalCity(from),
      destination_city: canonicalCity(to),
      departure_date: departureDate,
      travel_class: travelClass,
    },
    { maxRetries: 1, timeout: 6000 },
  );

  if (!ml?.success || typeof ml.predicted_price !== 'number') {
    return NextResponse.json(
      { error: 'The fare prediction model didn’t respond.', code: 'model_unavailable', historical },
      { status: 503 },
    );
  }

  const lo = ml.price_range?.min;
  const hi = ml.price_range?.max;
  return NextResponse.json({
    source: 'model',
    predictedPrice: ml.predicted_price,
    confidence: typeof ml.confidence === 'number' ? ml.confidence : null,
    // The model's 10th and 90th percentile estimates: 8 in 10 fares should fall inside.
    interval: typeof lo === 'number' && typeof hi === 'number' ? { low: lo, high: hi } : null,
    historical,
  });
}
