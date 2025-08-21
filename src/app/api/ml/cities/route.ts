import { NextResponse } from 'next/server';
import { mlService } from '@/lib/ml-service';

export async function GET() {
  try {
    const routes = mlService.getAvailableRoutes();
    
    // Extract unique cities
    const cities = new Set<string>();
    routes.forEach(route => {
      cities.add(route.from);
      cities.add(route.to);
    });
    
    const availableCities = Array.from(cities).sort();
    
    return NextResponse.json({
      cities: availableCities,
      routes: routes.slice(0, 20), // Return top 20 routes
      totalRoutes: routes.length
    });
  } catch (error) {
    console.error('Failed to get available cities:', error);
    return NextResponse.json(
      { error: 'Failed to get available cities' },
      { status: 500 }
    );
  }
}
