import { describe, expect, it } from 'vitest'
import {
  balances,
  budgetStatus,
  costByKind,
  dateRange,
  formatINR,
  parseAmount,
  perPerson,
  settleUp,
  shares,
  sumItems,
  totalCost,
  unassigned,
} from './calc'
import { blankTrip, makeItem, makePerson, seedTrip } from './seed'
import type { Item, Trip } from './types'

/** A trip with the given people and costs, all in shared costs. */
function trip(names: string[], costs: (ids: string[]) => Item[]): Trip {
  const t = blankTrip()
  t.people = names.map(makePerson)
  t.wholeTrip = costs(t.people.map((p) => p.id))
  return t
}

const sumValues = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

describe('trip totals', () => {
  it('seed total is exactly 47,400', () => {
    expect(totalCost(seedTrip())).toBe(47400)
    expect(formatINR(totalCost(seedTrip()))).toBe('₹47,400')
  })

  it('per person divides by the number of people', () => {
    const t = seedTrip()
    expect(perPerson(t)).toBe(23700)
    t.people.push(makePerson('Meera'))
    expect(perPerson(t)).toBe(15800)
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

  it('formats negative amounts with the sign before the symbol', () => {
    expect(formatINR(-2500)).toBe('-₹2,500')
  })
})

describe('shares and settling up', () => {
  it('the sample trip settles as one transfer: Ravi pays Asha 9,500', () => {
    const t = seedTrip()
    const [asha, ravi] = t.people
    expect(balances(t)).toEqual({ [asha.id]: 9500, [ravi.id]: -9500 })
    expect(settleUp(t)).toEqual([{ from: ravi.id, to: asha.id, amount: 9500 }])
  })

  it('a cost shared by a subset is split only among them', () => {
    // Dinner 900 for three of four, paid by A. A, B, C owe 300 each; D owes nothing.
    const t = trip(['A', 'B', 'C', 'D'], ([a, b, c]) => [{ ...makeItem('food', 'Dinner', 900, '', a), sharedBy: [a, b, c] }])
    const [a, b, c, d] = t.people.map((p) => p.id)
    expect(shares(t)).toEqual({ [a]: 300, [b]: 300, [c]: 300, [d]: 0 })
    expect(balances(t)).toEqual({ [a]: 600, [b]: -300, [c]: -300, [d]: 0 })
  })

  it('an empty sharedBy means everyone, including people added later', () => {
    const t = trip(['A', 'B'], ([a]) => [makeItem('stay', 'Hotel', 1000, '', a)])
    t.people.push(makePerson('C'))
    const [a, b, c] = t.people.map((p) => p.id)
    // 1000 / 3 each: exactly, A is owed 666.67 and B and C owe 333.33. Which of them
    // absorbs the leftover rupee is a tie, so assert the real guarantees instead: whole
    // rupees, each within one rupee of exact, and a total of exactly zero.
    const bal = balances(t)
    const exact = { [a]: 2000 / 3, [b]: -1000 / 3, [c]: -1000 / 3 }
    expect(sumValues(bal)).toBe(0)
    for (const id of [a, b, c]) {
      expect(Number.isInteger(bal[id])).toBe(true)
      expect(Math.abs(bal[id] - exact[id])).toBeLessThan(1)
    }
  })

  it('rounds so balances always sum to exactly zero', () => {
    // 100 split three ways by one payer, repeated: the classic leftover-rupee case.
    const t = trip(['A', 'B', 'C'], ([a, b]) => [
      makeItem('food', 'x', 100, '', a),
      makeItem('food', 'y', 100, '', b),
      makeItem('food', 'z', 101, '', a),
    ])
    const bal = balances(t)
    expect(sumValues(bal)).toBe(0)
    const transfers = settleUp(t)
    const sent = Object.fromEntries(t.people.map((p) => [p.id, 0]))
    for (const tr of transfers) {
      sent[tr.from] -= tr.amount
      sent[tr.to] += tr.amount
    }
    // Applying the transfers to the balances leaves everyone square.
    for (const p of t.people) expect(bal[p.id] - sent[p.id]).toBe(0)
  })

  it('costs without a payer are left out and reported', () => {
    const t = trip(['A', 'B'], ([a]) => [makeItem('cab', 'Cab', 400, '', a), makeItem('food', 'Lunch', 600)])
    const [a, b] = t.people.map((p) => p.id)
    expect(unassigned(t)).toEqual({ count: 1, amount: 600 })
    // Only the cab counts: A is owed half of 400.
    expect(balances(t)).toEqual({ [a]: 200, [b]: -200 })
  })

  it('a payer who has left the trip counts as no payer', () => {
    const t = trip(['A', 'B'], () => [makeItem('cab', 'Cab', 400, '', 'gone')])
    expect(unassigned(t).count).toBe(1)
    expect(settleUp(t)).toEqual([])
  })

  it('sharedBy naming only removed people falls back to everyone', () => {
    const t = trip(['A', 'B'], ([a]) => [{ ...makeItem('cab', 'Cab', 400, '', a), sharedBy: ['gone'] }])
    const [a, b] = t.people.map((p) => p.id)
    expect(shares(t)).toEqual({ [a]: 200, [b]: 200 })
  })

  it('one traveller never owes anyone', () => {
    const t = trip(['Solo'], ([s]) => [makeItem('stay', 'Hotel', 5000, '', s)])
    expect(settleUp(t)).toEqual([])
  })

  it('needs at most one transfer fewer than there are people', () => {
    const t = trip(['A', 'B', 'C', 'D'], ([a, b]) => [makeItem('stay', 'Hotel', 8000, '', a), makeItem('food', 'Food', 4000, '', b)])
    const transfers = settleUp(t)
    expect(transfers.length).toBeLessThanOrEqual(3)
    // 12,000 split four ways is 3,000 each: A is owed 5,000, B 1,000, and C and D owe
    // 3,000 each. The money that moves is the total owed, 6,000.
    expect(transfers.reduce((s, x) => s + x.amount, 0)).toBe(6000)
  })
})

describe('budget', () => {
  it('is null when no budget is set', () => {
    expect(budgetStatus(blankTrip())).toBeNull()
  })

  it('reports what is left, overall and per person', () => {
    const s = budgetStatus(seedTrip())! // budget 50,000, spent 47,400, 2 people
    expect(s).toMatchObject({ remaining: 2600, over: false, perPersonBudget: 25000, perPersonRemaining: 1300 })
  })

  it('reports going over', () => {
    const t = seedTrip()
    t.budget = 40000
    expect(budgetStatus(t)).toMatchObject({ remaining: -7400, over: true })
  })
})

describe('dates', () => {
  it('describes the date range from the start date and number of days', () => {
    expect(dateRange(seedTrip())).toBe('14 Nov to 17 Nov')
    const one = blankTrip()
    one.startDate = '2026-12-31'
    expect(dateRange(one)).toBe('31 Dec')
  })

  it('sums an empty list as zero', () => {
    expect(sumItems([])).toBe(0)
  })
})
