import type { Item, ItemKind, Trip } from './types'
import { SPLIT_ORDER } from './types'

export const sumItems = (items: Item[]): number =>
  items.reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0)

export const allItems = (trip: Trip): Item[] => [...trip.wholeTrip, ...trip.days.flatMap((d) => d.items)]

export const totalCost = (trip: Trip): number => sumItems(allItems(trip))

export const perPerson = (trip: Trip): number =>
  trip.travellers > 0 ? Math.round(totalCost(trip) / trip.travellers) : 0

export const costByKind = (trip: Trip): Record<ItemKind, number> => {
  const out = Object.fromEntries(SPLIT_ORDER.map((k) => [k, 0])) as Record<ItemKind, number>
  for (const i of allItems(trip)) out[i.kind] += Number.isFinite(i.amount) ? i.amount : 0
  return out
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export const formatINR = (n: number): string => `₹${inr.format(Math.round(n))}`
export const formatNumber = (n: number): string => inr.format(n)

export const parseAmount = (s: string): number => {
  const digits = s.replace(/[^0-9]/g, '')
  return digits ? Math.min(Number(digits), 99999999) : 0
}

export const dayDate = (startDate: string, index: number): string => {
  if (!startDate) return ''
  const d = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + index)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
