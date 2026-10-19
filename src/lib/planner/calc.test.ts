import { describe, expect, it } from 'vitest'
import { costByKind, formatINR, parseAmount, perPerson, totalCost } from './calc'
import { seedTrip, makeItem } from './seed'

describe('trip totals', () => {
  it('seed total is exactly 47,400', () => {
    expect(totalCost(seedTrip())).toBe(47400)
    expect(formatINR(totalCost(seedTrip()))).toBe('₹47,400')
  })

  it('per person divides by travellers', () => {
    const t = seedTrip()
    expect(perPerson(t)).toBe(23700)
    expect(perPerson({ ...t, travellers: 3 })).toBe(15800)
  })

  it('per person is 0 with no travellers', () => {
    expect(perPerson({ ...seedTrip(), travellers: 0 })).toBe(0)
  })

  it('total updates when an amount changes', () => {
    const t = seedTrip()
    t.days[0].items.push(makeItem('stay', 'Hotel', 5000))
    expect(totalCost(t)).toBe(52400)
  })

  it('splits cost by kind', () => {
    const s = costByKind(seedTrip())
    expect(s.flight).toBe(30000)
    expect(s.cab).toBe(12600)
    expect(s.food).toBe(3200)
    expect(s.fees).toBe(1600)
    expect(s.place).toBe(0)
  })

  it('parses amounts from typed text', () => {
    expect(parseAmount('₹1,250')).toBe(1250)
    expect(parseAmount('')).toBe(0)
  })
})
