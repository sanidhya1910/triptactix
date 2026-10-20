import { describe, expect, it } from 'vitest'
import { totalCost } from './calc'
import { fromItinerary } from './from-itinerary'
import { isTrip } from './storage'

const day = (n: number, extra: object = {}) => ({
  day: n,
  date: `2026-12-0${n}`,
  theme: `Day ${n} theme`,
  activities: [
    { time: '09:00', title: 'Fort walk', location: 'Old town', estimatedCost: 500, category: 'sightseeing', description: '', duration: '2h', tips: [] },
  ],
  meals: [{ time: '13:00', restaurant: 'Thali House', cuisine: 'Gujarati', estimatedCost: 900, speciality: '' }],
  estimatedDailyCost: 9999, // must not be added on top of the items it summarises
  ...extra,
})

const itinerary = (days: object[]) => ({
  destination: 'Jaipur',
  duration: days.length,
  overview: 'Pink city.',
  days,
  transportation: {
    flights: { outbound: { estimatedCost: 8000, tips: [] }, return: { estimatedCost: 7000, tips: [] } },
    local: { estimatedDailyCost: 600, recommendations: [] },
  },
  accommodation: {
    type: 'hotel',
    recommendations: [{ name: 'Haveli Inn', area: 'C-Scheme', estimatedCostPerNight: 3000, totalPrice: 9000, amenities: [], reason: '' }],
  },
})

describe('fromItinerary', () => {
  it('produces a valid trip that the planner will load', () => {
    const t = fromItinerary(itinerary([day(1), day(2), day(3)]), { startDate: '2026-12-01', travelers: 2 })!
    expect(isTrip(t)).toBe(true)
    expect(t.title).toBe('Jaipur')
    expect(t.people).toHaveLength(2)
    expect(t.days.map((d) => d.title)).toEqual(['Day 1 theme', 'Day 2 theme', 'Day 3 theme'])
  })

  it('keeps group totals as they are, and counts nights rather than days', () => {
    // Per day: 500 + 900. Flights 8000 + 7000. Three days is two nights at 3000, not
    // the itinerary's own 9000. Local transport 600 a day for three days.
    const t = fromItinerary(itinerary([day(1), day(2), day(3)]), { startDate: '2026-12-01', travelers: 4 })!
    expect(totalCost(t)).toBe(3 * 1400 + 15000 + 2 * 3000 + 3 * 600)
    expect(t.wholeTrip.find((i) => i.kind === 'stay')).toMatchObject({ amount: 6000 })
  })

  it('a same-day trip has no stay and no crash', () => {
    const t = fromItinerary(itinerary([day(1)]), { startDate: '2026-12-01', travelers: 1 })!
    expect(t.days).toHaveLength(1)
    expect(t.wholeTrip.some((i) => i.kind === 'stay')).toBe(false)
  })

  it('does not add daily local transport when days already list transport', () => {
    const withCab = day(1, {
      activities: [{ title: 'Taxi to Amer', estimatedCost: 700, category: 'transport', location: '', tips: [] }],
    })
    const t = fromItinerary(itinerary([withCab, day(2)]), { startDate: '2026-12-01', travelers: 2 })!
    expect(t.wholeTrip.some((i) => i.title === 'Local transport')).toBe(false)
    expect(t.days[0].items[0]).toMatchObject({ kind: 'cab', amount: 700 })
  })

  it('maps meals to food and marks everything as an AI estimate', () => {
    const t = fromItinerary(itinerary([day(1)]), { startDate: '2026-12-01', travelers: 1 })!
    expect(t.days[0].items[1]).toMatchObject({ kind: 'food', title: 'Thali House', amount: 900 })
    expect(t.days[0].items.every((i) => i.note.includes('AI estimate'))).toBe(true)
  })

  it('treats missing, negative and text costs as zero instead of failing', () => {
    const odd = day(1, { activities: [{ title: 'x', estimatedCost: -50 }, { title: 'y', estimatedCost: '300' }, { title: 'z' }] })
    const t = fromItinerary({ destination: 'X', days: [odd] }, { startDate: '2026-12-01', travelers: 1 })!
    expect(t.days[0].items.slice(0, 3).map((i) => i.amount)).toEqual([0, 0, 0])
    expect(isTrip(t)).toBe(true)
  })

  it('returns null for something that is not an itinerary', () => {
    expect(fromItinerary(null, { startDate: '', travelers: 1 })).toBeNull()
    expect(fromItinerary({ days: [] }, { startDate: '', travelers: 1 })).toBeNull()
  })

  it('records which saved itinerary it came from', () => {
    const t = fromItinerary(itinerary([day(1)]), { startDate: '2026-12-01', travelers: 1, savedTripId: 'saved-7' })!
    expect(t.source).toEqual({ kind: 'itinerary', savedTripId: 'saved-7' })
  })
})
