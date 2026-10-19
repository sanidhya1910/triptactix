import type { Item, ItemKind, Trip } from './types'

let n = 0
export const uid = (): string => `${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const makeItem = (kind: ItemKind, title: string, amount = 0, note = ''): Item => ({
  id: uid(),
  kind,
  title,
  note,
  amount,
})

export const seedTrip = (): Trip => ({
  title: 'Karnataka and Kerala road trip',
  startDate: '2026-11-14',
  travellers: 2,
  notes: '',
  wholeTrip: [makeItem('flight', 'Flights for two', 30000)],
  customPlaces: [],
  days: [
    {
      id: uid(),
      title: 'Bangalore to Mysore',
      notes: '',
      items: [
        makeItem('cab', 'Cab', 3150, 'About 145 km, fare 2,750 plus driver 400'),
        makeItem('fees', 'Tolls', 500),
        makeItem('place', 'Mysore Palace'),
        makeItem('food', 'Lunch', 800),
      ],
    },
    {
      id: uid(),
      title: 'Mysore to Wayanad',
      notes: '',
      items: [
        makeItem('cab', 'Cab', 3150),
        makeItem('fees', 'Kerala entry and permit tax', 800),
        makeItem('food', 'Lunch', 800),
        makeItem('place', 'Wayanad'),
      ],
    },
    {
      id: uid(),
      title: 'Around Wayanad',
      notes: '',
      items: [
        makeItem('cab', 'Cab', 3150),
        makeItem('fees', 'Parking', 300),
        makeItem('place', 'Edakkal Caves'),
        makeItem('place', 'Banasura Sagar Dam'),
        makeItem('food', 'Lunch', 800),
      ],
    },
    {
      id: uid(),
      title: 'Wayanad to Mangalore',
      notes: '',
      items: [makeItem('cab', 'Cab', 3150), makeItem('food', 'Lunch', 800), makeItem('place', 'Mangalore')],
    },
  ],
})

export const DEFAULT_PLACES = [
  'Bangalore',
  'Mysore',
  'Wayanad',
  'Mangalore',
  'Mysore Palace',
  'Chamundi Hills',
  'Edakkal Caves',
  'Banasura Sagar Dam',
  'Panambur Beach',
]

export interface QuickTile {
  label: string
  kind: ItemKind
  title: string
}

export const QUICK_TILES: QuickTile[] = [
  { label: 'Cab ride', kind: 'cab', title: 'Cab ride' },
  { label: 'Lunch', kind: 'food', title: 'Lunch' },
  { label: 'Tolls', kind: 'fees', title: 'Tolls' },
  { label: 'Flight', kind: 'flight', title: 'Flight' },
  { label: 'Stay', kind: 'stay', title: 'Stay' },
  { label: 'Note', kind: 'other', title: 'Note' },
]
