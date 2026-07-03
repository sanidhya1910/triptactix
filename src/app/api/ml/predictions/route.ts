import { NextRequest, NextResponse } from 'next/server';
import { mlService } from '@/lib/ml-service';
import { callMLAPI } from '@/lib/resilient-fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const departureDate = searchParams.get('departureDate');
  const airline = searchParams.get('airline');

  if (!from || !to || !departureDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to, departureDate' },
      { status: 400 }
    );
  }

  try {
    // Statistical service gives historical context (avg/min/max) and a fallback.
    const prediction = await mlService.predictPrice(from, to, departureDate, airline || undefined);

    // Prefer the trained Python gradient-boosting model for the headline number,
    // so the dashboard agrees with the search page. Falls back to the statistical
    // prediction if the ML API is unavailable.
    const ml = await callMLAPI<any>('/predict', {
      airline: airline || 'IndiGo',
      source_city: from,
      destination_city: to,
      departure_date: departureDate,
      departure_time: '10:00',
      total_stops: 0,
      travel_class: 'economy',
    }, { maxRetries: 1, timeout: 3500 });

    const usedModel = ml?.success && typeof ml.predicted_price === 'number';

    return NextResponse.json({
      ...prediction,
      predictedPrice: usedModel ? ml.predicted_price : prediction.predictedPrice,
      confidence: usedModel ? (ml.confidence ?? prediction.confidence) : prediction.confidence,
      modelSource: usedModel ? 'gradient-boosting' : 'statistical',
    });
  } catch (error) {
    console.error('ML prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to generate price prediction' },
      { status: 500 }
    );
  }
}
