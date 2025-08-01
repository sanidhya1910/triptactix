import { GoogleGenerativeAI } from '@google/generative-ai';

interface Env {
  GEMINI_API_KEY: string;
  DB: any; // D1Database
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const { GEMINI_API_KEY } = env as Env;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json();
    
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key not configured' 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Create a detailed travel itinerary based on these requirements:

Destination: ${body.destination}
Travel Dates: ${body.startDate} to ${body.endDate}
Budget: ${body.budget} 
Number of Travelers: ${body.travelers}
Accommodation Type: ${body.accommodationType}
Travel Style: ${body.travelStyle}
Interests: ${body.interests?.join(', ') || 'General sightseeing'}

Please provide a comprehensive itinerary in JSON format with the following structure:
{
  "destination": "destination name",
  "duration": number_of_days,
  "totalCost": estimated_total_cost_in_INR,
  "overview": "brief description",
  "bestTimeToVisit": "season/months",
  "weather": {
    "temperature": "temperature range",
    "conditions": "weather description"
  },
  "days": [
    {
      "day": day_number,
      "date": "date",
      "title": "day theme",
      "activities": [
        {
          "id": "unique_id",
          "time": "time_slot (morning/afternoon/evening)",
          "name": "activity name",
          "description": "detailed description",
          "duration": "duration in hours",
          "cost": cost_in_INR,
          "location": "specific location",
          "tips": "helpful tips"
        }
      ],
      "accommodation": {
        "name": "hotel/accommodation name",
        "type": "accommodation type",
        "location": "area/district",
        "pricePerNight": price_in_INR,
        "amenities": ["amenity1", "amenity2"]
      },
      "transportation": [
        {
          "id": "unique_id",
          "type": "flight/train/bus/taxi",
          "from": "departure location",
          "to": "destination location",
          "cost": cost_in_INR,
          "duration": "travel time",
          "notes": "additional notes"
        }
      ],
      "meals": [
        {
          "type": "breakfast/lunch/dinner",
          "restaurant": "restaurant name",
          "cuisine": "cuisine type",
          "cost": cost_in_INR,
          "location": "restaurant location"
        }
      ]
    }
  ],
  "tips": [
    "practical travel tips",
    "local customs",
    "what to pack",
    "safety advice"
  ]
}

Focus on Indian destinations and provide costs in Indian Rupees. Include popular tourist attractions, local experiences, authentic restaurants, and practical transportation options within India.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON response
    let rawItinerary;
    try {
      // Extract JSON from the response (sometimes wrapped in markdown)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      rawItinerary = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to generate itinerary' 
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    // Transform the AI response to match frontend interface
    const itinerary = {
      id: `itinerary_${Date.now()}`,
      destination: rawItinerary.destination || body.destination,
      startDate: body.startDate,
      endDate: body.endDate,
      duration: rawItinerary.duration || rawItinerary.days?.length || 1,
      totalCost: rawItinerary.totalCost || 0,
      days: (rawItinerary.days || []).map((day: any) => ({
        ...day,
        activities: (day.activities || []).map((activity: any) => ({
          ...activity,
          tips: Array.isArray(activity.tips) ? activity.tips : []
        }))
      })),
      summary: {
        highlights: rawItinerary.tips?.slice(0, 3) || [
          "Explore local culture and traditions",
          "Try authentic regional cuisine", 
          "Visit popular tourist attractions"
        ],
        totalActivities: rawItinerary.days?.reduce((sum: number, day: any) => sum + (day.activities?.length || 0), 0) || 0,
        totalMeals: rawItinerary.days?.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0) || 0,
        avgDailyCost: rawItinerary.totalCost ? Math.round(rawItinerary.totalCost / (rawItinerary.duration || 1)) : 0,
        weatherInfo: rawItinerary.weather ? {
          temperature: rawItinerary.weather.temperature || "25-30°C",
          conditions: rawItinerary.weather.conditions || "Pleasant"
        } : undefined
      },
      tips: Array.isArray(rawItinerary.tips) ? rawItinerary.tips : [],
      overview: rawItinerary.overview || `Discover the best of ${rawItinerary.destination || body.destination}`,
      emergencyInfo: rawItinerary.emergencyInfo || {
        hospitals: ["Local Government Hospital", "Private Medical Center"],
        emergencyNumbers: ["100 (Police)", "102 (Ambulance)", "101 (Fire)"]
      }
    };

    return new Response(JSON.stringify({ 
      success: true, 
      itinerary 
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Itinerary generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to generate itinerary' 
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
