import { NextRequest, NextResponse } from 'next/server';
import { callMLAPI } from '@/lib/resilient-fetch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-side proxy to the Python ML API's /price-trend endpoint.
 * Keeps the ML API URL on the server (configurable via ML_API_URL) instead of
 * the browser hardcoding http://localhost:8000.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await callMLAPI<any>('/price-trend', {
      source_city: body.source_city,
      destination_city: body.destination_city,
      days_ahead: body.days_ahead ?? 30,
    }, { maxRetries: 1, timeout: 4000 });

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
