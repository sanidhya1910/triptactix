import { describe, expect, it } from 'vitest'
import { aggregate } from './build-route-stats.mjs'

const header = ',airline,flight,source_city,departure_time,stops,arrival_time,destination_city,class,duration,days_left,price'
const row = (airline, from, slot, to, cls, duration, daysLeft, price) =>
  `0,${airline},X-1,${from},${slot},zero,Night,${to},${cls},${duration},${daysLeft},${price}`

describe('aggregate', () => {
  const csv = [
    header,
    row('Indigo', 'Delhi', 'Morning', 'Mumbai', 'Economy', '2.5', '3', '6000'),
    row('Indigo', 'Delhi', 'Evening', 'Mumbai', 'Economy', '2.0', '30', '4000'),
    row('Vistara', 'Delhi', 'Morning', 'Mumbai', 'Economy', '2.5', '65', '5000'),
    row('Vistara', 'Delhi', 'Morning', 'Mumbai', 'Business', '2.5', '10', '40000'),
    'garbage,line',
    row('Indigo', 'Delhi', 'Morning', 'Mumbai', 'Economy', '2.5', '3', 'NaN'),
    '',
  ].join('\r\n')
  const stats = aggregate(csv)
  const eco = stats.routes.find((r) => r.class === 'economy')

  it('counts rows and skips the ones that do not parse', () => {
    expect(stats.rows).toBe(4)
    expect(stats.skipped).toBe(2)
  })

  it('keeps classes apart', () => {
    expect(stats.routes).toHaveLength(2)
    expect(eco.all).toEqual({ count: 3, sum: 15000, min: 4000, max: 6000 })
  })

  it('aggregates by airline, departure slot and booking window', () => {
    expect(eco.byAirline.Indigo).toEqual({ count: 2, sum: 10000, min: 4000, max: 6000 })
    expect(eco.bySlot.Morning.count).toBe(2)
    expect(Object.keys(eco.byWindow).sort()).toEqual(['0-7 days', '22-45 days', '60+ days'])
    expect(eco.byDecade['0'].sum).toBe(6000)
  })

  it('stores duration in minutes', () => {
    expect(eco.durationSum / eco.durationCount).toBe(140)
  })

  it('counts airlines across all classes', () => {
    expect(stats.airlines).toEqual({ Indigo: 2, Vistara: 2 })
  })
})
