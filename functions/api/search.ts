interface Env {
  RAPIDAPI_KEY: string;
  DB: any; // D1Database
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const { RAPIDAPI_KEY } = env as Env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json();
    const { type, searchParams } = body;

    if (!RAPIDAPI_KEY) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured' 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // For now, return mock data for different search types
    let results = [];

    switch (type) {
      case 'flights':
        results = [
          {
            id: '1',
            airline: 'IndiGo',
            flightNumber: '6E-234',
            departure: {
              airport: searchParams.from,
              time: '08:30',
              date: searchParams.departureDate
            },
            arrival: {
              airport: searchParams.to,
              time: '10:45',
              date: searchParams.departureDate
            },
            duration: '2h 15m',
            price: 4500,
            currency: 'INR',
            class: searchParams.class || 'Economy',
            stops: 0
          },
          {
            id: '2',
            airline: 'SpiceJet',
            flightNumber: 'SG-8745',
            departure: {
              airport: searchParams.from,
              time: '14:20',
              date: searchParams.departureDate
            },
            arrival: {
              airport: searchParams.to,
              time: '16:35',
              date: searchParams.departureDate
            },
            duration: '2h 15m',
            price: 3800,
            currency: 'INR',
            class: searchParams.class || 'Economy',
            stops: 0
          }
        ];
        break;

      case 'trains':
        results = [
          {
            id: '1',
            trainName: 'Rajdhani Express',
            trainNumber: '12301',
            departure: {
              station: searchParams.from,
              time: '16:55',
              date: searchParams.departureDate
            },
            arrival: {
              station: searchParams.to,
              time: '08:10',
              date: searchParams.departureDate
            },
            duration: '15h 15m',
            price: 2340,
            currency: 'INR',
            class: '3A',
            type: 'Superfast'
          },
          {
            id: '2',
            trainName: 'Shatabdi Express',
            trainNumber: '12002',
            departure: {
              station: searchParams.from,
              time: '06:00',
              date: searchParams.departureDate
            },
            arrival: {
              station: searchParams.to,
              time: '13:20',
              date: searchParams.departureDate
            },
            duration: '7h 20m',
            price: 1650,
            currency: 'INR',
            class: 'CC',
            type: 'Express'
          }
        ];
        break;

      case 'hotels':
        results = [
          {
            id: '1',
            name: 'The Taj Palace',
            location: searchParams.destination,
            rating: 4.8,
            price: 8500,
            currency: 'INR',
            priceType: 'per night',
            amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym'],
            images: [],
            description: 'Luxury hotel in the heart of the city'
          },
          {
            id: '2',
            name: 'Hotel Grand Plaza',
            location: searchParams.destination,
            rating: 4.2,
            price: 4200,
            currency: 'INR',
            priceType: 'per night',
            amenities: ['WiFi', 'Restaurant', 'Room Service'],
            images: [],
            description: 'Comfortable stay with modern amenities'
          }
        ];
        break;

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid search type' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Search failed' 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
