import { NextRequest, NextResponse } from 'next/server';
import { callMLAPI } from '@/lib/resilient-fetch';
import { canonicalCity } from '@/lib/cities';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Proxy to the Python ML API's /fare-calendar endpoint (cheapest day to fly).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callMLAPI<any>('/fare-calendar', {
      source_city: canonicalCity(body.source_city),
      destination_city: canonicalCity(body.destination_city),
      days_ahead: body.days_ahead ?? 60,
      travel_class: body.travel_class ?? 'economy',
    }, { maxRetries: 1, timeout: 6000 });

    if (!result) {
      return NextResponse.json({ success: false, error: 'ML API unavailable' }, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
