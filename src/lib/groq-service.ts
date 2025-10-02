import { 
  ItineraryRequest, 
  AIItineraryResponse, 
  Itinerary, 
  ItineraryDay 
} from '@/types/itinerary';
import { SerpAPIService } from '@/lib/serpapi-service';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface EnhancedItineraryRequest extends ItineraryRequest {
  includeFlight: boolean;
  flightSource?: string;
  flightBudget?: {
    outbound: number;
    return: number;
  };
  hotelBudget?: {
    budget: number;
    midRange: number;
    luxury: number;
  };
  specificInterests?: string[];
  groupType?: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  fitnessLevel?: 'low' | 'moderate' | 'high';
  dietaryRestrictions?: string[];
}

export interface GeneratedItinerary {
  destination: string;
  duration: number;
  overview: string;
  highlights: string[];
  days: Array<{
    day: number;
    date: string;
    theme: string;
    activities: Array<{
      time: string;
      title: string;
      description: string;
      location: string;
      duration: string;
      estimatedCost: number;
      category: 'sightseeing' | 'food' | 'activity' | 'transport' | 'accommodation' | 'shopping';
      tips: string[];
    }>;
    meals: Array<{
      time: string;
      restaurant: string;
      cuisine: string;
      estimatedCost: number;
      speciality: string;
    }>;
    estimatedDailyCost: number;
  }>;
  transportation: {
    flights?: {
      outbound: {
        estimatedCost: number;
        tips: string[];
      };
      return: {
        estimatedCost: number;
        tips: string[];
      };
    };
    local: {
      recommendations: string[];
      estimatedDailyCost: number;
    };
  };
  accommodation: {
    type: string;
    recommendations: Array<{
      name: string;
      area: string;
      estimatedCostPerNight: number;
      amenities: string[];
      reason: string;
    }>;
  };
  budgetBreakdown: {
    flights?: number;
    accommodation: number;
    activities: number;
    food: number;
    transportation: number;
    miscellaneous: number;
    total: number;
  };
  tips: {
    general: string[];
    budgetSaving: string[];
    cultural: string[];
    safety: string[];
  };
  bestTimeToVisit: {
    weather: string;
    crowds: string;
    prices: string;
  };
}

export class PerplexityItineraryService {
  // Rate limiting tracking
  private static lastRequestTime = 0;
  private static requestCount = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  private static readonly MAX_REQUESTS_PER_MINUTE = 30; // Perplexity safe default

