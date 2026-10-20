import { beforeEach, describe, expect, it, vi } from 'vitest'

// A minimal browser surface: these helpers only touch localStorage and events.
const store = new Map<string, string>()
let quotaFull = false
const events: string[] = []
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (quotaFull) throw new DOMException('quota', 'QuotaExceededError')
      store.set(k, v)
    },
    removeItem: (k: string) => store.delete(k),
  },
  dispatchEvent: (e: Event) => events.push(e.type),
  addEventListener: () => {},
  removeEventListener: () => {},
})

const { readJSON, readList, writeJSON, isRecord, isString } = await import('./storage')
const { getTrips, getAlerts, saveTrip, addAlert } = await import('./saved-trips')

beforeEach(() => {
  store.clear()
  quotaFull = false
  events.length = 0
})

const isNamed = (v: unknown): v is { name: string } => isRecord(v) && isString(v.name)

describe('readList', () => {
  it('reads a missing key as an empty list', () => {
    expect(readList('x', isNamed)).toEqual([])
  })

  it.each([
    ['null', 'null'],
    ['an object', '{}'],
    ['a string', '"hi"'],
    ['truncated JSON', '[{"name":"a"'],
  ])('reads %s as an empty list instead of throwing', (_label, raw) => {
    store.set('x', raw)
    expect(readList('x', isNamed)).toEqual([])
  })

  it('drops only the malformed items', () => {
    store.set('x', JSON.stringify([{ name: 'a' }, null, 7, { name: 2 }, { name: 'b' }]))
    expect(readList('x', isNamed)).toEqual([{ name: 'a' }, { name: 'b' }])
  })

  it('reads invalid JSON as undefined', () => {
    store.set('x', '{bad')
    expect(readJSON('x')).toBeUndefined()
  })
})

describe('writeJSON', () => {
  it('reports success and notifies listeners', () => {
    expect(writeJSON('x', [1])).toBe(true)
    expect(events).toEqual(['tt-storage'])
  })

  it('reports failure when storage is full, instead of pretending it saved', () => {
    quotaFull = true
    expect(writeJSON('x', [1])).toBe(false)
    expect(events).toEqual([])
  })
})

describe('saved trips and alerts', () => {
  const trip = { destination: 'Goa', startDate: '2026-11-01', endDate: '2026-11-04', travelers: 2, budget: 'mid' }
  const alert = { origin: 'Delhi', destination: 'Goa', departureDate: '2026-11-01', travelClass: 'economy', targetPrice: 5000 }

  it('does not crash the dashboard on a corrupt list, which used to lock users out', () => {
    store.set('tt_saved_trips', 'null')
    expect(getTrips()).toEqual([])
    store.set('tt_saved_trips', JSON.stringify([null, { destination: 'Goa' }]))
    expect(getTrips()).toEqual([])
  })

  it('saveTrip returns null when the write fails, so the UI cannot claim "Saved"', () => {
    quotaFull = true
    expect(saveTrip(trip)).toBeNull()
  })

  it('saveTrip still works on top of a corrupt list', () => {
    store.set('tt_saved_trips', '{}')
    expect(saveTrip(trip)?.destination).toBe('Goa')
    expect(getTrips()).toHaveLength(1)
  })

  it('refuses a duplicate alert for the same route, date and class', () => {
    expect(addAlert(alert).status).toBe('added')
    expect(addAlert(alert).status).toBe('duplicate')
    expect(addAlert({ ...alert, travelClass: 'business' }).status).toBe('added')
    expect(getAlerts()).toHaveLength(2)
  })
})
