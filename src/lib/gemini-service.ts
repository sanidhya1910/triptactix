import { GoogleGenerativeAI } from '@google/generative-ai';
import { ItineraryRequest, AIItineraryResponse, Itinerary, ItineraryDay } from '@/types/itinerary';

const genAI = new GoogleGenerativeAI('AIzaSyDNSS6NUH1Ie00L4_IANYajnC7Sw_jN99s');

export class GeminiItineraryService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
