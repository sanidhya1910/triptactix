/**
 * Flight Price Prediction Service
 * Based on Random Forest ML model approach
 */

export interface FlightFeatures {
  airline: number;
  sourceCity: number; 
  destinationCity: number;
  departureTime: number;
  arrivalTime: number;
  stops: number;
  class: number;
  advance_booking_days: number;
  is_weekend: number;
  season: number;
}

export interface PricePredictionResult {
  predictedPrice: number;
  confidence: number;
  priceRange: {
    min: number;
    max: number;
  };
  recommendation: 'book_now' | 'wait' | 'monitor';
  factors: string[];
}

export class FlightPriceMLService {
  // Airline encodings (Indian airlines)
  private static readonly AIRLINES = {
    'IndiGo': 1,
    'SpiceJet': 2, 
    'Air India': 3,
    'Vistara': 4,
    'AirAsia India': 5,
    'Akasa Air': 6,
    'Alliance Air': 7
  };

  // City encodings (major Indian cities)
  private static readonly CITIES = {
    'Delhi': 1,
    'Mumbai': 2,
    'Bangalore': 3,
    'Kolkata': 4,
    'Chennai': 5,
    'Hyderabad': 6,
    'Pune': 7,
    'Ahmedabad': 8,
    'Kochi': 9,
    'Goa': 10,
    'Jaipur': 11,
    'Lucknow': 12
  };

  // Time slot encodings
  private static readonly TIME_SLOTS = {
    'early_morning': 1,  // 6-9 AM
    'morning': 2,        // 9-12 PM  
    'afternoon': 3,      // 12-6 PM
    'evening': 4,        // 6-9 PM
    'night': 5,          // 9-12 AM
    'late_night': 6      // 12-6 AM
  };

  // Travel class encodings
  private static readonly TRAVEL_CLASS = {
    'economy': 1,
    'premium_economy': 2,
    'business': 3,
    'first': 4
  };

