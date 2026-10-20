import { describe, expect, it } from 'vitest'
import { addDays, asISODate, daysBetween, isISODate, parseISODate, toISODate } from './dates'

// vitest.config pins TZ=Asia/Kolkata, the timezone where the original bug showed up.
describe('dates in IST', () => {
  it('runs in IST', () => {
    expect(new Date(2026, 9, 25).getTimezoneOffset()).toBe(-330)
  })

  it('keeps the picked day, where toISOString moves it back one', () => {
    const picked = new Date(2026, 9, 25) // local midnight, 25 October
    expect(picked.toISOString().slice(0, 10)).toBe('2026-10-24') // the bug
    expect(toISODate(picked)).toBe('2026-10-25')
    expect(asISODate(picked)).toBe('2026-10-25')
  })

  it('round-trips through parseISODate', () => {
    expect(toISODate(parseISODate('2026-01-31')!)).toBe('2026-01-31')
  })

  it('rejects dates that do not exist', () => {
    expect(parseISODate('2026-02-30')).toBeNull()
    expect(parseISODate('2026-13-01')).toBeNull()
    expect(parseISODate('25/10/2026')).toBeNull()
    expect(isISODate('2026-10-25')).toBe(true)
    expect(isISODate(20261025)).toBe(false)
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts days between dates', () => {
    expect(daysBetween('2026-10-25', '2026-10-28')).toBe(3)
    expect(daysBetween('2026-10-25', '2026-10-25')).toBe(0)
    expect(daysBetween('2026-10-28', '2026-10-25')).toBe(-3)
  })
})
