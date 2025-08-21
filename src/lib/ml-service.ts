import fs from 'fs';
import path from 'path';


interface HistoricalFlightData {
  airline: string;
  flight: string;
  source_city: string;
  departure_time: string;
  stops: string;
  arrival_time: string;
  destination_city: string;
  class: string;
  duration: string;
  days_left: number;
  price: number;
}

interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  trendDirection: 'up' | 'down' | 'stable';
  recommendation: string;
  historicalData: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    priceRange: number;
  };
}

interface RouteAnalytics {
  route: string;
  totalFlights: number;
  airlines: string[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  averageDuration: number;
  mostCommonAirline: string;
  bestTimeToBook: string;
  popularTimeSlots: string[];
}

class MLService {
  private historicalData: HistoricalFlightData[] = [];
  private isDataLoaded = false;

  constructor() {
    this.loadHistoricalData();
  }

  private loadHistoricalData() {
    try {
      const csvPath = path.join(process.cwd(), 'data', 'Indian Airlines.csv');
      if (!fs.existsSync(csvPath)) {
        console.warn('Historical data CSV not found');
        return;
      }

      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',');
        if (values.length >= 11) {
          this.historicalData.push({
            airline: values[1] || '',
            flight: values[2] || '',
            source_city: values[3] || '',
            departure_time: values[4] || '',
            stops: values[5] || '',
            arrival_time: values[6] || '',
            destination_city: values[7] || '',
            class: values[8] || '',
            duration: values[9] || '',
            days_left: parseInt(values[10]) || 0,
            price: parseInt(values[11]) || 0
          });
        }
      }

