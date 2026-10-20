import type { Item, ItemKind, Person, Trip } from './types'
import { SPLIT_ORDER } from './types'
import { parseISODate } from '@/lib/dates'

const amountOf = (i: Item) => (Number.isFinite(i.amount) ? i.amount : 0)

export const sumItems = (items: Item[]): number => items.reduce((s, i) => s + amountOf(i), 0)

export const allItems = (trip: Trip): Item[] => [...trip.wholeTrip, ...trip.days.flatMap((d) => d.items)]

export const totalCost = (trip: Trip): number => sumItems(allItems(trip))

export const travellerCount = (trip: Trip): number => trip.people.length

/** The trip total divided evenly. With costs some people sit out, this is an average. */
export const perPerson = (trip: Trip): number =>
  trip.people.length > 0 ? Math.round(totalCost(trip) / trip.people.length) : 0

export const costByKind = (trip: Trip): Record<ItemKind, number> => {
  const out = Object.fromEntries(SPLIT_ORDER.map((k) => [k, 0])) as Record<ItemKind, number>
  for (const i of allItems(trip)) out[i.kind] += amountOf(i)
  return out
}

// ---- Who shares and who paid ------------------------------------------------

/**
 * The people sharing a cost. An empty list, or one naming only people since removed,
 * means everyone, so a cost can never end up shared by nobody.
 */
export function sharersOf(trip: Trip, item: Item): string[] {
  const present = new Set(trip.people.map((p) => p.id))
  const chosen = item.sharedBy.filter((id) => present.has(id))
  return chosen.length > 0 ? chosen : trip.people.map((p) => p.id)
}

/** True when the cost is shared by a subset rather than everyone. */
export const isSubset = (trip: Trip, item: Item) => sharersOf(trip, item).length < trip.people.length

/** The payer, if they are still on the trip. */
export const payerOf = (trip: Trip, item: Item): Person | undefined =>
  item.paidBy ? trip.people.find((p) => p.id === item.paidBy) : undefined

export const hasSubsets = (trip: Trip) => allItems(trip).some((i) => amountOf(i) > 0 && isSubset(trip, i))

/** Each person's share of every cost they take part in, whoever paid. Unrounded. */
export function shares(trip: Trip): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(trip.people.map((p) => [p.id, 0]))
  for (const item of allItems(trip)) {
    const who = sharersOf(trip, item)
    for (const id of who) out[id] += amountOf(item) / who.length
  }
  return out
}

/** Costs with money on them but no payer yet. These are left out of settling up. */
export function unassigned(trip: Trip): { count: number; amount: number } {
  const items = allItems(trip).filter((i) => amountOf(i) > 0 && !payerOf(trip, i))
  return { count: items.length, amount: sumItems(items) }
}

/**
 * What each person is owed (positive) or owes (negative), in whole rupees, counting
 * only costs that have a payer. Rounded by largest remainder so the balances always sum
 * to exactly zero; rounding each one independently can leave a rupee unaccounted for.
 */
export function balances(trip: Trip): Record<string, number> {
  const raw: Record<string, number> = Object.fromEntries(trip.people.map((p) => [p.id, 0]))
  for (const item of allItems(trip)) {
    const payer = payerOf(trip, item)
    if (!payer || amountOf(item) === 0) continue
    raw[payer.id] += amountOf(item)
    const who = sharersOf(trip, item)
    for (const id of who) raw[id] -= amountOf(item) / who.length
  }

  // Drop float noise before flooring, so 33.333... does not become 33.332999.
  const ids = Object.keys(raw)
  const exact = ids.map((id) => Math.round(raw[id] * 1e6) / 1e6)
  const floored = exact.map(Math.floor)
  let missing = Math.round(-floored.reduce((a, b) => a + b, 0))
  const order = ids.map((_, i) => i).sort((a, b) => exact[b] - floored[b] - (exact[a] - floored[a]))
  for (const i of order) {
    if (missing <= 0) break
    floored[i] += 1
    missing -= 1
  }
  return Object.fromEntries(ids.map((id, i) => [id, floored[i] === 0 ? 0 : floored[i]]))
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

/**
 * The payments that settle every balance. Repeatedly pairs the person who owes most with
 * the person owed most, which needs at most one transfer fewer than there are people.
 */
export function settleUp(trip: Trip): Transfer[] {
  const owed = Object.entries(balances(trip))
  const creditors = owed.filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }))
  const debtors = owed.filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }))
  const out: Transfer[] = []
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.v - a.v)
    debtors.sort((a, b) => b.v - a.v)
    const c = creditors[0]
    const d = debtors[0]
    const amount = Math.min(c.v, d.v)
    out.push({ from: d.id, to: c.id, amount })
    c.v -= amount
    d.v -= amount
    if (c.v === 0) creditors.shift()
    if (d.v === 0) debtors.shift()
  }
  return out
}

// ---- Budget -----------------------------------------------------------------

export interface BudgetStatus {
  budget: number
  spent: number
  /** Positive when under budget, negative when over. */
  remaining: number
  over: boolean
  /** Share of the budget used, 0 to 1 and beyond when over. */
  used: number
  perPersonBudget: number
  perPersonRemaining: number
}

export function budgetStatus(trip: Trip): BudgetStatus | null {
  if (trip.budget === null || trip.budget <= 0) return null
  const spent = totalCost(trip)
  const people = Math.max(1, trip.people.length)
  const remaining = trip.budget - spent
  return {
    budget: trip.budget,
    spent,
    remaining,
    over: remaining < 0,
    used: spent / trip.budget,
    perPersonBudget: Math.round(trip.budget / people),
    perPersonRemaining: Math.round(remaining / people),
  }
}

// ---- Formatting -------------------------------------------------------------

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const formatINR = (n: number): string => `${n < 0 ? '-' : ''}₹${inr.format(Math.abs(Math.round(n)))}`
export const formatNumber = (n: number): string => inr.format(n)

export const parseAmount = (s: string): number => {
  const digits = s.replace(/[^0-9]/g, '')
  return digits ? Math.min(Number(digits), 99999999) : 0
}

const dayFormat = { weekday: 'short', day: 'numeric', month: 'short' } as const

export const dayDate = (startDate: string, index: number): string => {
  const d = parseISODate(startDate)
  if (!d) return ''
  d.setDate(d.getDate() + index)
  return d.toLocaleDateString('en-IN', dayFormat)
}

/** "14 Nov to 17 Nov", or a single day, for list cards. Empty without a start date. */
export function dateRange(trip: Trip): string {
  const start = parseISODate(trip.startDate)
  if (!start) return ''
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const days = Math.max(1, trip.days.length)
  if (days === 1) return fmt(start)
  const end = new Date(start)
  end.setDate(end.getDate() + days - 1)
  return `${fmt(start)} to ${fmt(end)}`
}
