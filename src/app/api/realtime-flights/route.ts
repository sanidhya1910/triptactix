import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const flightSearchSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureDate: z.string().min(1),
  returnDate: z.string().optional(),
  passengers: z.number().min(1).max(9).optional().default(1),
  travelClass: z.enum(['economy', 'premium', 'business', 'first']).optional().default('economy'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = flightSearchSchema.parse(body);

    console.log('Real-time flight search request:', searchParams);

    // Call the ML API for real-time flight search and comparison
    const mlApiUrl = 'http://localhost:8000/compare-flights';
    
    const mlRequest = {
      origin: searchParams.origin,
      destination: searchParams.destination,
      departure_date: searchParams.departureDate,
      return_date: searchParams.returnDate,
      passengers: searchParams.passengers,
      travel_class: searchParams.travelClass
    };

    const mlResponse = await fetch(mlApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mlRequest),
      signal: AbortSignal.timeout(30000), // 30 second timeout for real-time search
    });

    if (!mlResponse.ok) {
      throw new Error(`ML API responded with ${mlResponse.status}: ${mlResponse.statusText}`);
    }

    const mlData = await mlResponse.json();

    // Format the response for our frontend
    const formattedFlights = mlData.realtime_flights.map((flight: any, index: number) => {
      const mlPrediction = mlData.ml_predictions.find((p: any) => p.flight_id === flight.id);
      
      return {
        id: flight.id,
        airline: flight.airline,
        flightNumber: flight.flight_number,
        price: {
          total: flight.price,
          currency: 'INR',
          breakdown: {
            base: Math.round(flight.price * 0.8),
            taxes: Math.round(flight.price * 0.15),
            fees: Math.round(flight.price * 0.05)
          }
        },
        outbound: [
          {
            id: `${flight.id}-outbound`,
            origin: {
              id: searchParams.origin.toLowerCase(),
              name: searchParams.origin,
              code: getAirportCode(searchParams.origin),
              city: searchParams.origin,
              country: 'India',
              type: 'airport' as const
            },
            destination: {
              id: searchParams.destination.toLowerCase(),
              name: searchParams.destination,
              code: getAirportCode(searchParams.destination),
              city: searchParams.destination,
              country: 'India',
              type: 'airport' as const
            },
            departureTime: new Date(flight.departure_time),
            arrivalTime: new Date(flight.arrival_time || flight.departure_time),
            duration: parseDuration(flight.duration),
            airline: flight.airline,
            flightNumber: flight.flight_number,
            aircraft: 'Modern Aircraft',
            stops: flight.stops
          }
        ],
        stops: flight.stops,
        source: flight.source,
        bookingUrl: flight.booking_url,
        amenities: ['meals', 'wifi'],
        refundable: true,
        changeable: true,
        bookingClass: searchParams.travelClass,
        baggage: {
          checkedBags: 1,
          carryOnBags: 1,
          personalItem: true
        },
        // ML Prediction data
        mlPrediction: mlPrediction ? {
          predictedPrice: mlPrediction.predicted_price,
          confidence: mlPrediction.confidence,
          recommendation: getRecommendationText(mlPrediction.recommendation),
          priceRange: {
            min: mlPrediction.predicted_price - 500,
            max: mlPrediction.predicted_price + 500
          },
          savingsPercent: Math.round(Math.abs(mlPrediction.percentage_difference)),
          priceDifference: mlPrediction.price_difference,
          isGoodDeal: mlPrediction.recommendation === 'great_deal',
          isOverpriced: mlPrediction.recommendation === 'overpriced'
        } : undefined
      };
    });

    // Add price analysis and recommendations
    const response = {
      success: true,
      data: {
        flights: formattedFlights,
        searchId: `realtime_${Date.now()}`,
        timestamp: new Date(),
        totalFound: mlData.realtime_flights.length,
        sources: mlData.sources || ['realtime'],
        priceAnalysis: {
          avgHistoricalPrice: mlData.price_analysis.avg_historical_price,
          avgCurrentPrice: mlData.price_analysis.avg_current_price,
          priceTrend: mlData.price_analysis.price_trend,
          priceRange: mlData.price_analysis.price_range,
          bestDealId: mlData.price_analysis.best_deal_flight_id
        },
        recommendations: mlData.recommendations,
        searchParams: {
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureDate: searchParams.departureDate,
          returnDate: searchParams.returnDate,
          passengers: searchParams.passengers,
          travelClass: searchParams.travelClass
        }
      }
    };

    console.log(`Real-time search completed: ${formattedFlights.length} flights found from ML API`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Real-time flight search error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Fallback to mock data if ML API is unavailable
    const mockFlights = generateMockFlights({
      origin: 'Delhi',
      destination: 'Mumbai',
      departureDate: new Date().toISOString().split('T')[0]
    });

    return NextResponse.json({
      success: true,
      data: {
        flights: mockFlights,
        searchId: `mock_${Date.now()}`,
        timestamp: new Date(),
        totalFound: mockFlights.length,
        sources: ['mock'],
        recommendations: ['ML API unavailable - showing sample data'],
        fallback: true
      }
    });
  }
}

