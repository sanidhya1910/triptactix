import { NextRequest, NextResponse } from 'next/server';
import { mlService } from '@/lib/ml-service';

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
    const prediction = await mlService.predictPrice(from, to, departureDate, airline || undefined);
    return NextResponse.json(prediction);
  } catch (error) {
    console.error('ML prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to generate price prediction' },
      { status: 500 }
    );
  }
}
