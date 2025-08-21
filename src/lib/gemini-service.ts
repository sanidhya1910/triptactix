import { GoogleGenerativeAI } from '@google/generative-ai';
import { ItineraryRequest, AIItineraryResponse, Itinerary, ItineraryDay } from '@/types/itinerary';

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyDNSS6NUH1Ie00L4_IANYajnC7Sw_jN99s');

export class GeminiItineraryService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Rate limiting tracking
  private static lastRequestTime = 0;
  private static requestCount = 0;
  private static readonly MIN_REQUEST_INTERVAL = 60000; // 1 minute between requests
  private static readonly MAX_REQUESTS_PER_HOUR = 15; // Conservative limit

  async generateEnhancedItinerary(request: EnhancedItineraryRequest): Promise<GeneratedItinerary> {
    try {
      // Check rate limiting
      if (!this.canMakeRequest()) {
        console.log('Rate limit reached, generating fallback itinerary...');
        return this.generateFallbackItinerary(request);
      }

      const prompt = this.buildEnhancedPrompt(request);
      console.log('Generating enhanced itinerary with Gemini...');
      
      // Update rate limiting counters
      this.updateRequestCounters();
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('Raw Gemini response length:', text.length);
      
      // Parse the JSON response
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      
      const jsonString = jsonMatch[1].trim();
      const itinerary = JSON.parse(jsonString);
      
      return this.validateAndProcessEnhancedItinerary(itinerary, request);
      
    } catch (error) {
      console.error('Error generating enhanced itinerary with Gemini:', error);
      
      // Check if it's a rate limit error
      if (this.isRateLimitError(error)) {
        console.log('Rate limit error detected, generating fallback itinerary...');
        return this.generateFallbackItinerary(request);
      }
      
      // For other errors, also provide fallback
      console.log('Gemini error occurred, generating fallback itinerary...');
      return this.generateFallbackItinerary(request);
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - GeminiItineraryService.lastRequestTime;
    
    // Reset hourly counter if an hour has passed
    if (timeSinceLastRequest > 3600000) { // 1 hour
      GeminiItineraryService.requestCount = 0;
    }
    
    // Check if we've exceeded limits
    if (GeminiItineraryService.requestCount >= GeminiItineraryService.MAX_REQUESTS_PER_HOUR) {
      return false;
    }
    
    if (timeSinceLastRequest < GeminiItineraryService.MIN_REQUEST_INTERVAL) {
      return false;
    }
    
    return true;
  }
  
  private updateRequestCounters(): void {
    GeminiItineraryService.lastRequestTime = Date.now();
    GeminiItineraryService.requestCount += 1;
  }
  
  private isRateLimitError(error: any): boolean {
    return error?.message?.includes('429') || 
           error?.message?.includes('Too Many Requests') ||
           error?.message?.includes('Quota exceeded') ||
           error?.message?.includes('RATE_LIMIT_EXCEEDED');
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
          },
          {
            time: '19:00',
            title: 'Evening Leisure',
            description: 'Enjoy the evening atmosphere with local entertainment or relaxation.',
            location: `Entertainment area, ${request.destination}`,
            duration: '2 hours',
            estimatedCost: Math.round(dailyBudget * 0.2),
            category: 'activity' as const,
            tips: ['Perfect time for sunset photos', 'Try local evening snacks', 'Check local event calendars']
          }
        ],
        meals: [
          {
            time: '08:00',
            restaurant: 'Local Breakfast Spot',
            cuisine: 'Local',
            estimatedCost: Math.round(dailyBudget * 0.1),
            speciality: 'Traditional breakfast items'
          },
          {
            time: '13:00',
            restaurant: 'Authentic Local Restaurant',
            cuisine: 'Local',
            estimatedCost: Math.round(dailyBudget * 0.15),
            speciality: 'Regional specialties'
          },
          {
            time: '20:00',
            restaurant: 'Recommended Dinner Venue',
            cuisine: 'Local',
            estimatedCost: Math.round(dailyBudget * 0.25),
            speciality: 'Chef\'s signature dishes'
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
          'Walk when possible to experience the city authentically',
          'Rent bikes if the destination is bike-friendly'
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
    const accommodationType = request.accommodationType || 'hotel';
    const budgetType = request.budget || 'mid-range';
    const costPerNight = this.getBaseCostForAccommodation(budgetType, accommodationType);
    
    return {
      type: accommodationType,
      recommendations: [
        {
          name: `Recommended ${accommodationType.charAt(0).toUpperCase() + accommodationType.slice(1)}`,
          area: `Central ${request.destination}`,
          estimatedCostPerNight: costPerNight,
          amenities: this.getAmenitiesForType(accommodationType, budgetType),
          reason: `Perfect for ${request.groupType || 'travelers'} seeking ${budgetType} accommodation with good location and amenities`
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
  
  private getAmenitiesForType(type: string, budget: string): string[] {
    const baseAmenities = {
      hotel: ['WiFi', 'Room Service', 'Concierge'],
      hostel: ['WiFi', 'Shared Kitchen', 'Common Areas'],
      apartment: ['WiFi', 'Kitchen', 'Living Space'],
      resort: ['WiFi', 'Pool', 'Restaurant', 'Spa Access']
    };
    
    const luxuryExtras = ['Premium Location', 'Premium Amenities', '24/7 Service'];
    const amenities = baseAmenities[type as keyof typeof baseAmenities] || baseAmenities.hotel;
    
    return budget === 'luxury' ? [...amenities, ...luxuryExtras] : amenities;
  }
  
  private estimateFlightCost(request: EnhancedItineraryRequest): number {
    // Basic flight cost estimation
    return request.budget === 'luxury' ? 25000 : request.budget === 'mid-range' ? 15000 : 8000;
  }
  
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private buildEnhancedPrompt(request: EnhancedItineraryRequest): string {
    const duration = Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return `You are an expert travel planner with deep knowledge of ${request.destination}. Create a detailed, personalized itinerary based on the following requirements:

TRIP DETAILS:
- Destination: ${request.destination}
- Duration: ${duration} days (${request.startDate} to ${request.endDate})
- Travelers: ${request.travelers} people
- Budget Level: ${request.budget}
- Interests: ${request.interests?.join(', ')}
- Travel Style: ${request.travelStyle || 'balanced'}
- Accommodation Type: ${request.accommodationType || 'hotel'}
- Group Type: ${request.groupType || 'friends'}
- Fitness Level: ${request.fitnessLevel || 'moderate'}
${request.dietaryRestrictions ? `- Dietary Restrictions: ${request.dietaryRestrictions.join(', ')}` : ''}

FLIGHT & BUDGET INFORMATION:
- Include Flights: ${request.includeFlight ? `Yes, from ${request.flightSource}` : 'No'}
${request.flightBudget ? `- Flight Budget: Outbound ₹${request.flightBudget.outbound}, Return ₹${request.flightBudget.return}` : ''}
${request.hotelBudget ? `- Hotel Budget Range: Budget ₹${request.hotelBudget.budget}, Mid-range ₹${request.hotelBudget.midRange}, Luxury ₹${request.hotelBudget.luxury} per night` : ''}

Please generate a comprehensive itinerary in JSON format. Make sure all prices are in Indian Rupees (₹) and are realistic for ${request.destination}:

\`\`\`json
{
  "destination": "${request.destination}",
  "duration": ${duration},
  "overview": "2-3 sentence compelling overview of the trip highlighting unique experiences",
  "highlights": ["Top 4-5 unique highlights of this itinerary that make it special"],
  "days": [
    ${Array.from({ length: duration }, (_, i) => {
      const dayDate = new Date(request.startDate);
      dayDate.setDate(dayDate.getDate() + i);
      return `{
      "day": ${i + 1},
      "date": "${dayDate.toISOString().split('T')[0]}",
      "theme": "${i === 0 ? 'Arrival & First Impressions' : i === duration - 1 ? 'Final Experiences & Departure' : 'Exploration & Discovery'}",
      "activities": [
        {
          "time": "09:00",
          "title": "Specific Activity Name",
          "description": "Detailed description with why it's special",
          "location": "Exact location with area/district",
          "duration": "2 hours",
          "estimatedCost": ${request.budget === 'luxury' ? '1200' : request.budget === 'mid-range' ? '800' : '400'},
          "category": "sightseeing",
          "tips": ["Practical tip 1", "Insider tip 2", "Best photo spot tip"]
        },
        {
          "time": "14:00",
          "title": "Another Activity",
          "description": "Another engaging activity description",
          "location": "Different area of ${request.destination}",
          "duration": "3 hours",
          "estimatedCost": ${request.budget === 'luxury' ? '1500' : request.budget === 'mid-range' ? '1000' : '500'},
          "category": "activity",
          "tips": ["What to expect", "When to go", "What to bring"]
        }
      ],
      "meals": [
        {
          "time": "12:30",
          "restaurant": "Specific Restaurant Name",
          "cuisine": "Local/Regional cuisine type",
          "estimatedCost": ${request.budget === 'luxury' ? '1200' : request.budget === 'mid-range' ? '800' : '400'},
          "speciality": "Must-try signature dish"
        },
        {
          "time": "19:30",
          "restaurant": "Evening Restaurant Name",
          "cuisine": "Different cuisine type",
          "estimatedCost": ${request.budget === 'luxury' ? '1800' : request.budget === 'mid-range' ? '1200' : '600'},
          "speciality": "Local specialty or unique dish"
        }
      ],
      "estimatedDailyCost": ${request.budget === 'luxury' ? '8000' : request.budget === 'mid-range' ? '5000' : '3000'}
    }`;
    }).join(',\n    ')}
  ],
  "transportation": {
    ${request.includeFlight ? `
    "flights": {
      "outbound": {
        "estimatedCost": ${request.flightBudget?.outbound || 8000},
        "tips": ["Book 2-3 weeks in advance for best prices", "Early morning flights are often cheaper", "Check for connecting flights to save money"]
      },
      "return": {
        "estimatedCost": ${request.flightBudget?.return || 7000},
        "tips": ["Evening flights have better availability", "Consider flexible dates for savings", "Book return with outbound for package deals"]
      }
    },` : ''}
    "local": {
      "recommendations": ["Best local transport options for ${request.destination}", "Apps to use for bookings", "Average costs and routes"],
      "estimatedDailyCost": ${request.budget === 'luxury' ? '800' : request.budget === 'mid-range' ? '500' : '300'}
    }
  },
  "accommodation": {
    "type": "${request.accommodationType || 'hotel'}",
    "recommendations": [
      {
        "name": "Specific Hotel/Place Name 1",
        "area": "Best area in ${request.destination}",
        "estimatedCostPerNight": ${request.hotelBudget ? request.hotelBudget[request.budget.replace('-', '') as keyof typeof request.hotelBudget] || 3500 : 3500},
        "amenities": ["WiFi", "Breakfast", "Pool", "Spa", "Gym"],
        "reason": "Why this is perfect for your ${request.travelStyle} trip style"
      },
      {
        "name": "Alternative Option 2",
        "area": "Different great area",
        "estimatedCostPerNight": ${request.hotelBudget ? request.hotelBudget[request.budget.replace('-', '') as keyof typeof request.hotelBudget] * 0.8 || 2800 : 2800},
        "amenities": ["WiFi", "Restaurant", "24/7 Service"],
        "reason": "Budget-friendly alternative with good location"
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
    "general": [
      "Essential travel tips specific to ${request.destination}",
      "Best time of day to visit popular attractions",
      "Cultural etiquette and customs to respect",
      "What to pack for the ${duration}-day trip"
    ],
    "budgetSaving": [
      "How to save money on ${request.destination} attractions",
      "Best places for affordable meals",
      "Free activities and experiences",
      "Transportation savings tips"
    ],
    "cultural": [
      "Important cultural norms in ${request.destination}",
      "Local customs and traditions to be aware of",
      "Appropriate dress codes for religious sites",
      "Common phrases in local language"
    ],
    "safety": [
      "Safety precautions specific to ${request.destination}",
      "Areas to avoid, especially at night",
      "Emergency contacts and helpful numbers",
      "Health and medical considerations"
    ]
  },
  "bestTimeToVisit": {
    "weather": "Detailed weather information for your travel dates",
    "crowds": "Expected tourist crowd levels during this period",
    "prices": "How pricing typically varies during this season"
  }
}
\`\`\`

IMPORTANT GUIDELINES:
1. Make all activities authentic and specific to ${request.destination}
2. Include realistic costs in Indian Rupees (₹) for ${request.travelers} travelers
3. Balance the ${request.budget} budget level across all recommendations
4. Incorporate ${request.interests?.join(', ')} interests throughout the itinerary
5. Design for ${request.groupType || 'friends'} group dynamic
6. Consider ${request.fitnessLevel || 'moderate'} fitness level for activity intensity
7. Include hidden gems and local insider experiences
8. Provide actionable, practical tips
9. Calculate accurate budget breakdown
10. Make each day flow logically with proper timing
${request.dietaryRestrictions ? `11. Consider dietary restrictions: ${request.dietaryRestrictions.join(', ')}` : ''}

Generate ONLY the JSON response without any additional text.`;
  }

  private validateAndProcessEnhancedItinerary(itinerary: any, request: EnhancedItineraryRequest): GeneratedItinerary {
    // Ensure required fields exist
    if (!itinerary.destination || !itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error('Invalid itinerary format from Gemini');
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
      activities: day.activities || [],
      meals: day.meals || [],
      estimatedDailyCost: day.estimatedDailyCost || 3000
    }));

    return itinerary as GeneratedItinerary;
  }

  // Original methods for backward compatibility
  async generateItinerary(request: ItineraryRequest): Promise<AIItineraryResponse> {
    try {
      const prompt = this.buildPrompt(request);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const itinerary = this.parseGeminiResponse(text, request);
      return {
        success: true,
        itinerary
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to mock data if API fails
      const itinerary = this.generateMockItinerary(request);
      return {
        success: true,
        itinerary,
        suggestions: ['Generated using fallback data due to API unavailability']
      };
    }
  }

  private buildPrompt(request: ItineraryRequest): string {
    const { destination, startDate, endDate, budget, travelers, interests } = request;
    
    const budgetRange = this.getBudgetRange(budget);
    
    return `Create a detailed travel itinerary in JSON format for the following trip:

Destination: ${destination}
Dates: ${startDate} to ${endDate}
Budget: ${budgetRange} (Indian Rupees per person)
Travelers: ${travelers} people
Interests: ${interests?.join(', ') || 'General tourism'}

IMPORTANT: Include realistic flight/train pricing for transportation to reach the destination and local transportation costs. 
Use current Indian market rates for flights, trains, and local transport.

Please provide a comprehensive itinerary with the following JSON structure:

{
  "destination": "${destination}",
  "startDate": "${startDate}",
  "endDate": "${endDate}",
  "duration": duration_in_days,
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "id": "unique_id",
          "name": "Activity Name",
          "description": "Detailed description",
          "location": "Location name",
          "duration": "2 hours",
          "cost": cost_in_rupees_per_person,
          "category": "sightseeing|adventure|cultural|relaxation|shopping|entertainment",
          "timeSlot": "morning|afternoon|evening",
          "tips": ["tip1", "tip2"]
        }
      ],
      "meals": [
        {
          "id": "unique_id",
          "name": "Meal Name",
          "restaurant": "Restaurant Name",
          "cuisine": "Cuisine Type",
          "location": "Restaurant location",
          "cost": cost_in_rupees_per_person,
          "mealType": "breakfast|lunch|dinner|snack"
        }
      ],
      "accommodation": {
        "id": "unique_id",
        "name": "Hotel/Stay Name",
        "type": "Hotel/Resort/Guesthouse",
        "location": "Area name",
        "checkIn": "YYYY-MM-DD",
        "checkOut": "YYYY-MM-DD",
        "cost": cost_per_night_in_rupees,
        "rating": 4.5,
        "amenities": ["amenity1", "amenity2"]
      },
      "transportation": [
        {
          "id": "unique_id",
          "type": "taxi|bus|train|flight|walking",
          "from": "Start location",
          "to": "End location",
          "departure": "HH:MM",
          "arrival": "HH:MM",
          "cost": cost_in_rupees,
          "duration": "X hours",
          "provider": "Service provider"
        }
      ],
      "estimatedCost": total_day_cost_in_rupees
    }
  ],
  "summary": {
    "highlights": ["highlight1", "highlight2", "highlight3"],
    "totalActivities": total_activity_count,
    "totalMeals": total_meal_count,
    "avgDailyCost": average_daily_cost,
    "weatherInfo": {
      "temperature": "temperature range",
      "conditions": "weather description",
      "recommendation": "what to pack"
    }
  },
  "tips": ["general_tip1", "general_tip2", "general_tip3"],
  "emergencyInfo": {
    "hospitals": ["hospital1", "hospital2"],
    "emergencyNumbers": ["100 (Police)", "101 (Fire)", "108 (Ambulance)"]
  }
}

Focus on:
1. Authentic local experiences
2. Cost-effective options within the ${budget} budget range
3. Practical timing and logistics
4. Cultural sensitivity and respect
5. Safety considerations
6. Seasonal recommendations for ${destination}

Make sure all costs are in Indian Rupees (₹) and provide realistic pricing for Indian travelers. Include a mix of must-see attractions, local food experiences, and cultural activities. Calculate total cost based on ${travelers} travelers.`;
  }

  private getBudgetRange(budget: string): string {
    switch (budget) {
      case 'budget':
        return '₹1,000-2,500 per day';
      case 'mid-range':
        return '₹2,500-5,000 per day';
      case 'luxury':
        return '₹5,000-15,000 per day';
      default:
        return '₹2,500-5,000 per day';
    }
  }

  private parseGeminiResponse(text: string, request: ItineraryRequest): Itinerary {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Validate and return the parsed response
        if (this.validateItineraryStructure(parsed)) {
          return {
            id: `itinerary-${Date.now()}`,
            totalCost: this.calculateTotalCost(parsed.days, request.travelers),
            ...parsed
          };
        }
      }
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
    }
    
    // Fallback to mock data if parsing fails
    return this.generateMockItinerary(request);
  }

  private calculateTotalCost(days: ItineraryDay[], travelers: number): number {
    return days.reduce((total, day) => total + (day.estimatedCost * travelers), 0);
  }

  private validateItineraryStructure(data: any): boolean {
    return (
      data &&
      data.destination &&
      data.days &&
      Array.isArray(data.days) &&
      data.summary &&
      data.tips &&
      data.emergencyInfo
    );
  }

  private generateMockItinerary(request: ItineraryRequest): Itinerary {
    const { destination, startDate, endDate, budget, travelers } = request;
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Generate mock data based on popular Indian destinations
    const destinationData = this.getDestinationData(destination);
    const dailyBudget = this.getDailyBudget(budget);
    
    const mockDays: ItineraryDay[] = Array.from({ length: days }, (_, index) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + index);
      
      return {
        day: index + 1,
        date: dayDate.toISOString().split('T')[0],
        activities: destinationData.activities.slice(index * 2, (index * 2) + 2).map((activity, actIndex) => ({
          id: `activity-${index}-${actIndex}`,
          name: activity.title,
          description: activity.description,
          location: activity.location,
          duration: activity.duration,
          cost: Math.floor(activity.cost * travelers),
          category: 'sightseeing' as const,
          timeSlot: 'morning' as const,
          tips: activity.tips
        })),
        meals: destinationData.meals.map((meal, mealIndex) => ({
          id: `meal-${index}-${mealIndex}`,
          name: meal.recommendation,
          restaurant: meal.restaurant,
          cuisine: meal.cuisine,
          location: meal.restaurant,
          cost: Math.floor(meal.cost * travelers),
          mealType: meal.type as 'breakfast' | 'lunch' | 'dinner' | 'snack'
        })),
        accommodation: {
          ...destinationData.accommodation,
          id: `accommodation-${index}`,
          checkIn: dayDate.toISOString().split('T')[0],
          checkOut: new Date(dayDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cost: Math.floor(destinationData.accommodation.cost * Math.ceil(travelers / 2)),
          rating: parseFloat(destinationData.accommodation.rating)
        },
        transportation: [{
          id: `transport-${index}`,
          type: index === 0 ? 'flight' as const : 'taxi' as const,
          from: index === 0 ? 'Delhi' : destination,
          to: destination,
          departure: index === 0 ? '08:00' : '09:00',
          arrival: index === 0 ? '11:30' : '18:00',
          cost: index === 0 ? destinationData.transportation.cost * 8 : destinationData.transportation.cost,
          duration: index === 0 ? '3.5 hours' : '9 hours',
          provider: index === 0 ? 'IndiGo Airlines' : 'Local Transport'
        }],
        estimatedCost: Math.floor(dailyBudget)
      };
    });

    const totalCost = mockDays.reduce((sum, day) => sum + day.estimatedCost, 0);

    return {
      id: `itinerary-${Date.now()}`,
      destination,
      startDate,
      endDate,
      duration: days,
      totalCost,
      days: mockDays,
      summary: {
        highlights: destinationData.highlights,
        totalActivities: mockDays.reduce((sum, day) => sum + day.activities.length, 0),
        totalMeals: mockDays.reduce((sum, day) => sum + day.meals.length, 0),
        avgDailyCost: Math.floor(totalCost / days),
        weatherInfo: destinationData.weather
      },
      tips: destinationData.tips,
      emergencyInfo: {
        hospitals: ['City General Hospital', 'District Medical Center'],
        emergencyNumbers: ['100 (Police)', '101 (Fire)', '108 (Ambulance)']
      }
    };
  }

  private getDailyBudget(budget: string): number {
    switch (budget) {
      case 'budget':
        return 2000;
      case 'mid-range':
        return 4000;
      case 'luxury':
        return 8000;
      default:
        return 4000;
    }
  }

  private getDestinationData(destination: string) {
    const lowerDest = destination.toLowerCase();
    
    if (lowerDest.includes('goa')) {
      return {
        themes: ['Beach & Relaxation', 'Culture & Heritage', 'Adventure & Water Sports', 'Local Markets & Cuisine'],
        activities: [
          {
            time: '09:00',
            title: 'Calangute Beach',
            description: 'Enjoy the golden sands and water sports at one of Goa\'s most popular beaches',
            location: 'Calangute',
            duration: '3 hours',
            cost: 500,
            tips: ['Apply sunscreen regularly', 'Try parasailing or jet skiing']
          },
          {
            time: '14:00',
            title: 'Basilica of Bom Jesus',
            description: 'Visit the UNESCO World Heritage Site and marvel at baroque architecture',
            location: 'Old Goa',
            duration: '2 hours',
            cost: 200,
            tips: ['Dress modestly', 'Photography may be restricted inside']
          },
          {
            time: '10:00',
            title: 'Spice Plantation Tour',
            description: 'Explore organic spice farms and enjoy traditional Goan lunch',
            location: 'Ponda',
            duration: '4 hours',
            cost: 800,
            tips: ['Wear comfortable walking shoes', 'Try the elephant rides']
          },
          {
            time: '16:00',
            title: 'Anjuna Flea Market',
            description: 'Shop for souvenirs, handicrafts, and local products',
            location: 'Anjuna',
            duration: '2 hours',
            cost: 300,
            tips: ['Bargain for better prices', 'Try local street food']
          }
        ],
        meals: [
          {
            type: 'breakfast',
            restaurant: 'Cafe Lilliput',
            cuisine: 'Continental & Goan',
            cost: 400,
            recommendation: 'Goan sausage and eggs, fresh fruit juice'
          },
          {
            type: 'lunch',
            restaurant: 'Fisherman\'s Wharf',
            cuisine: 'Seafood & Goan',
            cost: 800,
            recommendation: 'Fish curry rice, prawns balchão'
          },
          {
            type: 'dinner',
            restaurant: 'Thalassa',
            cuisine: 'Greek & Mediterranean',
            cost: 1200,
            recommendation: 'Grilled seafood platter, Greek salad'
          }
        ],
        accommodation: {
          name: 'Taj Holiday Village Resort & Spa',
          type: 'Beach Resort',
          location: 'Candolim',
          rating: '4.2',
          cost: 3500,
          amenities: ['Beach access', 'Swimming pool', 'Spa', 'Multiple restaurants']
        },
        transportation: {
          mode: 'Rental scooter/taxi',
          cost: 600,
          notes: 'Scooter rentals are popular and convenient for short distances'
        },
        highlights: ['Beautiful beaches', 'Portuguese heritage', 'Vibrant nightlife', 'Delicious seafood'],
        bestTime: 'November to March for pleasant weather',
        weather: {
          temperature: '25-32°C',
          conditions: 'Tropical with moderate humidity',
          recommendation: 'Light cotton clothes, sunscreen, and beach wear'
        },
        language: 'Konkani, Hindi, English',
        timeZone: 'IST (UTC+5:30)',
        tips: [
          'Rent a scooter for easy transportation',
          'Try local feni (cashew liquor) responsibly',
          'Respect local customs and beach rules',
          'Book accommodations in advance during peak season'
        ]
      };
    } else if (lowerDest.includes('kerala')) {
      return {
        themes: ['Backwaters & Houseboats', 'Hill Stations & Tea Gardens', 'Wildlife & Nature', 'Cultural Heritage'],
        activities: [
          {
            time: '09:00',
            title: 'Alleppey Backwater Cruise',
            description: 'Experience the serene backwaters on a traditional houseboat',
            location: 'Alleppey',
            duration: '8 hours',
            cost: 2500,
            tips: ['Book full-day cruise with meals', 'Carry mosquito repellent']
          },
          {
            time: '10:00',
            title: 'Tea Garden Tour',
            description: 'Walk through lush tea plantations and learn about tea processing',
            location: 'Munnar',
            duration: '3 hours',
            cost: 600,
            tips: ['Wear comfortable shoes', 'Best views in early morning']
          },
          {
            time: '06:00',
            title: 'Periyar Wildlife Sanctuary',
            description: 'Spot elephants, tigers, and various birds in their natural habitat',
            location: 'Thekkady',
            duration: '4 hours',
            cost: 800,
            tips: ['Book early morning safari', 'Carry binoculars and camera']
          },
          {
            time: '15:00',
            title: 'Kathakali Performance',
            description: 'Watch traditional Kerala dance drama with elaborate costumes',
            location: 'Kochi',
            duration: '2 hours',
            cost: 400,
            tips: ['Arrive early to see makeup process', 'Learn about mudras beforehand']
          }
        ],
        meals: [
          {
            type: 'breakfast',
            restaurant: 'Dhe Puttu',
            cuisine: 'Traditional Kerala',
            cost: 300,
            recommendation: 'Puttu with kadala curry, appam with stew'
          },
          {
            type: 'lunch',
            restaurant: 'Malabar Junction',
            cuisine: 'Kerala Malabar',
            cost: 700,
            recommendation: 'Karimeen fish curry, kerala parotta'
          },
          {
            type: 'dinner',
            restaurant: 'Kayees Biryani',
            cuisine: 'Malabar Biryani',
            cost: 500,
            recommendation: 'Mutton biryani, haleem'
          }
        ],
        accommodation: {
          name: 'Kumarakom Lake Resort',
          type: 'Lake Resort',
          location: 'Kumarakom',
          rating: '4.5',
          cost: 4500,
          amenities: ['Lake view', 'Ayurvedic spa', 'Traditional architecture', 'Boat rides']
        },
        transportation: {
          mode: 'AC taxi/bus',
          cost: 800,
          notes: 'Book Kerala State Transport buses for budget travel'
        },
        highlights: ['Serene backwaters', 'Spice plantations', 'Ayurvedic treatments', 'Rich cultural heritage'],
        bestTime: 'October to March for comfortable weather',
        weather: {
          temperature: '23-32°C',
          conditions: 'Tropical with high humidity',
          recommendation: 'Light breathable clothes, rain gear during monsoon'
        },
        language: 'Malayalam, Hindi, English',
        timeZone: 'IST (UTC+5:30)',
        tips: [
          'Try authentic Kerala meals on banana leaves',
          'Book houseboat stays in advance',
          'Respect local customs and dress codes',
          'Carry mosquito repellent for backwater areas'
        ]
      };
    } else {
      // Default generic Indian destination
      return {
        themes: ['Cultural Heritage', 'Local Markets', 'Food Discovery', 'Historical Sites'],
        activities: [
          {
            time: '09:00',
            title: 'Historical Monument Visit',
            description: 'Explore the rich history and architecture of local monuments',
            location: destination,
            duration: '3 hours',
            cost: 400,
            tips: ['Hire a local guide', 'Carry water and snacks']
          },
          {
            time: '14:00',
            title: 'Local Market Tour',
            description: 'Experience the vibrant local markets and street food',
            location: destination,
            duration: '2 hours',
            cost: 300,
            tips: ['Bargain for better prices', 'Try local specialties']
          },
          {
            time: '16:00',
            title: 'Cultural Center Visit',
            description: 'Learn about local art, craft, and cultural traditions',
            location: destination,
            duration: '2 hours',
            cost: 250,
            tips: ['Check for live performances', 'Photography may require permission']
          },
          {
            time: '18:00',
            title: 'Sunset Point',
            description: 'Enjoy beautiful sunset views from the best vantage point',
            location: destination,
            duration: '1 hour',
            cost: 100,
            tips: ['Arrive 30 minutes before sunset', 'Carry a camera']
          }
        ],
        meals: [
          {
            type: 'breakfast',
            restaurant: 'Local Cafe',
            cuisine: 'Indian Continental',
            cost: 250,
            recommendation: 'Local breakfast items, fresh juice'
          },
          {
            type: 'lunch',
            restaurant: 'Traditional Restaurant',
            cuisine: 'Regional Indian',
            cost: 450,
            recommendation: 'Regional thali, local specialties'
          },
          {
            type: 'dinner',
            restaurant: 'Popular Eatery',
            cuisine: 'North Indian',
            cost: 600,
            recommendation: 'Dal makhani, butter naan, biryani'
          }
        ],
        accommodation: {
          name: 'Heritage Hotel',
          type: 'Heritage Property',
          location: destination,
          rating: '4.0',
          cost: 2500,
          amenities: ['Traditional architecture', 'Restaurant', 'Room service', 'Wi-Fi']
        },
        transportation: {
          mode: 'Auto rickshaw/taxi',
          cost: 400,
          notes: 'Use app-based cabs for convenient travel'
        },
        highlights: ['Historical architecture', 'Local cuisine', 'Cultural experiences', 'Traditional crafts'],
        bestTime: 'October to March for pleasant weather',
        weather: {
          temperature: '20-30°C',
          conditions: 'Moderate climate',
          recommendation: 'Comfortable cotton clothes, light jacket for evenings'
        },
        language: 'Hindi, English, Local language',
        timeZone: 'IST (UTC+5:30)',
        tips: [
          'Respect local customs and traditions',
          'Try authentic local cuisine',
          'Carry sufficient cash for small vendors',
          'Keep emergency contacts handy'
        ]
      };
    }
  }
}

export const geminiItineraryService = new GeminiItineraryService();
