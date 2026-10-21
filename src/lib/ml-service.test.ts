import { describe, expect, it } from 'vitest'
import {
  HISTORICAL_ROWS,
  enhanceSearchResults,
  getAvailableRoutes,
  getDashboardInsights,
  getPriceRecommendations,
  getRouteIntelligence,
  historicalRange,
} from './ml-service'

describe('historical statistics', () => {
  it('cover every row of the source CSV', () => {
    expect(HISTORICAL_ROWS).toBe(300153)
    expect(getDashboardInsights().totalFlights).toBe(300153)
  })

  it('match the CSV for Delhi to Mumbai economy (checked independently with awk)', () => {
    // awk over data/Indian Airlines.csv: 9982 rows, sum 60489184, min 2281, max 31260.
    expect(historicalRange('Delhi', 'Mumbai')).toMatchObject({ bookings: 9982, averagePrice: 6060, minPrice: 2281, maxPrice: 31260 })
  })

  it('treats city aliases as the same city', () => {
    expect(historicalRange('New Delhi', 'Bombay')?.bookings).toBe(historicalRange('Delhi', 'Mumbai')?.bookings)
  })

  it('keeps business separate from economy', () => {
    expect(historicalRange('Delhi', 'Mumbai', { travelClass: 'business' })!.averagePrice).toBeGreaterThan(
      historicalRange('Delhi', 'Mumbai')!.averagePrice * 3,
    )
  })

  it('returns null for a route with no history, instead of the old invented ₹8,000', () => {
    expect(historicalRange('Delhi', 'Goa')).toBeNull()
    expect(getRouteIntelligence('Delhi', 'Goa')).toBeNull()
    expect(getPriceRecommendations('Delhi', 'Goa')).toBeNull()
  })

  it('lists the 30 routes between the six metros', () => {
    expect(getAvailableRoutes()).toHaveLength(30)
  })

  it('orders booking windows from nearest to furthest', () => {
    expect(getRouteIntelligence('Delhi', 'Mumbai')!.bookingWindow.map((w) => w.bucket)).toEqual([
      '0-7 days',
      '8-21 days',
      '22-45 days',
      '46-60 days',
    ])
  })
})

describe('comparing live fares with history', () => {
  // The route's minimum is 2,281, so 2,400 is within 10% of it; 30,000 is near its 31,260 maximum.
  const flights = [{ price: 2400 }, { price: 6000 }, { price: 30000 }, { price: 0 }]

  it('labels each fare against the route’s past average, and says it is historical', () => {
    const [cheap, middle, dear] = enhanceSearchResults(flights, (f) => f.price, 'Delhi', 'Mumbai', '2099-01-01')
    expect(cheap.historyInsight).toMatchObject({ source: 'historical', category: 'Low for this route' })
    expect(middle.historyInsight?.category).toBe('About average')
    expect(dear.historyInsight?.category).toBe('High for this route')
  })

  it('leaves fares untouched when there is no history or no price', () => {
    expect(enhanceSearchResults(flights, (f) => f.price, 'Delhi', 'Goa', '2099-01-01')).toEqual(flights)
    expect(enhanceSearchResults(flights, (f) => f.price, 'Delhi', 'Mumbai', '2099-01-01')[3].historyInsight).toBeUndefined()
  })
})
