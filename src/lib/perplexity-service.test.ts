import { afterEach, describe, expect, it, vi } from 'vitest'
import { ItineraryError, PerplexityItineraryService, type EnhancedItineraryRequest } from './perplexity-service'

const request: EnhancedItineraryRequest = {
  destination: 'Jaipur',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  budget: 'mid-range',
  travelers: 2,
  includeFlight: false,
}

/** Runs the service with the AI call replaced by a fixed answer. */
async function generate(answer: unknown, req: Partial<EnhancedItineraryRequest> = {}) {
  vi.stubEnv('PERPLEXITY_API_KEY', 'test-key')
  const service = new PerplexityItineraryService()
  // The one-request-a-second limiter is shared state; back-to-back tests would trip it.
  vi.spyOn(service as unknown as { canMakeRequest: () => boolean }, 'canMakeRequest').mockReturnValue(true)
  vi.spyOn(service as unknown as { callPerplexity: () => Promise<string> }, 'callPerplexity').mockResolvedValue(
    typeof answer === 'string' ? answer : JSON.stringify(answer),
  )
  return service.generateEnhancedItinerary({ ...request, ...req })
}

const day = (theme: string, activities: object[] = [{ title: 'Amer Fort', estimatedCost: 500, category: 'culture' }]) => ({
  theme,
  date: '1999-01-01', // deliberately wrong: the sequence decides the date
  activities,
  meals: [{ restaurant: 'LMB', estimatedCost: 900 }],
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('generateEnhancedItinerary', () => {
  it('refuses without an API key instead of inventing a template', async () => {
    vi.stubEnv('PERPLEXITY_API_KEY', '')
    await expect(new PerplexityItineraryService().generateEnhancedItinerary(request)).rejects.toMatchObject({
      code: 'ai_unavailable',
    })
  })

  it('dates each day from the start date, in local time', async () => {
    // In IST the old toISOString code dated every day one day early.
    const it = await generate({ destination: 'Jaipur', days: [day('One'), day('Two'), day('Three')] })
    expect(it.days.map((d) => d.date)).toEqual(['2026-12-01', '2026-12-02', '2026-12-03'])
  })

  it('keeps a thin answer thin rather than padding it with template activities', async () => {
    const it = await generate({ destination: 'Jaipur', days: [day('Only one thing')] })
    expect(it.days[0].activities.map((a) => a.title)).toEqual(['Amer Fort'])
    expect(it.days[0].meals.map((m) => m.restaurant)).toEqual(['LMB'])
  })

  it('does not invent hotels, clamp their prices, or raise their ratings', async () => {
    const it = await generate({
      destination: 'Jaipur',
      days: [day('a'), day('b'), day('c')],
      accommodation: { type: 'hotel', recommendations: [{ name: 'Pearl Palace', pricePerNight: 1200, rating: 3.1 }] },
    })
    expect(it.accommodation.recommendations).toHaveLength(1)
    expect(it.accommodation.recommendations[0]).toMatchObject({ name: 'Pearl Palace', pricePerNight: 1200, rating: 3.1 })
  })

  it('prices the stay for nights, not days', async () => {
    const it = await generate({
      destination: 'Jaipur',
      days: [day('a'), day('b'), day('c')],
      accommodation: { type: 'hotel', recommendations: [{ name: 'Pearl Palace', pricePerNight: 3000 }] },
    })
    expect(it.accommodation.recommendations[0].totalPrice).toBe(6000)
    expect(it.budgetBreakdown.accommodation).toBe(6000)
  })

  it('accepts a same-day trip, which used to be rejected outright', async () => {
    const it = await generate({ destination: 'Jaipur', days: [day('Day trip')] }, { endDate: '2026-12-01' })
    expect(it.days).toHaveLength(1)
    expect(it.budgetBreakdown.accommodation).toBe(0)
  })

  it('prefers the fare model’s flight prices over the AI’s guess', async () => {
    const it = await generate(
      { destination: 'Jaipur', days: [day('a')], transportation: { flights: { outbound: { estimatedCost: 15000 }, return: { estimatedCost: 15000 } } } },
      { includeFlight: true, flightSource: 'Delhi', flightBudget: { outbound: 8000, return: 7000 } },
    )
    expect(it.budgetBreakdown.flights).toBe(15000)
  })

  it('reports an unreadable answer as a failure', async () => {
    await expect(generate('Sorry, I cannot help with that.')).rejects.toBeInstanceOf(ItineraryError)
    await expect(generate({ destination: 'Jaipur', days: [{ theme: 'empty', activities: [], meals: [] }] })).rejects.toMatchObject({
      code: 'ai_failed',
    })
  })
})
