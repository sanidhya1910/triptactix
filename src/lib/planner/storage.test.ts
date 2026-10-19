import { describe, expect, it } from 'vitest'
import { parseState } from './storage'
import { seedTrip } from './seed'

const valid = () => ({ trip: seedTrip() })

describe('parseState', () => {
  it('round-trips a valid saved state', () => {
    const s = valid()
    expect(parseState(JSON.stringify(s))).toEqual(s)
  })

  it('still loads a trip saved by the previous version, which also stored a dark flag', () => {
    const trip = seedTrip()
    expect(parseState(JSON.stringify({ trip, dark: true }))).toEqual({ trip })
  })

  it('returns null when nothing is saved', () => {
    expect(parseState(null)).toBeNull()
    expect(parseState('')).toBeNull()
  })

  it('rejects malformed JSON instead of throwing', () => {
    expect(parseState('{"trip": ')).toBeNull()
  })

  it('rejects a trip with no days array', () => {
    // The original loader accepted this, then crashed on initialTrip.days[0].
    const { days: _days, ...rest } = seedTrip()
    expect(parseState(JSON.stringify({ trip: rest }))).toBeNull()
  })

  it('rejects an item with an unknown kind', () => {
    const s = valid()
    ;(s.trip.days[0].items[0] as { kind: string }).kind = 'helicopter'
    expect(parseState(JSON.stringify(s))).toBeNull()
  })

  it('rejects a non-numeric amount', () => {
    const s = valid()
    ;(s.trip.wholeTrip[0] as { amount: unknown }).amount = '30000'
    expect(parseState(JSON.stringify(s))).toBeNull()
  })
})