      this.isDataLoaded = true;
      console.log(`Loaded ${this.historicalData.length} historical flight records`);
    } catch (error) {
      console.error('Error loading historical data:', error);
    }
  }

  /**
   * Predict flight price based on historical data
   */
  public async predictPrice(
    from: string,
    to: string,
    departureDate: string,
    airline?: string
  ): Promise<PricePrediction> {
    if (!this.isDataLoaded) {
      throw new Error('Historical data not loaded');
    }

    console.log(`ML: Searching for route ${from} (${this.normalizeCity(from)}) → ${to} (${this.normalizeCity(to)})`);

    // Filter historical data for the specific route
    const routeData = this.historicalData.filter(flight => 
      this.normalizeCity(flight.source_city) === this.normalizeCity(from) &&
      this.normalizeCity(flight.destination_city) === this.normalizeCity(to) &&
      (!airline || this.normalizeAirline(flight.airline) === this.normalizeAirline(airline)) &&
      (flight.class?.toLowerCase?.() === 'economy')
    );

    console.log(`ML: Found ${routeData.length} historical flights for this route`);
    if (routeData.length > 0) {
      console.log(`ML: Sample flight:`, routeData[0]);
    }

    if (routeData.length === 0) {
      return {
        predictedPrice: 8000,
        confidence: 0.3,
        trendDirection: 'stable',
        recommendation: 'No historical data available for this route',
        historicalData: {
          averagePrice: 8000,
          minPrice: 8000,
          maxPrice: 8000,
          priceRange: 0
        }
      };
    }

    // Calculate price statistics
    const prices = routeData.map(f => f.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Calculate days left impact
    const currentDate = new Date(departureDate);
    const today = new Date();
    const daysUntilDeparture = Math.max(0, Math.ceil((currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Price prediction based on days left
    let priceFactor = 1.0;
    if (daysUntilDeparture <= 7) {
      priceFactor = 1.3; // Last minute premium
    } else if (daysUntilDeparture <= 21) {
      priceFactor = 1.1; // Moderate increase
    } else if (daysUntilDeparture >= 60) {
      priceFactor = 0.85; // Early bird discount
    }

    const predictedPrice = Math.round(averagePrice * priceFactor);

    // Determine trend direction
    const recentPrices = routeData
      .filter(f => f.days_left <= 30)
      .map(f => f.price);
    
    const earlyPrices = routeData
      .filter(f => f.days_left > 30)
      .map(f => f.price);

    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (recentPrices.length > 0 && earlyPrices.length > 0) {
      const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      const earlyAvg = earlyPrices.reduce((sum, p) => sum + p, 0) / earlyPrices.length;
      
      if (recentAvg > earlyAvg * 1.1) {
        trendDirection = 'up';
      } else if (recentAvg < earlyAvg * 0.9) {
        trendDirection = 'down';
      }
    }

    // Generate recommendation
    let recommendation = '';
    if (daysUntilDeparture <= 7) {
      recommendation = 'Book now - prices tend to be highest close to departure';
    } else if (daysUntilDeparture <= 21) {
      recommendation = 'Consider booking soon - prices may increase closer to departure';
    } else if (daysUntilDeparture >= 60) {
      recommendation = 'Great timing - early bookings often get the best prices';
    } else {
      recommendation = 'Good time to book - prices are relatively stable';
    }

    const confidence = Math.min(0.9, routeData.length / 1000); // Higher confidence with more data

    return {
      predictedPrice,
      confidence,
      trendDirection,
      recommendation,
      historicalData: {
        averagePrice: Math.round(averagePrice),
        minPrice,
        maxPrice,
        priceRange
      }
    };
  }

  /**
   * Get comprehensive route analytics
   */
  public async getRouteAnalytics(from: string, to: string): Promise<RouteAnalytics> {
    if (!this.isDataLoaded) {
      throw new Error('Historical data not loaded');
    }

    const routeData = this.historicalData.filter(flight => 
      this.normalizeCity(flight.source_city) === this.normalizeCity(from) &&
      this.normalizeCity(flight.destination_city) === this.normalizeCity(to) &&
      (flight.class?.toLowerCase?.() === 'economy')
    );

    if (routeData.length === 0) {
      return {
        route: `${from} → ${to}`,
        totalFlights: 0,
        airlines: [],
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        averageDuration: 0,
        mostCommonAirline: '',
        bestTimeToBook: '',
        popularTimeSlots: []
      };
    }

    // Calculate statistics
    const prices = routeData.map(f => f.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Get unique airlines
    const airlines = [...new Set(routeData.map(f => f.airline))];

    // Find most common airline
    const airlineCounts = routeData.reduce((acc, flight) => {
      acc[flight.airline] = (acc[flight.airline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonAirline = Object.entries(airlineCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // Calculate average duration (assuming format like "2h 30m")
    const durations = routeData.map(f => this.parseDuration(f.duration));
    const averageDuration = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;

    // Analyze best time to book (based on days_left vs price correlation)
    const bookingAnalysis = routeData.reduce((acc, flight) => {
      const bucket = this.getDaysLeftBucket(flight.days_left);
      if (!acc[bucket]) {
        acc[bucket] = { totalPrice: 0, count: 0 };
      }
      acc[bucket].totalPrice += flight.price;
      acc[bucket].count += 1;
      return acc;
    }, {} as Record<string, { totalPrice: number; count: number }>);

    const bestTimeToBook = Object.entries(bookingAnalysis)
      .map(([bucket, data]) => ({
        bucket,
        averagePrice: data.totalPrice / data.count
      }))
      .sort((a, b) => a.averagePrice - b.averagePrice)[0]?.bucket || '';

    // Analyze popular time slots
    const timeSlots = routeData.map(f => this.getTimeSlot(f.departure_time));
    const timeSlotCounts = timeSlots.reduce((acc, slot) => {
      acc[slot] = (acc[slot] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const popularTimeSlots = Object.entries(timeSlotCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([slot]) => slot);

    return {
      route: `${from} → ${to}`,
      totalFlights: routeData.length,
      airlines: airlines.map(a => this.denormalizeAirline(a)),
      averagePrice: Math.round(averagePrice),
      minPrice,
      maxPrice,
      averageDuration: Math.round(averageDuration),
      mostCommonAirline: this.denormalizeAirline(mostCommonAirline),
      bestTimeToBook,
      popularTimeSlots
    };
  }

  /**
   * Enhance live search results with ML insights
   */
  public async enhanceSearchResults<T extends { price: { total: number } }>(
    flights: T[],
    from: string,
    to: string,
    departureDate: string
  ): Promise<T[]> {
    try {
      const prediction = await this.predictPrice(from, to, departureDate);
      const analytics = await this.getRouteAnalytics(from, to);

      return flights.map(flight => {
        // Calculate price comparison
        const priceComparison = this.comparePriceToHistorical(flight.price.total, prediction);
        
        // Add ML insights to flight
  return {
          ...flight,
          mlInsights: {
            priceComparison,
            isGoodDeal: flight.price.total <= prediction.historicalData.averagePrice * 0.9,
            predictedPrice: prediction.predictedPrice,
            confidence: prediction.confidence,
            recommendation: priceComparison.recommendation,
            historicalRank: this.calculatePriceRank(flight.price.total, analytics)
          }
  } as T;
      });
    } catch (error) {
      console.error('Error enhancing search results with ML:', error);
      return flights;
    }
  }

  /**
   * Get price recommendations for a route
   */
  public async getPriceRecommendations(from: string, to: string): Promise<{
    bestPrice: number;
    worstPrice: number;
    averagePrice: number;
    recommendedBookingWindow: string;
    priceHistory: Array<{ daysLeft: number; averagePrice: number }>;
  }> {
    if (!this.isDataLoaded) {
      throw new Error('Historical data not loaded');
    }

    const routeData = this.historicalData.filter(flight => 
      this.normalizeCity(flight.source_city) === this.normalizeCity(from) &&
      this.normalizeCity(flight.destination_city) === this.normalizeCity(to)
    );

    const prices = routeData.map(f => f.price);
    const bestPrice = Math.min(...prices);
    const worstPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Analyze price history by days left
    const priceHistory = this.analyzePriceHistory(routeData);

    // Find best booking window
    const bestWindow = priceHistory
      .sort((a, b) => a.averagePrice - b.averagePrice)[0];

    const recommendedBookingWindow = this.getBookingWindowText(bestWindow?.daysLeft || 30);

    return {
      bestPrice,
      worstPrice,
      averagePrice: Math.round(averagePrice),
      recommendedBookingWindow,
      priceHistory: priceHistory.slice(0, 10) // Limit to top 10 data points
    };
  }

  // Helper methods
  private normalizeCity(city: string): string {
    const cityMap: Record<string, string> = {
      'New Delhi': 'Delhi',
      'Delhi': 'Delhi',
      'Mumbai': 'Mumbai',
      'Bombay': 'Mumbai',
      'Bangalore': 'Bangalore',
      'Bengaluru': 'Bangalore',
      'Chennai': 'Chennai',
      'Madras': 'Chennai',
      'Hyderabad': 'Hyderabad',
      'Kolkata': 'Kolkata',
      'Calcutta': 'Kolkata'
    };
    return cityMap[city] || city;
  }

  private normalizeAirline(airline: string): string {
    const airlineMap: Record<string, string> = {
      'IndiGo': 'Indigo',
      'Air India': 'Air_India',
      'SpiceJet': 'SpiceJet',
      'Akasa Air': 'AirAsia', // Approximate mapping
      'Vistara': 'Vistara',
      'GoFirst': 'GO_FIRST'
    };
    return airlineMap[airline] || airline;
  }

  private denormalizeAirline(airline: string): string {
    const airlineMap: Record<string, string> = {
      'Indigo': 'IndiGo',
      'Air_India': 'Air India',
      'SpiceJet': 'SpiceJet',
      'AirAsia': 'AirAsia',
      'Vistara': 'Vistara',
      'GO_FIRST': 'GoFirst'
    };
    return airlineMap[airline] || airline;
  }

  private parseDuration(duration: string): number {
    // Parse duration like "2h 30m" to minutes
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)m/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    
    return hours * 60 + minutes;
  }

  private getDaysLeftBucket(daysLeft: number): string {
    if (daysLeft <= 7) return '0-7 days';
    if (daysLeft <= 21) return '8-21 days';
    if (daysLeft <= 45) return '22-45 days';
    if (daysLeft <= 60) return '46-60 days';
    return '60+ days';
  }

  private getTimeSlot(departureTime: string): string {
    // Parse departure time categories
    const timeMap: Record<string, string> = {
      'Early_Morning': 'Early Morning (6:00-9:00)',
      'Morning': 'Morning (9:00-12:00)',
      'Afternoon': 'Afternoon (12:00-15:00)',
      'Evening': 'Evening (15:00-18:00)',
      'Night': 'Night (18:00-21:00)',
      'Late_Night': 'Late Night (21:00-6:00)'
    };
    return timeMap[departureTime] || departureTime;
  }

  private comparePriceToHistorical(currentPrice: number, prediction: PricePrediction) {
    const { averagePrice, minPrice, maxPrice } = prediction.historicalData;
    
    let category = 'Average';
    let recommendation = '';
    let percentDifference = 0;

    if (currentPrice <= minPrice * 1.1) {
      category = 'Excellent Deal';
      recommendation = 'This is an exceptional price! Book immediately.';
      percentDifference = Math.round(((averagePrice - currentPrice) / averagePrice) * 100);
    } else if (currentPrice <= averagePrice * 0.9) {
      category = 'Good Deal';
      recommendation = 'This is below average price. Good time to book.';
      percentDifference = Math.round(((averagePrice - currentPrice) / averagePrice) * 100);
    } else if (currentPrice <= averagePrice * 1.1) {
      category = 'Average Price';
      recommendation = 'Price is around the average for this route.';
      percentDifference = Math.round(((currentPrice - averagePrice) / averagePrice) * 100);
    } else if (currentPrice <= maxPrice * 0.9) {
      category = 'Above Average';
      recommendation = 'Price is higher than usual. Consider waiting if flexible.';
      percentDifference = Math.round(((currentPrice - averagePrice) / averagePrice) * 100);
    } else {
      category = 'Expensive';
      recommendation = 'This is quite expensive for this route. Wait if possible.';
      percentDifference = Math.round(((currentPrice - averagePrice) / averagePrice) * 100);
    }

    return {
      category,
      recommendation,
      percentDifference,
      comparedToAverage: percentDifference
    };
  }

  private calculatePriceRank(price: number, analytics: RouteAnalytics): string {
    const priceRatio = price / analytics.averagePrice;
    
    if (priceRatio <= 0.8) return 'Excellent (Top 20%)';
    if (priceRatio <= 0.9) return 'Good (Top 40%)';
    if (priceRatio <= 1.1) return 'Average (Middle 20%)';
    if (priceRatio <= 1.2) return 'Above Average (Bottom 40%)';
    return 'Expensive (Bottom 20%)';
  }

  private analyzePriceHistory(routeData: HistoricalFlightData[]) {
    const priceByDaysLeft = routeData.reduce((acc, flight) => {
      const bucket = Math.floor(flight.days_left / 10) * 10; // Group by 10-day buckets
      if (!acc[bucket]) {
        acc[bucket] = { totalPrice: 0, count: 0 };
      }
      acc[bucket].totalPrice += flight.price;
      acc[bucket].count += 1;
      return acc;
    }, {} as Record<number, { totalPrice: number; count: number }>);

    return Object.entries(priceByDaysLeft)
      .map(([daysLeft, data]) => ({
        daysLeft: parseInt(daysLeft),
        averagePrice: Math.round(data.totalPrice / data.count)
      }))
      .sort((a, b) => b.daysLeft - a.daysLeft);
  }

  private getBookingWindowText(daysLeft: number): string {
    if (daysLeft >= 60) return '60+ days before departure';
    if (daysLeft >= 45) return '45-60 days before departure';
    if (daysLeft >= 30) return '30-45 days before departure';
    if (daysLeft >= 14) return '2-4 weeks before departure';
    if (daysLeft >= 7) return '1-2 weeks before departure';
    return 'Less than 1 week before departure';
  }

  /**
   * Get available routes from historical data
   */
  public getAvailableRoutes(): Array<{ from: string; to: string; flightCount: number }> {
    if (!this.isDataLoaded) return [];

    const routeCounts = this.historicalData.reduce((acc, flight) => {
      const route = `${flight.source_city}-${flight.destination_city}`;
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(routeCounts)
      .map(([route, count]) => {
        const [from, to] = route.split('-');
        return {
          from: this.denormalizeCity(from),
          to: this.denormalizeCity(to),
          flightCount: count
        };
      })
      .sort((a, b) => b.flightCount - a.flightCount);
  }

  private denormalizeCity(city: string): string {
    const cityMap: Record<string, string> = {
      'Delhi': 'New Delhi',
      'Mumbai': 'Mumbai',
      'Bangalore': 'Bangalore',
      'Chennai': 'Chennai',
      'Hyderabad': 'Hyderabad',
      'Kolkata': 'Kolkata'
    };
    return cityMap[city] || city;
  }

  /**
   * Get ML insights for dashboard
   */
  public async getDashboardInsights(): Promise<{
    totalRoutes: number;
    totalFlights: number;
    mostPopularRoute: string;
    averagePriceAcrossRoutes: number;
    priceRangeAcrossRoutes: { min: number; max: number };
    topAirlines: Array<{ airline: string; marketShare: number }>;
  }> {
    if (!this.isDataLoaded) {
      throw new Error('Historical data not loaded');
    }

    const routes = this.getAvailableRoutes();
    const totalRoutes = routes.length;
    const totalFlights = this.historicalData.length;
    const mostPopularRoute = routes[0]?.from && routes[0]?.to 
      ? `${routes[0].from} → ${routes[0].to}` 
      : 'No data';

    const allPrices = this.historicalData.map(f => f.price);
    const averagePriceAcrossRoutes = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    
    // Use efficient min/max calculation for large arrays
    let minPrice = allPrices[0];
    let maxPrice = allPrices[0];
    for (const price of allPrices) {
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }
    
    const priceRangeAcrossRoutes = {
      min: minPrice,
      max: maxPrice
    };

    // Calculate airline market share
    const airlineCounts = this.historicalData.reduce((acc, flight) => {
      const airline = this.denormalizeAirline(flight.airline);
      acc[airline] = (acc[airline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAirlines = Object.entries(airlineCounts)
      .map(([airline, count]) => ({
        airline,
        marketShare: Math.round((count / totalFlights) * 100)
      }))
      .sort((a, b) => b.marketShare - a.marketShare)
      .slice(0, 5);

    return {
      totalRoutes,
      totalFlights,
      mostPopularRoute,
      averagePriceAcrossRoutes: Math.round(averagePriceAcrossRoutes),
      priceRangeAcrossRoutes,
      topAirlines
    };
  }
}

export const mlService = new MLService();
export type { PricePrediction, RouteAnalytics };
