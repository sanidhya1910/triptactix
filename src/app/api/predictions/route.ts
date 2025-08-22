import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PricePrediction, PriceHistory } from '@/types/travel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const predictionSchema = z.object({
  searchId: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  travelType: z.enum(['flight', 'train', 'hotel']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = predictionSchema.parse(body);

    const prediction = await generatePricePrediction(params);
    const priceHistory = await getPriceHistory(params);

    return NextResponse.json({
      success: true,
      data: {
        prediction,
        priceHistory,
      },
    });
  } catch (error) {
    console.error('Price prediction error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid prediction parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PREDICTION_ERROR',
          message: 'Failed to generate price prediction',
        },
      },
      { status: 500 }
    );
  }
}

async function generatePricePrediction(params: any): Promise<PricePrediction> {
  // In a real application, this would call your ML model API
  // For now, we'll simulate the prediction logic
  
  const basePrice = 299;
  const seasonalityFactor = getSeasonalityFactor(new Date(params.departureDate));
  const demandFactor = getDemandFactor(params);
  const historicalFactor = getHistoricalFactor(params);
  
  const currentPrice = basePrice * (1 + seasonalityFactor + demandFactor);
  const predictedPrice = currentPrice * (1 + historicalFactor);
  
  const priceDiff = predictedPrice - currentPrice;
  const trend = priceDiff > 10 ? 'up' : priceDiff < -10 ? 'down' : 'stable';
  
  const recommendation = 
    trend === 'up' ? 'book_now' :
    trend === 'down' ? 'wait' : 'monitor';

  return {
    id: `pred_${Date.now()}`,
    searchId: params.searchId,
    currentPrice,
    predictedPrice,
    confidence: 0.75 + Math.random() * 0.2, // 75-95% confidence
    trend,
    recommendation,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    factors: {
      seasonality: seasonalityFactor,
      demand: demandFactor,
      historical: historicalFactor,
      events: getLocalEvents(params),
    },
  };
}

async function getPriceHistory(params: any): Promise<PriceHistory[]> {
  // Generate mock historical data for the chart
  const history: PriceHistory[] = [];
  const today = new Date();
  const basePrice = 299;
  
  // Generate 30 days of historical data
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
    const price = basePrice * (1 + variation);
    
    history.push({
      date,
      price,
      type: i <= 7 ? 'predicted' : 'actual',
    });
  }
  
  // Add future predictions
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const trend = Math.sin(i * 0.1) * 0.1; // Simulate price trends
    const price = basePrice * (1 + trend);
    
    history.push({
      date,
      price,
      type: 'predicted',
    });
  }
  
  return history;
}

function getSeasonalityFactor(date: Date): number {
  const month = date.getMonth();
  
  // Higher prices during peak seasons (summer, holidays)
  if (month >= 5 && month <= 7) return 0.2; // Summer
  if (month === 11 || month === 0) return 0.25; // Winter holidays
  if (month === 2 || month === 3) return 0.15; // Spring break
  
  return 0; // Off-season
}

function getDemandFactor(params: any): number {
  // Simulate demand based on route popularity and timing
  const popularRoutes = ['NYC', 'LAX', 'LHR', 'CDG', 'NRT'];
  const isPopularRoute = popularRoutes.includes(params.origin) || 
                        popularRoutes.includes(params.destination);
  
  const departureDate = new Date(params.departureDate);
  const daysUntilDeparture = Math.ceil(
    (departureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  let demand = 0;
  
  // Higher demand for popular routes
  if (isPopularRoute) demand += 0.1;
  
  // Higher demand for last-minute bookings
  if (daysUntilDeparture < 7) demand += 0.2;
  else if (daysUntilDeparture < 14) demand += 0.1;
  
  // Higher demand for weekends
  const dayOfWeek = departureDate.getDay();
  if (dayOfWeek === 5 || dayOfWeek === 6) demand += 0.1;
  
  return Math.min(demand, 0.5); // Cap at 50%
}

function getHistoricalFactor(params: any): number {
  // Simulate historical trends
  // In a real app, this would analyze historical price data
  return (Math.random() - 0.5) * 0.2; // ±10% based on historical trends
}

function getLocalEvents(params: any): string[] {
  // Simulate local events that might affect pricing
  const events = [
    'Tech Conference',
    'Music Festival',
    'Sports Championship',
    'Holiday Weekend',
    'Trade Show',
  ];
  
  // Return 0-2 random events
  const numEvents = Math.floor(Math.random() * 3);
  return events.slice(0, numEvents);
}