  /**
   * Encode flight search parameters into ML features
   */
  static encodeFlightFeatures(params: {
    airline: string;
    from: string;
    to: string;
    departureDate: string;
    departureTime?: string;
    arrivalTime?: string;
    stops: number;
    class: string;
  }): FlightFeatures {
    
    const departureDate = new Date(params.departureDate);
    const bookingDate = new Date();
    const advanceBookingDays = Math.floor(
      (departureDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine season (for Indian context)
    const month = departureDate.getMonth() + 1;
    let season = 1; // Summer
    if (month >= 12 || month <= 2) season = 2; // Winter
    else if (month >= 6 && month <= 9) season = 3; // Monsoon
    else if (month >= 3 && month <= 5) season = 4; // Pre-monsoon

    // Check if weekend
    const isWeekend = departureDate.getDay() === 0 || departureDate.getDay() === 6 ? 1 : 0;

    // Get time slot from departure time or estimate
    let departureTimeSlot = 3; // Default afternoon
    if (params.departureTime) {
      const hour = parseInt(params.departureTime.split(':')[0]);
      if (hour >= 6 && hour < 9) departureTimeSlot = 1;
      else if (hour >= 9 && hour < 12) departureTimeSlot = 2;
      else if (hour >= 12 && hour < 18) departureTimeSlot = 3;
      else if (hour >= 18 && hour < 21) departureTimeSlot = 4;
      else if (hour >= 21 || hour < 6) departureTimeSlot = 5;
    }

    let arrivalTimeSlot = departureTimeSlot + 1;
    if (params.arrivalTime) {
      const hour = parseInt(params.arrivalTime.split(':')[0]);
      if (hour >= 6 && hour < 9) arrivalTimeSlot = 1;
      else if (hour >= 9 && hour < 12) arrivalTimeSlot = 2;
      else if (hour >= 12 && hour < 18) arrivalTimeSlot = 3;
      else if (hour >= 18 && hour < 21) arrivalTimeSlot = 4;
      else if (hour >= 21 || hour < 6) arrivalTimeSlot = 5;
    }

    return {
      airline: this.AIRLINES[params.airline as keyof typeof this.AIRLINES] || 1,
      sourceCity: this.CITIES[params.from as keyof typeof this.CITIES] || 1,
      destinationCity: this.CITIES[params.to as keyof typeof this.CITIES] || 2,
      departureTime: departureTimeSlot,
      arrivalTime: arrivalTimeSlot,
      stops: Math.min(params.stops, 2), // 0, 1, or 2+
      class: this.TRAVEL_CLASS[params.class as keyof typeof this.TRAVEL_CLASS] || 1,
      advance_booking_days: Math.max(0, Math.min(advanceBookingDays, 365)),
      is_weekend: isWeekend,
      season: season
    };
  }

  /**
   * Predict flight price using rule-based ML simulation
   * (In production, this would call a trained RandomForest model)
   */
  static predictPrice(features: FlightFeatures): PricePredictionResult {
    // Base price calculation (simulating RandomForest decision trees)
    let basePrice = 3000; // Base price in INR

    // Airline pricing factors
    const airlineFactor = [1.0, 0.85, 1.2, 1.15, 0.9, 0.8, 1.1][features.airline - 1] || 1.0;
    basePrice *= airlineFactor;

    // Route distance/popularity factor (simplified)
    const routeFactor = this.getRoutePricingFactor(features.sourceCity, features.destinationCity);
    basePrice *= routeFactor;

    // Time slot factors
    const timeFactors = [0.8, 1.0, 1.1, 1.2, 0.9, 0.7]; // Early morning cheapest, evening most expensive
    const timeFactor = timeFactors[features.departureTime - 1] || 1.0;
    basePrice *= timeFactor;

    // Stops factor
    const stopFactors = [1.0, 0.85, 0.75]; // Direct flights cost more
    const stopFactor = stopFactors[features.stops] || 0.7;
    basePrice *= stopFactor;

    // Class factor
    const classFactors = [1.0, 1.5, 2.5, 4.0];
    const classFactor = classFactors[features.class - 1] || 1.0;
    basePrice *= classFactor;

    // Advance booking factor (sweet spot around 30-60 days)
    let bookingFactor = 1.0;
    if (features.advance_booking_days < 7) bookingFactor = 1.4; // Last minute premium
    else if (features.advance_booking_days < 14) bookingFactor = 1.2;
    else if (features.advance_booking_days >= 30 && features.advance_booking_days <= 60) bookingFactor = 0.9; // Best prices
    else if (features.advance_booking_days > 180) bookingFactor = 1.1; // Too early
    basePrice *= bookingFactor;

    // Weekend factor
    if (features.is_weekend) basePrice *= 1.15;

    // Season factor
    const seasonFactors = [1.1, 1.2, 0.9, 1.0]; // Summer, Winter, Monsoon, Pre-monsoon
    const seasonFactor = seasonFactors[features.season - 1] || 1.0;
    basePrice *= seasonFactor;

    // Add some randomness (market volatility)
    const volatility = 0.85 + Math.random() * 0.3; // ±15% variation
    basePrice *= volatility;

    const predictedPrice = Math.round(basePrice);
    const confidence = 0.75 + Math.random() * 0.2; // 75-95% confidence

    // Price range (±20%)
    const priceRange = {
      min: Math.round(predictedPrice * 0.8),
      max: Math.round(predictedPrice * 1.2)
    };

    // Generate recommendation
    const recommendation = this.generateRecommendation(features, predictedPrice, confidence);

    // Generate factors explanation
    const factors = this.generatePricingFactors(features, airlineFactor, timeFactor, bookingFactor);

    return {
      predictedPrice,
      confidence: Math.round(confidence * 100) / 100,
      priceRange,
      recommendation,
      factors
    };
  }

  /**
   * Get route-specific pricing factor
   */
  private static getRoutePricingFactor(sourceCity: number, destCity: number): number {
    // Popular routes (Delhi-Mumbai, Bangalore-Delhi, etc.) have more competition
    const popularRoutes = [
      [1, 2], [2, 1], // Delhi-Mumbai
      [1, 3], [3, 1], // Delhi-Bangalore  
      [2, 3], [3, 2], // Mumbai-Bangalore
      [1, 5], [5, 1], // Delhi-Chennai
      [2, 5], [5, 2], // Mumbai-Chennai
    ];

    const isPopular = popularRoutes.some(route => 
      (route[0] === sourceCity && route[1] === destCity) ||
      (route[1] === sourceCity && route[0] === destCity)
    );

    return isPopular ? 0.9 : 1.1; // Popular routes are cheaper due to competition
  }

  /**
   * Generate booking recommendation
   */
  private static generateRecommendation(
    features: FlightFeatures, 
    predictedPrice: number, 
    confidence: number
  ): 'book_now' | 'wait' | 'monitor' {
    
    // Book now if: very close to departure, weekend travel, or high confidence low price
    if (features.advance_booking_days < 7 || 
        (features.is_weekend && features.advance_booking_days < 14) ||
        (confidence > 0.85 && predictedPrice < 4000)) {
      return 'book_now';
    }

    // Wait if: too early booking, low confidence, or high price season
    if (features.advance_booking_days > 120 || 
        confidence < 0.7 || 
        features.season === 2) { // Winter peak season
      return 'wait';
    }

    return 'monitor';
  }

  /**
   * Generate explanation of pricing factors
   */
  private static generatePricingFactors(
    features: FlightFeatures,
    airlineFactor: number,
    timeFactor: number,
    bookingFactor: number
  ): string[] {
    const factors: string[] = [];

    // Airline factor
    if (airlineFactor < 0.9) factors.push("Budget airline offers lower prices");
    else if (airlineFactor > 1.1) factors.push("Premium airline commands higher prices");

    // Timing factor  
    if (timeFactor < 0.9) factors.push("Off-peak timing reduces cost");
    else if (timeFactor > 1.1) factors.push("Peak time slot increases price");

    // Booking window
    if (features.advance_booking_days < 7) factors.push("Last-minute booking premium applied");
    else if (features.advance_booking_days >= 30 && features.advance_booking_days <= 60) {
      factors.push("Optimal booking window for best prices");
    }

    // Weekend travel
    if (features.is_weekend) factors.push("Weekend travel increases demand");

    // Stops
    if (features.stops === 0) factors.push("Direct flight premium");
    else factors.push("Connecting flights offer savings");

    // Class
    if (features.class > 1) factors.push("Premium class increases price significantly");

    return factors;
  }

  /**
   * Get historical price trends (mock data)
   */
  static getHistoricalTrends(route: string, days: number = 30): Array<{date: string, price: number}> {
    const trends = [];
    const basePrice = 3500;
    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simulate price variation with some trends
      const dayVariation = Math.sin(i / 7) * 200; // Weekly pattern
      const randomVariation = (Math.random() - 0.5) * 300;
      const price = Math.round(basePrice + dayVariation + randomVariation);

      trends.push({
        date: date.toISOString().split('T')[0],
        price: Math.max(price, 2000) // Minimum price floor
      });
    }

    return trends;
  }
}
