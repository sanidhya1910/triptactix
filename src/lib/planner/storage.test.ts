import { describe, expect, it } from 'vitest'
import { exportFile, migrateV1, parseImport, parsePlannerFile, parseTrip } from './storage'
import { seedTrip } from './seed'
import type { TripV1 } from './types'

/** A trip exactly as version 1 saved and downloaded it. */
const v1 = (): TripV1 => ({
  title: 'Old trip',
  startDate: '2026-12-01',
  travellers: 3,
  notes: 'note',
  customPlaces: ['Coorg'],
  wholeTrip: [{ id: 'w1', kind: 'flight', title: 'Flights', note: '', amount: 18000 }],
  days: [{ id: 'd1', title: 'Arrive', notes: '', items: [{ id: 'i1', kind: 'stay', title: 'Hotel', note: '', amount: 6000 }] }],
})

describe('version 1 migration', () => {
  it('turns the traveller count into named people', () => {
    const t = migrateV1(v1())
    expect(t.people.map((p) => p.name)).toEqual(['Traveller 1', 'Traveller 2', 'Traveller 3'])
  })

  it('keeps every cost, with no payer and shared by everyone', () => {
    const t = migrateV1(v1())
    expect(t.wholeTrip[0]).toMatchObject({ title: 'Flights', amount: 18000, paidBy: null, sharedBy: [] })
    expect(t.days[0].items[0]).toMatchObject({ title: 'Hotel', amount: 6000, paidBy: null, sharedBy: [] })
    expect(t.budget).toBeNull()
  })

  it('reads the saved v1 state, including the old dark flag', () => {
    const trips = parsePlannerFile({ trip: v1(), dark: true })
    expect(trips).toHaveLength(1)
    expect(trips![0].title).toBe('Old trip')
  })

  it('imports the bare trip object that version 1 downloaded', () => {
    expect(parseImport(JSON.stringify(v1()))?.[0].people).toHaveLength(3)
  })
})

describe('current format', () => {
  it('round-trips a downloaded file', () => {
    const trip = seedTrip()
    expect(parseImport(exportFile(trip))).toEqual([trip])
  })

  it('keeps a trip that is already current unchanged', () => {
    const trip = seedTrip()
    expect(parseTrip(trip)).toBe(trip)
  })

  it('drops bad trips from a file but keeps the good ones', () => {
    const good = seedTrip()
    expect(parsePlannerFile({ version: 2, trips: [good, { title: 'broken' }, null] })).toEqual([good])
  })

  it('reads an empty file as no trips, not as an error', () => {
    expect(parsePlannerFile({ version: 2, trips: [] })).toEqual([])
  })
})

describe('rejects anything that is not a trip', () => {
  it.each([
    ['malformed JSON', '{"version": 2,'],
    ['a number', '42'],
    ['null', 'null'],
    ['some other app’s file', JSON.stringify({ name: 'x', items: [] })],
    ['a file where every trip is broken', JSON.stringify({ version: 2, trips: [{ title: 1 }] })],
  ])('%s', (_label, text) => {
    expect(parseImport(text)).toBeNull()
  })

  it('a trip with no people', () => {
    expect(parseTrip({ ...seedTrip(), people: [] })).toBeNull()
  })

  it('a trip with no days array, which crashed the first version', () => {
    const { days: _days, ...rest } = seedTrip()
    expect(parseTrip(rest)).toBeNull()
  })

  it('an item with an unknown kind or a text amount', () => {
    const a = seedTrip()
    ;(a.days[0].items[0] as { kind: string }).kind = 'helicopter'
    expect(parseTrip(a)).toBeNull()
    const b = seedTrip()
    ;(b.wholeTrip[0] as { amount: unknown }).amount = '30000'
    expect(parseTrip(b)).toBeNull()
  })
})
