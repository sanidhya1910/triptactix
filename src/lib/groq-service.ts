import Groq from "groq-sdk";
import { 
  ItineraryRequest, 
  AIItineraryResponse, 
  Itinerary, 
  ItineraryDay 
} from '@/types/itinerary';

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

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export class GroqItineraryService {
  // Rate limiting tracking
  private static lastRequestTime = 0;
  private static requestCount = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
  private static readonly MAX_REQUESTS_PER_MINUTE = 30; // Groq has higher limits

  async generateEnhancedItinerary(request: EnhancedItineraryRequest): Promise<GeneratedItinerary> {
    try {
      // Check rate limiting
      if (!this.canMakeRequest()) {
        console.log('Rate limit reached, generating fallback itinerary...');
        return this.generateFallbackItinerary(request);
      }

      const prompt = this.buildEnhancedPrompt(request);
      console.log('Generating enhanced itinerary with Groq...');
      
      // Update rate limiting counters
      this.updateRequestCounters();
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert travel planner with deep knowledge of destinations worldwide. Always respond with valid JSON format without any additional text or markdown formatting."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant", // Updated to current available model
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1,
        stream: false
      });
      
      const responseText = completion.choices[0]?.message?.content || '';
      console.log('Raw Groq response length:', responseText.length);
      
      // Parse the JSON response
      let itinerary;
      try {
        // Try parsing direct JSON first
        itinerary = JSON.parse(responseText);
      } catch (parseError) {
        // If direct parsing fails, try extracting JSON from markdown or text
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in Groq response');
        }
        const jsonString = jsonMatch[1] || jsonMatch[0];
        itinerary = JSON.parse(jsonString.trim());
      }
      
      return this.validateAndProcessEnhancedItinerary(itinerary, request);
      
    } catch (error) {
      console.error('Error generating enhanced itinerary with Groq:', error);
      
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        console.log('Rate limit error detected, generating fallback itinerary...');
        return this.generateFallbackItinerary(request);
      }
      
      // For other errors, also provide fallback
      console.log('Groq error occurred, generating fallback itinerary...');
      return this.generateFallbackItinerary(request);
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - GroqItineraryService.lastRequestTime;
    
    // Reset minute counter if a minute has passed
    if (timeSinceLastRequest > 60000) { // 1 minute
      GroqItineraryService.requestCount = 0;
    }
    
    // Check if we've exceeded limits
    if (GroqItineraryService.requestCount >= GroqItineraryService.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    if (timeSinceLastRequest < GroqItineraryService.MIN_REQUEST_INTERVAL) {
      return false;
    }
    
    return true;
  }
  
  private updateRequestCounters(): void {
    GroqItineraryService.lastRequestTime = Date.now();
    GroqItineraryService.requestCount += 1;
  }
  
  private isRateLimitError(error: any): boolean {
    return error?.message?.includes('429') || 
           error?.message?.includes('Too Many Requests') ||
           error?.message?.includes('rate limit') ||
           error?.message?.includes('RATE_LIMIT_EXCEEDED') ||
           error?.status === 429;
  }

  private buildEnhancedPrompt(request: EnhancedItineraryRequest): string {
    const duration = Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24));
    
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
      {
        "name": "Specific ${request.accommodationType || 'hotel'} name 1",
        "area": "Best area in ${request.destination}",
        "estimatedCostPerNight": ${request.hotelBudget ? request.hotelBudget[request.budget.replace('-', '') as keyof typeof request.hotelBudget] || 3500 : 3500},
        "amenities": ["WiFi", "Breakfast", "Pool", "Spa"],
        "reason": "Perfect for ${request.travelStyle} travelers"
      }
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
- Include ${request.interests?.join(', ')} interests
- Match ${request.budget} budget level
- Consider ${request.groupType} group dynamic
- Respect ${request.fitnessLevel} fitness level
- Include practical, actionable tips
- Calculate accurate budget breakdown total
- Logical daily timing and flow
${request.dietaryRestrictions?.length ? `- Consider dietary restrictions: ${request.dietaryRestrictions.join(', ')}` : ''}

Return only valid JSON without any markdown formatting or additional text.`;
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
      console.error('Groq API error:', error);
      return {
        success: false,
        error: 'Failed to generate itinerary with Groq',
        suggestions: ['Please try again or contact support']
      };
    }
  }
}

export const groqItineraryService = new GroqItineraryService();
