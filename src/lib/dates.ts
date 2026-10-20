/**
 * Calendar dates as plain `yyyy-mm-dd` strings.
 *
 * Never use `date.toISOString().slice(0, 10)` for a date the user picked. A date picker
 * returns local midnight, and toISOString converts to UTC first, so in India (UTC+5:30)
 * 25 October becomes "2026-10-24": the search, the alert and the saved trip all land on
 * the wrong day. These helpers read and write the local calendar fields instead.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** The local calendar date of `date`, as `yyyy-mm-dd`. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Local midnight on the given `yyyy-mm-dd` date, or null if the string is not a real date. */
export function parseISODate(value: string): Date | null {
  const m = ISO_DATE.exec(value)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  // Rejects overflow such as 2026-02-30, which Date would silently roll into March.
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && parseISODate(value) !== null
}

/** `yyyy-mm-dd` shifted by whole calendar days. Safe across DST changes. */
export function addDays(value: string, days: number): string {
  const date = parseISODate(value)
  if (!date) return value
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Today's local date as `yyyy-mm-dd`. */
export const todayISO = () => toISODate(new Date())

/** Whole days from `from` to `to`, both `yyyy-mm-dd`. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from)
  const b = parseISODate(to)
  if (!a || !b) return 0
  // Both are local midnights, so rounding absorbs a DST hour either way.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/** Accepts a `yyyy-mm-dd` string or a local Date from a picker; returns `yyyy-mm-dd`. */
export function asISODate(value: string | Date): string {
  return typeof value === 'string' ? value.slice(0, 10) : toISODate(value)
}
