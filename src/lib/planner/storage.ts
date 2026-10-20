import type { Day, Item, Person, PlannerFile, Trip, TripV1 } from './types'
import { KINDS } from './types'
import { makePerson, nowISO, uid } from './seed'
import { isFiniteNumber, isRecord, isString, readJSON, writeJSON } from '@/lib/storage'

/**
 * Persistence boundary for the planner. Everything here treats input as untrusted: saved
 * data can come from an older version, a hand edit or a truncated write, and imported
 * files can be anything at all. Nothing that fails validation is ever loaded, because a
 * bad value would otherwise crash the planner on every visit.
 */

export const KEY = 'triptactix-planner-v2'
/** The single-trip key used before version 2. Read once for migration, never written. */
export const KEY_V1 = 'triptactix-planner-v1'

// ---- Validation -------------------------------------------------------------

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString)

const isKind = (v: unknown): v is Item['kind'] => isString(v) && v in KINDS

/** The fields every item has had since version 1. */
const isItemV1 = (v: unknown): v is Omit<Item, 'paidBy' | 'sharedBy'> =>
  isRecord(v) && isString(v.id) && isKind(v.kind) && isString(v.title) && isString(v.note) && isFiniteNumber(v.amount)

const isItem = (v: unknown): v is Item => {
  if (!isItemV1(v)) return false
  const r = v as Record<string, unknown>
  return (r.paidBy === null || isString(r.paidBy)) && isStringArray(r.sharedBy)
}

const isDayWith =
  (itemGuard: (v: unknown) => boolean) =>
  (v: unknown): boolean =>
    isRecord(v) && isString(v.id) && isString(v.title) && isString(v.notes) && Array.isArray(v.items) && v.items.every(itemGuard)

const isPerson = (v: unknown): v is Person => isRecord(v) && isString(v.id) && isString(v.name)

export const isTrip = (v: unknown): v is Trip =>
  isRecord(v) &&
  isString(v.id) &&
  isString(v.title) &&
  isString(v.startDate) &&
  isString(v.notes) &&
  Array.isArray(v.people) &&
  v.people.length > 0 &&
  v.people.every(isPerson) &&
  (v.budget === null || isFiniteNumber(v.budget)) &&
  Array.isArray(v.wholeTrip) &&
  v.wholeTrip.every(isItem) &&
  Array.isArray(v.days) &&
  v.days.every(isDayWith(isItem)) &&
  isStringArray(v.customPlaces) &&
  isString(v.createdAt) &&
  isString(v.updatedAt)

const isTripV1 = (v: unknown): v is TripV1 =>
  isRecord(v) &&
  isString(v.title) &&
  isString(v.startDate) &&
  isFiniteNumber(v.travellers) &&
  isString(v.notes) &&
  Array.isArray(v.wholeTrip) &&
  v.wholeTrip.every(isItemV1) &&
  Array.isArray(v.days) &&
  v.days.every(isDayWith(isItemV1)) &&
  isStringArray(v.customPlaces)

// ---- Migration --------------------------------------------------------------

/**
 * Version 1 had a traveller count and no people. Each traveller becomes a named
 * placeholder the user can rename, and every cost starts with no payer and shared by
 * everyone, which is exactly what version 1 assumed.
 */
export function migrateV1(v1: TripV1): Trip {
  const t = nowISO()
  const count = Math.max(1, Math.min(50, Math.round(v1.travellers) || 1))
  const upgrade = (i: Omit<Item, 'paidBy' | 'sharedBy'>): Item => ({ ...i, paidBy: null, sharedBy: [] })
  return {
    id: uid(),
    title: v1.title,
    startDate: v1.startDate,
    notes: v1.notes,
    people: Array.from({ length: count }, (_, i) => makePerson(`Traveller ${i + 1}`)),
    budget: null,
    wholeTrip: v1.wholeTrip.map(upgrade),
    days: v1.days.map((d): Day => ({ ...d, items: d.items.map(upgrade) })),
    customPlaces: v1.customPlaces,
    createdAt: t,
    updatedAt: t,
  }
}

/** A trip in any shape this app has ever written, as a current trip; null if it is not one. */
export function parseTrip(v: unknown): Trip | null {
  if (isTrip(v)) return v
  if (isTripV1(v)) return migrateV1(v)
  return null
}

/**
 * Every trip in a saved value or an imported file. Accepts the current file format, the
 * version 1 saved state (`{ trip }`), and the bare trip object version 1's Download
 * button wrote. Returns null when the value is none of these.
 */
export function parsePlannerFile(v: unknown): Trip[] | null {
  if (isRecord(v) && v.version === 2 && Array.isArray(v.trips)) {
    // A file is accepted if it holds at least one usable trip; bad entries are dropped.
    const trips = v.trips.map(parseTrip).filter((t): t is Trip => t !== null)
    return trips.length > 0 || v.trips.length === 0 ? trips : null
  }
  if (isRecord(v) && 'trip' in v) {
    const trip = parseTrip(v.trip)
    return trip ? [trip] : null
  }
  const single = parseTrip(v)
  return single ? [single] : null
}

/** Parses the text of an imported file. Never throws. */
export function parseImport(text: string): Trip[] | null {
  try {
    return parsePlannerFile(JSON.parse(text))
  } catch {
    return null
  }
}

// ---- Device storage ---------------------------------------------------------

/** The trips saved on this device, migrating a version 1 trip the first time. */
export function loadTrips(): Trip[] {
  const saved = parsePlannerFile(readJSON(KEY))
  if (saved) return saved
  return parsePlannerFile(readJSON(KEY_V1)) ?? []
}

/** False when the browser refused the write, so the UI can say it was not saved. */
export function saveTrips(trips: Trip[]): boolean {
  const file: PlannerFile = { version: 2, trips }
  return writeJSON(KEY, file)
}

/** One trip as a downloadable file, in the same format the planner imports. */
export const exportFile = (trip: Trip): string => JSON.stringify({ version: 2, trips: [trip] } satisfies PlannerFile, null, 2)
