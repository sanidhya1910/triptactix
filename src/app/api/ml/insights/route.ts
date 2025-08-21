import { NextResponse } from 'next/server';
import { mlService } from '@/lib/ml-service';

export async function GET() {
  try {
    const insights = await mlService.getDashboardInsights();
    return NextResponse.json(insights);
  } catch (error) {
    console.error('ML dashboard insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard insights' },
      { status: 500 }
    );
  }
}
