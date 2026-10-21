import { NextResponse } from 'next/server';
import { getDashboardInsights } from '@/lib/ml-service';

export function GET() {
  return NextResponse.json({ ...getDashboardInsights(), source: 'historical' });
}
