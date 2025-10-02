const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface Env {
  PERPLEXITY_API_KEY: string;
  DB: unknown; // D1Database or any other binding
}

interface ItineraryRequestBody {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  travelers: number;
  accommodationType?: string;
  travelStyle?: string;
  interests?: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function computeTripDuration(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error(`Invalid date values provided. startDate: ${start}, endDate: ${end}`);
  }

  const diff = endDate.getTime() - startDate.getTime();
  if (diff <= 0) {
    throw new Error('End date must be after start date.');
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildItineraryPrompt(body: ItineraryRequestBody, duration: number): string {
  const interests = Array.isArray(body.interests) && body.interests.length > 0
    ? body.interests.join(', ')
    : 'general sightseeing and local culture';

  const accommodation = body.accommodationType ?? 'hotel';
  const travelStyle = body.travelStyle ?? 'balanced';

  return `Create a detailed, personalized ${duration}-day travel itinerary for ${body.destination} that prioritises the traveller's preferences.

TRIP SUMMARY:
- Destination: ${body.destination}
- Dates: ${body.startDate} to ${body.endDate}
- Travelers: ${body.travelers}
- Budget Level: ${body.budget}
- Accommodation Preference: ${accommodation}
- Travel Style: ${travelStyle}
- Interests to emphasise: ${interests}

RESPONSE INSTRUCTIONS:
- Return ONLY valid JSON (no markdown code fences, narration, or comments).
- All prices must be in Indian Rupees (₹) and reflect the user's budget level.
- Tailor activities, meals, and accommodations to the travel style, interests, and budget provided.
- Provide realistic locations within or very near ${body.destination}.
- Celebrate authentic local culture, cuisine, and experiences that match the stated interests.

JSON SHAPE:
{
  "destination": "${body.destination}",
  "duration": ${duration},
  "totalCost": number,
  "overview": "2-3 sentence compelling summary tailored to the user's interests",
  "bestTimeToVisit": "Seasonal guidance relevant to the trip dates",
  "weather": {
    "temperature": "Expected temperature range during the trip",
    "conditions": "Typical weather conditions"
  },
  "days": [
    {
      "day": number,
      "date": "YYYY-MM-DD",
      "title": "Theme of the day aligned with ${travelStyle}",
      "activities": [
        {
          "id": "unique-activity-id",
          "time": "HH:MM",
          "name": "Activity name",
          "description": "Why this activity suits the traveller",
          "duration": "Estimated duration",
          "cost": number,
          "location": "Exact spot or neighbourhood",
          "tips": ["Practical tip", "Insider advice"],
          "category": "Sightseeing/Adventure/Food/etc"
        }
      ],
      "accommodation": {
        "name": "Property name",
        "type": "${accommodation}",
        "location": "Area or district",
        "pricePerNight": number,
        "amenities": ["Amenity 1", "Amenity 2"]
      },
      "transportation": [
        {
          "id": "unique-transport-id",
          "type": "flight/train/bus/taxi/walk",
          "from": "Start point",
          "to": "End point",
          "cost": number,
          "duration": "Travel time",
          "notes": "Helpful notes"
        }
      ],
      "meals": [
        {
          "type": "breakfast/lunch/dinner",
          "restaurant": "Restaurant name",
          "cuisine": "Cuisine",
          "cost": number,
          "location": "Neighbourhood"
        }
      ]
    }
  ],
  "tips": [
    "Practical tip aligned with ${travelStyle}",
    "Budget/location/safety insight relevant to ${body.destination}"
  ]
}

Return only this JSON object with no additional text.`;
}

function extractJSONFromText(text: string): any {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const rawJson = codeBlockMatch ? codeBlockMatch[1] : text;

  const objectMatch = rawJson.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new Error('Unable to locate JSON in Perplexity response.');
  }

  const cleaned = objectMatch[0]
    .replace(/\n(?=\s*\n)/g, '\n')
    .replace(/\t/g, ' ')
    .trim();

  return JSON.parse(cleaned);
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const { PERPLEXITY_API_KEY } = env as Env;

  try {
    const body = (await request.json()) as ItineraryRequestBody;

    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Perplexity API key not configured.'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    const duration = computeTripDuration(body.startDate, body.endDate);
    const prompt = buildItineraryPrompt(body, duration);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar-reasoning-pro',
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 3500,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Indian travel planner. Always respond with valid JSON that can be parsed without errors.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Perplexity API error:', response.status, response.statusText, errorBody);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to connect to itinerary AI service.'
      }), {
        status: 502,
        headers: corsHeaders
      });
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Perplexity did not return any content.');
    }

    const textResponse = Array.isArray(messageContent)
      ? messageContent
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            if (typeof part?.content === 'string') return part.content;
            return '';
          })
          .join('\n')
          .trim()
      : String(messageContent).trim();

    const rawItinerary = extractJSONFromText(textResponse);

    const itinerary = {
      id: `itinerary_${Date.now()}`,
      destination: rawItinerary.destination ?? body.destination,
      startDate: body.startDate,
      endDate: body.endDate,
      duration: rawItinerary.duration ?? duration,
      totalCost: rawItinerary.totalCost ?? 0,
      days: (rawItinerary.days || []).map((day: any, dayIndex: number) => ({
        ...day,
        activities: (day.activities || []).map((activity: any, activityIndex: number) => ({
          ...activity,
          id: activity.id ?? `activity-${dayIndex}-${activityIndex}`,
          tips: Array.isArray(activity.tips) ? activity.tips : []
        })),
        meals: (day.meals || []).map((meal: any, mealIndex: number) => ({
          ...meal,
          id: meal.id ?? `meal-${dayIndex}-${mealIndex}`
        })),
        transportation: (day.transportation || []).map((transport: any, transportIndex: number) => ({
          ...transport,
          id: transport.id ?? `transport-${dayIndex}-${transportIndex}`
        }))
      })),
      summary: {
        highlights: Array.isArray(rawItinerary.tips) ? rawItinerary.tips.slice(0, 3) : [
          `Top experiences in ${body.destination}`,
          `Local cuisine tailored to ${body.budget} budgets`,
          `Immersive activities for ${body.travelStyle ?? 'balanced'} travellers`
        ],
        totalActivities: (rawItinerary.days || []).reduce(
          (sum: number, day: any) => sum + (day.activities?.length ?? 0),
          0
        ),
        totalMeals: (rawItinerary.days || []).reduce(
          (sum: number, day: any) => sum + (day.meals?.length ?? 0),
          0
        ),
        avgDailyCost: rawItinerary.totalCost && duration
          ? Math.round(rawItinerary.totalCost / duration)
          : 0,
        weatherInfo: rawItinerary.weather
          ? {
              temperature: rawItinerary.weather.temperature ?? '25-30°C',
              conditions: rawItinerary.weather.conditions ?? 'Pleasant',
              recommendation: `Pack for ${body.travelStyle ?? 'balanced'} activities`
            }
          : undefined
      },
      tips: Array.isArray(rawItinerary.tips) ? rawItinerary.tips : [
        'Carry a reusable water bottle and stay hydrated.',
        'Keep local emergency numbers handy.',
        `Plan buffer time between experiences in ${body.destination}.`
      ],
      overview:
        rawItinerary.overview ?? `Enjoy a ${duration}-day ${body.travelStyle ?? 'balanced'} escape in ${body.destination}, designed around your interests.`,
      emergencyInfo: rawItinerary.emergencyInfo ?? {
        hospitals: ['Local Government Hospital', 'Private Medical Center'],
        emergencyNumbers: ['100 (Police)', '102 (Ambulance)', '101 (Fire)']
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
      error: error instanceof Error ? error.message : 'Failed to generate itinerary'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
