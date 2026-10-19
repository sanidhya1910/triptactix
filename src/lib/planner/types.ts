export type ItemKind = 'place' | 'cab' | 'food' | 'flight' | 'stay' | 'fees' | 'other'

export interface Item {
  id: string
  kind: ItemKind
  title: string
  note: string
  amount: number
}

export interface Day {
  id: string
  title: string
  notes: string
  items: Item[]
}

export interface Trip {
  title: string
  startDate: string // yyyy-mm-dd
  travellers: number
  notes: string
  wholeTrip: Item[]
  days: Day[]
  customPlaces: string[]
}

/** Id used for the "Whole trip" container in drag and drop and selection. */
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
