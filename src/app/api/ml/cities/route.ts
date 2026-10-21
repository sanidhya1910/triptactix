import { NextResponse } from 'next/server';
import { getAvailableRoutes } from '@/lib/ml-service';

export function GET() {
  const routes = getAvailableRoutes();
  const cities = [...new Set(routes.flatMap((r) => [r.from, r.to]))].sort();
  return NextResponse.json({ cities, routes: routes.slice(0, 20), totalRoutes: routes.length, source: 'historical' });
}
