import type { GeneratedItinerary } from '@/lib/perplexity-service'
import { isISODate } from '@/lib/dates'
import { isFiniteNumber, isRecord, isString } from '@/lib/storage'
import { makeItem, makePerson, nowISO, uid } from './seed'
import type { Day, Item, ItemKind, Trip } from './types'

type Activity = GeneratedItinerary['days'][number]['activities'][number]

const ACTIVITY_KIND: Record<Activity['category'], ItemKind> = {
  transport: 'cab',
  accommodation: 'stay',
  food: 'food',
  sightseeing: 'place',
  culture: 'place',
  adventure: 'place',
  activity: 'place',
  shopping: 'other',
}

const NOTE = 'AI estimate'

/** A positive whole-rupee amount, or 0 for anything missing, negative or not a number. */
const money = (v: unknown) => (isFiniteNumber(v) && v > 0 ? Math.round(v) : 0)
const text = (v: unknown, fallback = '') => (isString(v) && v.trim() ? v.trim() : fallback)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export interface FromItineraryOptions {
  startDate: string
  travelers: number
  savedTripId?: string
}

/**
 * Turns a generated itinerary into a budget the user can edit.
 *
 * The prompt asks for every cost "for N traveler(s)" (perplexity-service.ts), so these are
 * already group totals and are not multiplied by the traveller count. The input is read
 * defensively because saved itineraries are stored as untyped snapshots. Returns null when
 * it has no days to convert.
 */
export function fromItinerary(itinerary: unknown, opts: FromItineraryOptions): Trip | null {
  if (!isRecord(itinerary)) return null
  const rawDays = list(itinerary.days).filter(isRecord)
  if (rawDays.length === 0) return null

  const people = Array.from({ length: Math.max(1, Math.min(50, Math.round(opts.travelers) || 1)) }, (_, i) =>
    makePerson(`Traveller ${i + 1}`),
  )
  const destination = text(itinerary.destination, 'Trip')

  let hasTransportActivity = false
  const days: Day[] = rawDays.map((d) => {
    const items: Item[] = []
    for (const a of list(d.activities).filter(isRecord)) {
      const category = isString(a.category) && a.category in ACTIVITY_KIND ? (a.category as Activity['category']) : 'activity'
      if (category === 'transport') hasTransportActivity = true
      const where = text(a.location)
      items.push(makeItem(ACTIVITY_KIND[category], text(a.title, 'Activity'), money(a.estimatedCost), where ? `${where}. ${NOTE}` : NOTE))
    }
    for (const m of list(d.meals).filter(isRecord)) {
      const cuisine = text(m.cuisine)
      items.push(makeItem('food', text(m.restaurant, 'Meal'), money(m.estimatedCost), cuisine ? `${cuisine}. ${NOTE}` : NOTE))
    }
    return { id: uid(), title: text(d.theme), notes: '', items }
  })

  const shared: Item[] = []
  const transport = isRecord(itinerary.transportation) ? itinerary.transportation : {}
  const flights = isRecord(transport.flights) ? transport.flights : {}
  const out = isRecord(flights.outbound) ? money(flights.outbound.estimatedCost) : 0
  const back = isRecord(flights.return) ? money(flights.return.estimatedCost) : 0
  if (out) shared.push(makeItem('flight', `Flight to ${destination}`, out, NOTE))
  if (back) shared.push(makeItem('flight', `Flight back from ${destination}`, back, NOTE))

  // Nights, not days: a three-day trip is two nights. The itinerary's own totalPrice is not
  // used, because it was computed per day and so includes one night too many.
  const nights = Math.max(0, days.length - 1)
  const stay = list(isRecord(itinerary.accommodation) ? itinerary.accommodation.recommendations : []).find(isRecord)
  const nightly = stay ? money(stay.pricePerNight) || money(stay.estimatedCostPerNight) : 0
  if (stay && nightly && nights > 0) {
    const area = text(stay.area)
    shared.push(
      makeItem(
        'stay',
        text(stay.name, 'Stay') + (area ? `, ${area}` : ''),
        nightly * nights,
        `${nights} ${nights === 1 ? 'night' : 'nights'} at ₹${nightly.toLocaleString('en-IN')}. ${NOTE}`,
      ),
    )
  }

  // Daily local transport only when no day lists transport itself, so it is never counted twice.
  const local = isRecord(transport.local) ? money(transport.local.estimatedDailyCost) : 0
  if (local && !hasTransportActivity) {
    shared.push(makeItem('cab', 'Local transport', local * days.length, `₹${local.toLocaleString('en-IN')} a day. ${NOTE}`))
  }

  const firstDate = rawDays.map((d) => d.date).find(isISODate)
  const t = nowISO()
  return {
    id: uid(),
    title: destination,
    startDate: isISODate(opts.startDate) ? opts.startDate : (firstDate ?? ''),
    notes: text(itinerary.overview),
    people,
    budget: null,
    wholeTrip: shared,
    days,
    customPlaces: [],
    createdAt: t,
    updatedAt: t,
    ...(opts.savedTripId ? { source: { kind: 'itinerary' as const, savedTripId: opts.savedTripId } } : {}),
  }
}
