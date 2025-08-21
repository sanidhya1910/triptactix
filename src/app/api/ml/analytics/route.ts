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
    const analytics = await mlService.getRouteAnalytics(from, to);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('ML analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to generate route analytics' },
      { status: 500 }
    );
  }
}
