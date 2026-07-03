import { NextRequest, NextResponse } from 'next/server';
import { mlService } from '@/lib/ml-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing required parameters: from, to' }, { status: 400 });
  }

  try {
    const intel = await mlService.getRouteIntelligence(from, to);
    return NextResponse.json(intel);
  } catch (error) {
    console.error('Route intelligence error:', error);
    return NextResponse.json({ error: 'Failed to compute route intelligence' }, { status: 500 });
  }
}
