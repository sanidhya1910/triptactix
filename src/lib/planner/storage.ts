import type { Item, Trip } from './types'
import { KINDS } from './types'

/**
 * Persistence boundary. Swap these two functions for API calls to move to a backend.
 */
export interface Persisted {
  trip: Trip
}

const KEY = 'triptactix-planner-v1'

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown): v is string => typeof v === 'string'

const isItem = (v: unknown): v is Item =>
  isObj(v) && isStr(v.id) && isStr(v.kind) && v.kind in KINDS && isStr(v.title) && isStr(v.note) && typeof v.amount === 'number'

const isTrip = (v: unknown): v is Trip =>
  isObj(v) &&
  isStr(v.title) &&
  isStr(v.startDate) &&
  typeof v.travellers === 'number' &&
  isStr(v.notes) &&
  Array.isArray(v.wholeTrip) &&
  v.wholeTrip.every(isItem) &&
  Array.isArray(v.customPlaces) &&
  v.customPlaces.every(isStr) &&
  Array.isArray(v.days) &&
  v.days.every((d) => isObj(d) && isStr(d.id) && isStr(d.title) && isStr(d.notes) && Array.isArray(d.items) && d.items.every(isItem))

/**
 * Saved data is untrusted: it may be from an older schema, hand-edited, or truncated.
 * Anything that does not match the current shape is discarded rather than loaded,
 * because a bad value here would crash the planner on every visit.
 */
export function parseState(raw: string | null): Persisted | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!isObj(v) || !isTrip(v.trip)) return null
    // Earlier versions also saved a `dark` flag. It is ignored rather than rejected,
    // so trips saved before the planner joined the site theme still load.
    return { trip: v.trip }
  } catch {
    return null
  }
}

export function loadState(): Persisted | null {
  try {
    return parseState(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function saveState(state: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or blocked: ignore */
  }
}