function getAirportCode(city: string): string {
  const cityToCode: { [key: string]: string } = {
    'Delhi': 'DEL',
    'Mumbai': 'BOM',
    'Bangalore': 'BLR',
    'Chennai': 'MAA',
    'Kolkata': 'CCU',
    'Hyderabad': 'HYD',
    'Pune': 'PNQ',
    'Ahmedabad': 'AMD',
    'Kochi': 'COK',
    'Goa': 'GOI'
  };
  return cityToCode[city] || 'DEL';
}

function parseDuration(duration: string): number {
  // Convert duration string like "2h30m" to minutes
  const matches = duration.match(/(\d+)h?(?:\s*(\d+)m)?/);
  if (!matches) return 120; // default 2 hours
  
  const hours = parseInt(matches[1]) || 0;
  const minutes = parseInt(matches[2]) || 0;
  return hours * 60 + minutes;
}

function getRecommendationText(recommendation: string): string {
  const recommendations: { [key: string]: string } = {
    'great_deal': 'Excellent price! Book now',
    'fair_price': 'Price is reasonable',
    'overpriced': 'Consider waiting or other options',
    'low_confidence': 'Price prediction uncertain'
  };
  return recommendations[recommendation] || 'No recommendation available';
}

function generateMockFlights(params: any) {
  const airlines = ['IndiGo', 'SpiceJet', 'Air India', 'Vistara'];
  const basePrice = 4500;
  
  return airlines.map((airline, index) => ({
    id: `mock-realtime-${index}`,
    airline: airline,
    flightNumber: `${airline.substring(0, 2).toUpperCase()}${1000 + index}`,
    price: {
      total: basePrice + index * 500,
      currency: 'INR',
      breakdown: {
        base: (basePrice + index * 500) * 0.8,
        taxes: (basePrice + index * 500) * 0.15,
        fees: (basePrice + index * 500) * 0.05
      }
    },
    outbound: [{
      id: `mock-outbound-${index}`,
      origin: {
        id: params.origin.toLowerCase(),
        name: params.origin,
        code: getAirportCode(params.origin),
        city: params.origin,
        country: 'India',
        type: 'airport' as const
      },
      destination: {
        id: params.destination.toLowerCase(),
        name: params.destination,
        code: getAirportCode(params.destination),
        city: params.destination,
        country: 'India',
        type: 'airport' as const
      },
      departureTime: new Date(`${params.departureDate}T${8 + index * 2}:00:00`),
      arrivalTime: new Date(`${params.departureDate}T${11 + index * 2}:00:00`),
      duration: 180,
      airline: airline,
      flightNumber: `${airline.substring(0, 2).toUpperCase()}${1000 + index}`,
      aircraft: 'Airbus A320',
      stops: index > 2 ? 1 : 0
    }],
    stops: index > 2 ? 1 : 0,
    source: 'mock',
    amenities: ['meals', 'wifi'],
    refundable: true,
    changeable: true,
    bookingClass: 'economy',
    baggage: {
      checkedBags: 1,
      carryOnBags: 1,
      personalItem: true
    },
    mlPrediction: {
      predictedPrice: basePrice + index * 400,
      confidence: 0.85,
      recommendation: index === 0 ? 'Excellent price! Book now' : 'Price is reasonable',
      priceRange: { min: basePrice - 200, max: basePrice + 1000 },
      savingsPercent: index === 0 ? 10 : 5,
      priceDifference: index * 100,
      isGoodDeal: index === 0,
      isOverpriced: false
    }
  }));
}
