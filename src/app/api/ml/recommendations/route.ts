import { NextRequest, NextResponse } from 'next/server';
import { mlService } from '@/lib/ml-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to' },
      { status: 400 }
    );
  }

  try {
    const recommendations = await mlService.getPriceRecommendations(from, to);
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('ML recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate price recommendations' },
      { status: 500 }
    );
  }
}
