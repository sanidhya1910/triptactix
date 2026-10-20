export type ItemKind = 'place' | 'cab' | 'food' | 'flight' | 'stay' | 'fees' | 'other'

export interface Person {
  id: string
  name: string
}

export interface Item {
  id: string
  kind: ItemKind
  title: string
  note: string
  /** Whole rupees. */
  amount: number
  /** Who paid. null until someone is chosen; such costs are left out of settling up. */
  paidBy: string | null
  /**
   * Who shares the cost. Empty means everyone, including people added later, which is
   * what almost every cost means; a list is only stored when someone sits a cost out.
   */
  sharedBy: string[]
}

export interface Day {
  id: string
  title: string
  notes: string
  items: Item[]
}

export interface Trip {
  id: string
  title: string
  startDate: string // yyyy-mm-dd
  notes: string
  /** At least one. The traveller count is people.length. */
  people: Person[]
  /** Spending limit for the whole trip in rupees, or null when none is set. */
  budget: number | null
  wholeTrip: Item[]
  days: Day[]
  customPlaces: string[]
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  /** Set when the trip was made from a saved AI itinerary. */
  source?: { kind: 'itinerary'; savedTripId: string }
}

/** What is saved on the device, and what the Download button writes. */
export interface PlannerFile {
  version: 2
  trips: Trip[]
}

/**
 * The single-trip shape saved before version 2, under `triptactix-planner-v1`, and
 * written by its Download button. Read only, for migration and import.
 */
export interface TripV1 {
  title: string
  startDate: string
  travellers: number
  notes: string
  wholeTrip: Array<Omit<Item, 'paidBy' | 'sharedBy'>>
  days: Array<Omit<Day, 'items'> & { items: Array<Omit<Item, 'paidBy' | 'sharedBy'>> }>
  customPlaces: string[]
}

/** Id used for the shared-costs container in drag and drop. */
export const WHOLE = 'whole'

export const KINDS: Record<ItemKind, { label: string; split: string }> = {
  flight: { label: 'Flight', split: 'Flights' },
  cab: { label: 'Cab', split: 'Cab' },
  food: { label: 'Food', split: 'Food' },
  fees: { label: 'Tolls and fees', split: 'Tolls and fees' },
  stay: { label: 'Stay', split: 'Stay' },
  place: { label: 'Place', split: 'Sightseeing' },
  other: { label: 'Other', split: 'Other' },
}

/** Order used in the cost split line. */
export const SPLIT_ORDER: ItemKind[] = ['flight', 'cab', 'food', 'fees', 'stay', 'place', 'other']