  async generateEnhancedItinerary(request: EnhancedItineraryRequest): Promise<GeneratedItinerary> {
    try {
      // Check rate limiting
      if (!this.canMakeRequest()) {
        console.log('Rate limit reached, generating fallback itinerary...');
        return this.generateFallbackItinerary(request);
      }

      // Fetch hotel recommendations using Google Hotels API
      let hotelRecommendations = null;
      try {
        console.log('Fetching hotel recommendations via SerpAPI...');
        const hotels = await SerpAPIService.searchHotels({
          destination: request.destination,
          checkInDate: request.startDate,
          checkOutDate: request.endDate,
          adults: request.travelers,
          currency: 'INR'
        });
        
        // Select top 3-5 hotels based on budget preference
        if (hotels.length > 0) {
          const sortedHotels = hotels.sort((a, b) => {
            // Sort by rating and price based on budget preference
            if (request.budget === 'budget') {
              return (a.totalRate?.extractedLowest || 0) - (b.totalRate?.extractedLowest || 0);
            } else if (request.budget === 'luxury') {
              return (b.overallRating || 0) - (a.overallRating || 0);
            } else {
              // Mid-range: balance price and rating
              const aScore = ((a.overallRating || 0) * 2) - ((a.totalRate?.extractedLowest || 0) / 1000);
              const bScore = ((b.overallRating || 0) * 2) - ((b.totalRate?.extractedLowest || 0) / 1000);
              return bScore - aScore;
            }
          });
          
          hotelRecommendations = sortedHotels.slice(0, 4).map(hotel => ({
            name: hotel.name,
            rating: hotel.overallRating,
            pricePerNight: hotel.ratePerNight?.extractedLowest || 0,
            totalPrice: hotel.totalRate?.extractedLowest || 0,
            location: hotel.nearbyPlaces?.[0]?.name || 'Central location',
            amenities: hotel.amenities?.slice(0, 3) || [],
            hotelClass: hotel.extractedHotelClass
          }));
          
          console.log(`Found ${hotelRecommendations.length} hotel recommendations`);
        }
      } catch (hotelError) {
        console.error('Error fetching hotel recommendations:', hotelError);
        // Continue without hotel data - the AI will provide generic recommendations
      }

      const prompt = this.buildEnhancedPrompt(request, hotelRecommendations);
      console.log('Generating enhanced itinerary with Perplexity...');
      
      // Update rate limiting counters
      this.updateRequestCounters();

      const responseText = await this.callPerplexity(prompt);
      console.log('Raw Perplexity response length:', responseText.length);
      
      // Parse the JSON response with enhanced error handling
      let itinerary;
      try {
        // Try parsing direct JSON first
        itinerary = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Direct JSON parsing failed, attempting advanced extraction...');
        
        try {
          // Enhanced JSON extraction and cleaning
          itinerary = this.extractAndCleanJSON(responseText);
        } catch (extractError) {
          console.error('Failed to extract valid JSON:', extractError);
          console.log('Raw response (first 1000 chars):', responseText.substring(0, 1000));
          console.log('Raw response (around position 5000):', responseText.substring(4900, 5100));
          throw new Error(`Failed to parse Perplexity response: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
        }
      }
      
      return this.validateAndProcessEnhancedItinerary(itinerary, request);
      
    } catch (error) {
      console.error('Error generating enhanced itinerary with Perplexity:', error);
      
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        console.log('Rate limit error detected, generating fallback itinerary...');
        return this.generateFallbackItinerary(request);
      }
      
      // For other errors, also provide fallback
      console.log('Perplexity error occurred, generating fallback itinerary...');
      return this.generateFallbackItinerary(request);
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - PerplexityItineraryService.lastRequestTime;
    
    // Reset minute counter if a minute has passed
    if (timeSinceLastRequest > 60000) { // 1 minute
      PerplexityItineraryService.requestCount = 0;
    }
    
    // Check if we've exceeded limits
    if (PerplexityItineraryService.requestCount >= PerplexityItineraryService.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    if (timeSinceLastRequest < PerplexityItineraryService.MIN_REQUEST_INTERVAL) {
      return false;
    }
    
    return true;
  }
  
  private updateRequestCounters(): void {
    PerplexityItineraryService.lastRequestTime = Date.now();
    PerplexityItineraryService.requestCount += 1;
  }
  
  private isRateLimitError(error: any): boolean {
    return error?.message?.includes('429') || 
           error?.message?.includes('Too Many Requests') ||
           error?.message?.includes('rate limit') ||
           error?.message?.includes('RATE_LIMIT_EXCEEDED') ||
           error?.status === 429;
  }

  private async callPerplexity(prompt: string): Promise<string> {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const systemPrompt = "You are an expert travel planner. CRITICAL: Your response must be valid JSON only. Do not include any text before or after the JSON. Do not use markdown code blocks. Do not include comments. Ensure all strings are properly quoted and there are no trailing commas. The JSON must be parseable by JSON.parse().";

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-reasoning-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorBody}`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Perplexity API returned empty response');
    }

    if (Array.isArray(messageContent)) {
      return messageContent
        .map((part: any) => {
          if (typeof part === 'string') {
            return part;
          }
          if (part?.type === 'output_text' && typeof part?.text === 'string') {
            return part.text;
          }
          if (typeof part?.text === 'string') {
            return part.text;
          }
          if (typeof part?.content === 'string') {
            return part.content;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n')
        .trim();
    }

    if (typeof messageContent === 'string') {
      return messageContent.trim();
    }

    if (typeof messageContent === 'object' && messageContent !== null) {
      if (typeof messageContent.text === 'string') {
        return messageContent.text.trim();
      }
      if (Array.isArray(messageContent.text)) {
        return messageContent.text.join('\n').trim();
      }
    }

    return JSON.stringify(messageContent);
  }

  private extractAndCleanJSON(responseText: string): any {
    // Step 1: Try extracting JSON from markdown code blocks
    let jsonText = '';
    
    // Look for JSON in markdown code blocks
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
      // Look for JSON object pattern
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      } else {
        throw new Error('No JSON structure found in response');
      }
    }

    // Step 2: Clean the JSON text
    jsonText = this.cleanJSONString(jsonText);

    // Step 3: Attempt to parse with progressively more aggressive fixes
    const parseAttempts = [
      // Original cleaned text
      jsonText,
      // Fix common trailing comma issues
      jsonText.replace(/,(\s*[}\]])/g, '$1'),
      // Fix missing quotes around keys
      jsonText.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'),
      // Fix single quotes to double quotes
      jsonText.replace(/'/g, '"'),
      // Remove comments
      jsonText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
    ];

    for (let i = 0; i < parseAttempts.length; i++) {
      try {
        return JSON.parse(parseAttempts[i]);
      } catch (error) {
        console.log(`Parse attempt ${i + 1} failed:`, error instanceof Error ? error.message : error);
        if (i === parseAttempts.length - 1) {
          // Last attempt failed, try more aggressive cleaning
          return this.tryAggressiveJSONExtraction(responseText);
        }
      }
    }

    throw new Error('All JSON parsing attempts failed');
  }

  private cleanJSONString(jsonText: string): string {
    return jsonText
      .trim()
      // Remove any leading/trailing non-JSON characters
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '')
      // Fix newlines in strings
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      // Fix escaped quotes that might be causing issues
      .replace(/\\"/g, '\\"');
  }

  private tryAggressiveJSONExtraction(responseText: string): any {
    console.log('Attempting aggressive JSON extraction...');
    
    try {
      // Try to find and parse just the structure we need
      const structureMatch = responseText.match(/\{[\s\S]*"days"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
      if (structureMatch) {
        let extracted = structureMatch[0];
        
        // Clean up the extracted JSON more aggressively
        extracted = extracted
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote keys
          .replace(/:\s*'([^']*?)'/g, ': "$1"') // Single to double quotes for values
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .replace(/\/\/.*$/gm, ''); // Remove line comments
        
        return JSON.parse(extracted);
      }
    } catch (error) {
      console.error('Aggressive extraction also failed:', error);
    }
    
    // Final fallback: create minimal valid structure
    console.log('Creating minimal fallback structure...');
    throw new Error('Could not extract valid JSON structure from response');
  }

  private buildEnhancedPrompt(request: EnhancedItineraryRequest, hotelRecommendations: any[] | null = null): string {
    // Validate and calculate duration safely
    const startDateObj = new Date(request.startDate);
    const endDateObj = new Date(request.endDate);
    
    // Check if dates are valid
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error(`Invalid date format - startDate: ${request.startDate}, endDate: ${request.endDate}`);
    }
    
    const duration = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // Ensure duration is positive
    if (duration <= 0) {
      throw new Error(`Invalid duration: end date must be after start date - startDate: ${request.startDate}, endDate: ${request.endDate}`);
    }
    
    return `Create a detailed, personalized ${duration}-day travel itinerary for ${request.destination} in valid JSON format.

TRIP REQUIREMENTS:
- Destination: ${request.destination}
- Duration: ${duration} days (${request.startDate} to ${request.endDate})
- Travelers: ${request.travelers} people
- Budget Level: ${request.budget}
- Travel Style: ${request.travelStyle || 'cultural'}
- Accommodation: ${request.accommodationType || 'hotel'}
- Group Type: ${request.groupType || 'friends'}
- Fitness Level: ${request.fitnessLevel || 'moderate'}
- Interests: ${request.interests?.join(', ') || 'general sightseeing'}
${request.includeFlight ? `- Include Flights: Yes, from ${request.flightSource}` : '- Include Flights: No'}
${request.dietaryRestrictions?.length ? `- Dietary Restrictions: ${request.dietaryRestrictions.join(', ')}` : ''}

BUDGET CONTEXT:
${request.hotelBudget ? `- Hotel Budget: Budget ₹${request.hotelBudget.budget}, Mid-range ₹${request.hotelBudget.midRange}, Luxury ₹${request.hotelBudget.luxury} per night` : ''}
${request.flightBudget ? `- Flight Budget: Outbound ₹${request.flightBudget.outbound}, Return ₹${request.flightBudget.return}` : ''}

${hotelRecommendations ? `RECOMMENDED HOTELS (Use these actual hotels from Google Hotels):
${hotelRecommendations.map((hotel, index) => 
`${index + 1}. ${hotel.name}
   - Rating: ${hotel.rating ? hotel.rating + '/5' : 'N/A'}
   - Price: ₹${hotel.pricePerNight}/night (Total: ₹${hotel.totalPrice})
   - Location: ${hotel.location}
   - Class: ${hotel.hotelClass ? hotel.hotelClass + ' star' : 'Standard'}
   - Top Amenities: ${hotel.amenities.join(', ') || 'Basic amenities'}`
).join('\n\n')}` : ''}

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:

{
  "destination": "${request.destination}",
  "duration": ${duration},
  "overview": "Compelling 2-3 sentence overview highlighting unique experiences",
  "highlights": ["4-5 unique highlights that make this itinerary special"],
  "days": [${Array.from({ length: duration }, (_, i) => {
    const dayDate = new Date(request.startDate);
    dayDate.setDate(dayDate.getDate() + i);
    return `
    {
      "day": ${i + 1},
      "date": "${dayDate.toISOString().split('T')[0]}",
      "theme": "Day ${i + 1} theme based on ${request.travelStyle} style",
      "activities": [
        {
          "time": "09:00",
          "title": "Specific morning activity for ${request.destination}",
          "description": "Detailed description with why it's special",
          "location": "Exact location with area/district",
          "duration": "2-3 hours",
          "estimatedCost": ${request.budget === 'luxury' ? 1200 : request.budget === 'mid-range' ? 800 : 400},
          "category": "sightseeing",
          "tips": ["Practical tip", "Insider tip", "Photo tip"]
        },
        {
          "time": "14:00", 
          "title": "Afternoon activity name",
          "description": "Engaging afternoon activity",
          "location": "Different area of ${request.destination}",
          "duration": "3-4 hours",
          "estimatedCost": ${request.budget === 'luxury' ? 1500 : request.budget === 'mid-range' ? 1000 : 500},
          "category": "activity",
          "tips": ["What to expect", "When to go", "What to bring"]
        }
      ],
      "meals": [
        {
          "time": "12:30",
          "restaurant": "Specific local restaurant name",
          "cuisine": "Local/regional cuisine",
          "estimatedCost": ${request.budget === 'luxury' ? 1200 : request.budget === 'mid-range' ? 800 : 400},
          "speciality": "Must-try signature dish"
        },
        {
          "time": "19:30",
          "restaurant": "Evening restaurant name", 
          "cuisine": "Different cuisine type",
          "estimatedCost": ${request.budget === 'luxury' ? 1800 : request.budget === 'mid-range' ? 1200 : 600},
          "speciality": "Local specialty dish"
        }
      ],
      "estimatedDailyCost": ${request.budget === 'luxury' ? 8000 : request.budget === 'mid-range' ? 5000 : 3000}
    }`;
  }).join(',')}
  ],
  "transportation": {
    ${request.includeFlight ? `"flights": {
      "outbound": {
        "estimatedCost": ${request.flightBudget?.outbound || 8000},
        "tips": ["Book 2-3 weeks in advance", "Early flights are cheaper", "Check for connecting flights"]
      },
      "return": {
        "estimatedCost": ${request.flightBudget?.return || 7000}, 
        "tips": ["Evening flights have availability", "Flexible dates save money", "Package deals available"]
      }
    },` : ''}
    "local": {
      "recommendations": ["Best transport for ${request.destination}", "Recommended apps", "Cost-saving tips"],
      "estimatedDailyCost": ${request.budget === 'luxury' ? 800 : request.budget === 'mid-range' ? 500 : 300}
    }
  },
  "accommodation": {
    "type": "${request.accommodationType || 'hotel'}",
    "recommendations": [
      ${hotelRecommendations ? hotelRecommendations.map(hotel => `{
        "name": "${hotel.name.replace(/"/g, '\\"')}",
        "area": "${hotel.location.replace(/"/g, '\\"')}",
        "estimatedCostPerNight": ${hotel.pricePerNight || (request.hotelBudget ? request.hotelBudget[request.budget.replace('-', '') as keyof typeof request.hotelBudget] || 3500 : 3500)},
        "rating": ${hotel.rating || 4.0},
        "amenities": [${hotel.amenities.map((a: string) => `"${a}"`).join(', ')}],
        "reason": "Highly rated ${hotel.hotelClass ? hotel.hotelClass + '-star' : ''} hotel perfect for ${request.travelStyle} travelers"
      }`).join(',\n      ') : `{
        "name": "Recommended ${request.accommodationType || 'hotel'} in ${request.destination}",
        "area": "Central ${request.destination}",
        "estimatedCostPerNight": ${request.hotelBudget ? request.hotelBudget[request.budget.replace('-', '') as keyof typeof request.hotelBudget] || 3500 : 3500},
        "amenities": ["WiFi", "Breakfast", "Pool", "Spa"],
        "reason": "Perfect for ${request.travelStyle} travelers"
      }`}
    ]
  },
  "budgetBreakdown": {
    ${request.includeFlight ? `"flights": ${(request.flightBudget?.outbound || 8000) + (request.flightBudget?.return || 7000)},` : ''}
    "accommodation": ${(request.hotelBudget ? request.hotelBudget[request.budget.replace('-', '') as keyof typeof request.hotelBudget] || 3500 : 3500) * duration},
    "activities": ${duration * (request.budget === 'luxury' ? 3000 : request.budget === 'mid-range' ? 2000 : 1200)},
    "food": ${duration * (request.budget === 'luxury' ? 2500 : request.budget === 'mid-range' ? 1800 : 1000)},
    "transportation": ${duration * (request.budget === 'luxury' ? 800 : request.budget === 'mid-range' ? 500 : 300)},
    "miscellaneous": ${duration * (request.budget === 'luxury' ? 1500 : request.budget === 'mid-range' ? 1000 : 500)},
    "total": 0
  },
  "tips": {
    "general": ["Essential tips for ${request.destination}", "Best visiting times", "Cultural etiquette", "What to pack"],
    "budgetSaving": ["Money-saving tips", "Affordable dining", "Free activities", "Transport savings"],
    "cultural": ["Cultural norms", "Local customs", "Dress codes", "Common phrases"],
    "safety": ["Safety precautions", "Areas to avoid", "Emergency contacts", "Health considerations"]
  },
  "bestTimeToVisit": {
    "weather": "Weather information for travel dates",
    "crowds": "Expected crowd levels",
    "prices": "Seasonal pricing patterns"
  }
}

REQUIREMENTS:
- All costs in Indian Rupees (₹) for ${request.travelers} travelers
- Authentic, specific activities for ${request.destination}
- Include ${request.interests?.join(', ') || 'general sightseeing'} interests
- Match ${request.budget} budget level
- Consider ${request.groupType} group dynamic
- Respect ${request.fitnessLevel} fitness level
- Include practical, actionable tips
- Calculate accurate budget breakdown total
- Logical daily timing and flow
${hotelRecommendations ? '- IMPORTANT: Use the exact hotel names and pricing provided in the RECOMMENDED HOTELS section' : ''}
${request.dietaryRestrictions?.length ? `- Consider dietary restrictions: ${request.dietaryRestrictions.join(', ')}` : ''}

CRITICAL JSON FORMATTING RULES:
- Return ONLY the JSON object, no other text
- Use double quotes for all strings
- No trailing commas after array/object elements
- Ensure all JSON brackets and braces are properly matched
- Numbers should not be quoted
- Boolean values should be true/false (not quoted)
- Escape special characters in strings (quotes, newlines, etc.)
- The response must be valid for JSON.parse()

Return the JSON now:`;
  }

  private validateAndProcessEnhancedItinerary(itinerary: any, request: EnhancedItineraryRequest): GeneratedItinerary {
    // Ensure required fields exist
    if (!itinerary.destination || !itinerary.days || !Array.isArray(itinerary.days)) {
      console.log('Invalid itinerary format, using fallback');
      return this.generateFallbackItinerary(request);
    }

    // Calculate total budget if not provided
    if (itinerary.budgetBreakdown && !itinerary.budgetBreakdown.total) {
      const breakdown = itinerary.budgetBreakdown;
      itinerary.budgetBreakdown.total = 
        (breakdown.flights || 0) +
        (breakdown.accommodation || 0) +
        (breakdown.activities || 0) +
        (breakdown.food || 0) +
        (breakdown.transportation || 0) +
        (breakdown.miscellaneous || 0);
    }

    // Ensure each day has required fields
    itinerary.days = itinerary.days.map((day: any, index: number) => ({
      day: day.day || index + 1,
      date: day.date || new Date(new Date(request.startDate).getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      theme: day.theme || 'Exploration',
      activities: Array.isArray(day.activities) ? day.activities : [],
      meals: Array.isArray(day.meals) ? day.meals : [],
      estimatedDailyCost: day.estimatedDailyCost || 3000
    }));

    // Ensure required structure exists
    if (!itinerary.transportation) {
      itinerary.transportation = {
        local: {
          recommendations: ['Use local transport', 'Book taxis via apps'],
          estimatedDailyCost: 500
        }
      };
    }

    if (!itinerary.accommodation) {
      itinerary.accommodation = {
        type: request.accommodationType || 'hotel',
        recommendations: [{
          name: `Recommended ${request.accommodationType || 'hotel'}`,
          area: request.destination,
          estimatedCostPerNight: 3500,
          amenities: ['WiFi', 'Breakfast'],
          reason: 'Good location and amenities'
        }]
      };
    }

    if (!itinerary.tips) {
      itinerary.tips = {
        general: [`Visit ${request.destination} during optimal times`],
        budgetSaving: ['Use public transport', 'Eat at local places'],
        cultural: ['Respect local customs'],
        safety: ['Stay aware of surroundings']
      };
    }

    return itinerary as GeneratedItinerary;
  }

  private generateFallbackItinerary(request: EnhancedItineraryRequest): GeneratedItinerary {
    console.log('Generating fallback itinerary with template...');
    
    const days = this.calculateTripDays(request.startDate, request.endDate);
    const dailyBudget = this.calculateDailyBudget(request.budget || 'mid-range', days);
    const totalBudget = dailyBudget * days;
    
    return {
      destination: request.destination,
      duration: days,
      overview: `A ${days}-day ${request.travelStyle || 'cultural'} trip to ${request.destination} designed for ${request.travelers} travelers. This itinerary offers a perfect blend of sightseeing, cultural experiences, and relaxation within your ${request.budget || 'mid-range'} budget.`,
      highlights: [
        `Experience the best of ${request.destination}`,
        `Authentic local cuisine and cultural immersion`,
        `Comfortable ${request.accommodationType || 'hotel'} accommodation`,
        `Flexible itinerary suitable for ${request.groupType || 'travelers'}`
      ],
      days: this.generateFallbackDays(request, days, dailyBudget),
      transportation: this.generateFallbackTransportationInfo(request, totalBudget),
      accommodation: this.generateFallbackAccommodationInfo(request, days),
      budgetBreakdown: this.generateBudgetBreakdown(request, totalBudget, days),
      tips: {
        general: [
          `Best time to visit ${request.destination} varies by season`,
          `Book accommodations and flights in advance for better rates`,
          `Learn basic local phrases to enhance your experience`,
          `Keep digital and physical copies of important documents`
        ],
        budgetSaving: [
          'Use public transportation when possible',
          'Eat at local restaurants rather than tourist spots',
          'Look for free walking tours and activities',
          'Book combo tickets for multiple attractions'
        ],
        cultural: [
          'Respect local customs and dress codes',
          'Try traditional foods and local specialties',
          'Visit during local festivals for authentic experiences',
          'Engage with locals to learn about their culture'
        ],
        safety: [
          'Register with your embassy if traveling internationally',
          'Keep emergency contacts readily available',
          'Stay aware of your surroundings in crowded areas',
          'Consider travel insurance for peace of mind'
        ]
      },
      bestTimeToVisit: {
        weather: 'Check seasonal weather patterns for optimal travel conditions',
        crowds: 'Consider shoulder seasons for fewer crowds and better prices',
        prices: 'Monitor flight and accommodation prices for the best deals'
      }
    };
  }

  // All the helper methods remain the same as in Gemini service
  private generateFallbackDays(request: EnhancedItineraryRequest, days: number, dailyBudget: number) {
    const dayPlans = [];
    
    for (let day = 1; day <= days; day++) {
      const date = this.addDays(new Date(request.startDate), day - 1);
      dayPlans.push({
        day,
        date: date.toISOString().split('T')[0],
        theme: this.getDayTheme(day, request.travelStyle || 'cultural'),
        activities: [
          {
            time: '09:00',
            title: `Morning Exploration in ${request.destination}`,
            description: `Start your day exploring the main attractions and landmarks of ${request.destination}.`,
            location: `Central ${request.destination}`,
            duration: '3 hours',
            estimatedCost: Math.round(dailyBudget * 0.25),
            category: 'sightseeing' as const,
            tips: ['Arrive early to avoid crowds', 'Bring comfortable walking shoes', 'Don\'t forget your camera']
          },
          {
            time: '14:00',
            title: 'Cultural Experience',
            description: 'Immerse yourself in local culture through museums, markets, or cultural sites.',
            location: `Cultural district, ${request.destination}`,
            duration: '4 hours',
            estimatedCost: Math.round(dailyBudget * 0.3),
            category: 'activity' as const,
            tips: ['Check for guided tours', 'Respect photography rules', 'Engage with local guides']
          }
        ],
        meals: [
          {
            time: '12:30',
            restaurant: 'Local Restaurant',
            cuisine: 'Local',
            estimatedCost: Math.round(dailyBudget * 0.15),
            speciality: 'Regional specialties'
          },
          {
            time: '19:30',
            restaurant: 'Dinner Venue',
            cuisine: 'Local',
            estimatedCost: Math.round(dailyBudget * 0.25),
            speciality: 'Traditional dishes'
          }
        ],
        estimatedDailyCost: dailyBudget
      });
    }
    
    return dayPlans;
  }
  
  private generateFallbackTransportationInfo(request: EnhancedItineraryRequest, totalBudget: number) {
    const result: any = {
      local: {
        recommendations: [
          'Use official taxi services or reputable ride-sharing apps',
          'Consider daily/weekly public transport passes for savings',
          'Walk when possible to experience the city authentically'
        ],
        estimatedDailyCost: Math.round(totalBudget * 0.1 / this.calculateTripDays(request.startDate, request.endDate))
      }
    };
    
    if (request.includeFlight) {
      const flightCost = request.flightBudget ? 
        (request.flightBudget.outbound + request.flightBudget.return) :
        this.estimateFlightCost(request);
        
      result.flights = {
        outbound: {
          estimatedCost: Math.round(flightCost * 0.5),
          tips: [
            'Book in advance for better rates',
            'Check baggage allowances',
            'Arrive at airport 2-3 hours early for international flights'
          ]
        },
        return: {
          estimatedCost: Math.round(flightCost * 0.5),
          tips: [
            'Confirm return flight 24 hours before departure',
            'Check visa/passport validity',
            'Leave time for airport shopping'
          ]
        }
      };
    }
    
    return result;
  }
  
  private generateFallbackAccommodationInfo(request: EnhancedItineraryRequest, days: number) {
    return {
      type: request.accommodationType || 'hotel',
      recommendations: [
        {
          name: `Recommended ${(request.accommodationType || 'hotel').charAt(0).toUpperCase() + (request.accommodationType || 'hotel').slice(1)}`,
          area: `Central ${request.destination}`,
          estimatedCostPerNight: this.getBaseCostForAccommodation(request.budget || 'mid-range', request.accommodationType || 'hotel'),
          amenities: ['WiFi', 'Breakfast', 'Room Service'],
          reason: `Perfect for ${request.groupType || 'travelers'} seeking comfortable accommodation`
        }
      ]
    };
  }
  
  private generateBudgetBreakdown(request: EnhancedItineraryRequest, totalBudget: number, days: number) {
    const accommodation = Math.round(totalBudget * 0.35);
    const food = Math.round(totalBudget * 0.25);
    const activities = Math.round(totalBudget * 0.2);
    const transportation = Math.round(totalBudget * 0.1);
    const miscellaneous = Math.round(totalBudget * 0.1);
    const flights = request.includeFlight ? 
      (request.flightBudget ? (request.flightBudget.outbound + request.flightBudget.return) : this.estimateFlightCost(request)) : 
      0;
    
    const result: any = {
      accommodation,
      activities,
      food,
      transportation,
      miscellaneous,
      total: totalBudget + flights
    };
    
    if (flights > 0) {
      result.flights = flights;
    }
    
    return result;
  }

  // Helper methods
  private getDayTheme(day: number, style: string): string {
    const themes = {
      cultural: ['Cultural Exploration', 'Historical Sites', 'Art & Museums', 'Local Heritage'],
      adventure: ['Adventure Activities', 'Outdoor Exploration', 'Nature & Wildlife', 'Sports & Recreation'],
      relaxed: ['Leisure & Relaxation', 'Scenic Views', 'Wellness Activities', 'Gentle Exploration'],
      family: ['Family Fun', 'Kid-Friendly Activities', 'Educational Experiences', 'Entertainment'],
      business: ['Business Meetings', 'Networking', 'Professional Tours', 'Corporate Activities']
    };
    
    const styleThemes = themes[style as keyof typeof themes] || themes.cultural;
    return styleThemes[(day - 1) % styleThemes.length];
  }
  
  private calculateTripDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  private calculateDailyBudget(budgetType: string, days: number): number {
    const totalBudget = this.calculateTotalBudget(budgetType, days);
    return Math.round(totalBudget / days);
  }
  
  private calculateTotalBudget(budgetType: string, days: number): number {
    const baseBudgets = {
      budget: 3000,
      'mid-range': 6000,
      luxury: 12000
    };
    
    return (baseBudgets[budgetType as keyof typeof baseBudgets] || baseBudgets['mid-range']) * days;
  }
  
  private getBaseCostForAccommodation(budget: string, type: string): number {
    const costs = {
      budget: { hostel: 800, hotel: 1500, apartment: 1200, resort: 2000 },
      'mid-range': { hostel: 1500, hotel: 3000, apartment: 2500, resort: 4000 },
      luxury: { hostel: 2500, hotel: 6000, apartment: 5000, resort: 8000 }
    };
    
    return costs[budget as keyof typeof costs]?.[type as keyof typeof costs.budget] || 2500;
  }
  
  private estimateFlightCost(request: EnhancedItineraryRequest): number {
    return request.budget === 'luxury' ? 25000 : request.budget === 'mid-range' ? 15000 : 8000;
  }
  
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Legacy method for backward compatibility
  async generateItinerary(request: ItineraryRequest): Promise<AIItineraryResponse> {
    try {
      const enhancedRequest: EnhancedItineraryRequest = {
        ...request,
        includeFlight: false,
        groupType: 'friends',
        fitnessLevel: 'moderate',
        dietaryRestrictions: []
      };

      const enhancedItinerary = await this.generateEnhancedItinerary(enhancedRequest);
      
      // Convert to legacy format
      const legacyItinerary: Itinerary = {
        id: `itinerary-${Date.now()}`,
        destination: enhancedItinerary.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        duration: enhancedItinerary.duration,
        totalCost: enhancedItinerary.budgetBreakdown.total,
        days: enhancedItinerary.days.map((day, index) => ({
          day: day.day,
          date: day.date,
          activities: day.activities.map((activity, actIndex) => ({
            id: `activity-${index}-${actIndex}`,
            name: activity.title,
            description: activity.description,
            location: activity.location,
            duration: activity.duration,
            cost: activity.estimatedCost,
            category: activity.category as any,
            timeSlot: 'morning' as const,
            tips: activity.tips
          })),
          meals: day.meals.map((meal, mealIndex) => ({
            id: `meal-${index}-${mealIndex}`,
            name: meal.speciality,
            restaurant: meal.restaurant,
            cuisine: meal.cuisine,
            location: meal.restaurant,
            cost: meal.estimatedCost,
            mealType: 'lunch' as const
          })),
          accommodation: {
            id: `accommodation-${index}`,
            name: enhancedItinerary.accommodation.recommendations[0]?.name || 'Hotel',
            type: enhancedItinerary.accommodation.type,
            location: enhancedItinerary.accommodation.recommendations[0]?.area || request.destination,
            checkIn: day.date,
            checkOut: day.date,
            cost: enhancedItinerary.accommodation.recommendations[0]?.estimatedCostPerNight || 3000,
            rating: 4.0,
            amenities: enhancedItinerary.accommodation.recommendations[0]?.amenities || ['WiFi']
          },
          transportation: [{
            id: `transport-${index}`,
            type: 'taxi' as const,
            from: request.destination,
            to: request.destination,
            departure: '09:00',
            arrival: '18:00',
            cost: enhancedItinerary.transportation.local.estimatedDailyCost,
            duration: '9 hours',
            provider: 'Local Transport'
          }],
          estimatedCost: day.estimatedDailyCost
        })) as ItineraryDay[],
        summary: {
          highlights: enhancedItinerary.highlights,
          totalActivities: enhancedItinerary.days.reduce((sum, day) => sum + day.activities.length, 0),
          totalMeals: enhancedItinerary.days.reduce((sum, day) => sum + day.meals.length, 0),
          avgDailyCost: Math.round(enhancedItinerary.budgetBreakdown.total / enhancedItinerary.duration),
          weatherInfo: {
            temperature: '25-30°C',
            conditions: 'Pleasant',
            recommendation: 'Light clothes'
          }
        },
        tips: enhancedItinerary.tips.general,
        emergencyInfo: {
          hospitals: ['City General Hospital', 'District Medical Center'],
          emergencyNumbers: ['100 (Police)', '101 (Fire)', '108 (Ambulance)']
        }
      };

      return {
        success: true,
        itinerary: legacyItinerary
      };
    } catch (error) {
      console.error('Perplexity API error:', error);
      return {
        success: false,
        error: 'Failed to generate itinerary with Perplexity',
        suggestions: ['Please try again or contact support']
      };
    }
  }
}

export const perplexityItineraryService = new PerplexityItineraryService();
