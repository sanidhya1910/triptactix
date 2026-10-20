import type { Item, ItemKind, Person, Trip } from './types'
import { addDays, todayISO } from '@/lib/dates'

let n = 0
export const uid = (): string => `${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const nowISO = () => new Date().toISOString()

export const makePerson = (name: string): Person => ({ id: uid(), name })

export const makeItem = (
  kind: ItemKind,
  title: string,
  amount = 0,
  note = '',
  paidBy: string | null = null,
): Item => ({ id: uid(), kind, title, note, amount, paidBy, sharedBy: [] })

/** An empty trip with one traveller, starting a month from today. */
export const blankTrip = (): Trip => {
  const t = nowISO()
  return {
    id: uid(),
    title: '',
    startDate: addDays(todayISO(), 30),
    notes: '',
    people: [makePerson('You')],
    budget: null,
    wholeTrip: [],
    days: [{ id: uid(), title: '', notes: '', items: [] }],
    customPlaces: [],
    createdAt: t,
    updatedAt: t,
  }
}

/**
 * A worked example: two travellers who each paid for different things, so the
 * settle-up panel has something to show. Total 47,400; Asha paid 33,200 and Ravi
 * 14,200 against equal shares of 23,700, so Ravi owes Asha 9,500.
 */
export const seedTrip = (): Trip => {
  const asha = makePerson('Asha')
  const ravi = makePerson('Ravi')
  const t = nowISO()
  return {
    id: uid(),
    title: 'Karnataka and Kerala road trip',
    startDate: '2026-11-14',
    notes: '',
    people: [asha, ravi],
    budget: 50000,
    wholeTrip: [makeItem('flight', 'Flights for two', 30000, '', asha.id)],
    customPlaces: [],
    createdAt: t,
    updatedAt: t,
    days: [
      {
        id: uid(),
        title: 'Bangalore to Mysore',
        notes: '',
        items: [
          makeItem('cab', 'Cab', 3150, 'About 145 km, fare 2,750 plus driver 400', ravi.id),
          makeItem('fees', 'Tolls', 500, '', ravi.id),
          makeItem('place', 'Mysore Palace'),
          makeItem('food', 'Lunch', 800, '', asha.id),
        ],
      },
      {
        id: uid(),
        title: 'Mysore to Wayanad',
        notes: '',
        items: [
          makeItem('cab', 'Cab', 3150, '', ravi.id),
          makeItem('fees', 'Kerala entry and permit tax', 800, '', ravi.id),
          makeItem('food', 'Lunch', 800, '', asha.id),
          makeItem('place', 'Wayanad'),
        ],
      },
      {
        id: uid(),
        title: 'Around Wayanad',
        notes: '',
        items: [
          makeItem('cab', 'Cab', 3150, '', ravi.id),
          makeItem('fees', 'Parking', 300, '', ravi.id),
          makeItem('place', 'Edakkal Caves'),
          makeItem('place', 'Banasura Sagar Dam'),
          makeItem('food', 'Lunch', 800, '', asha.id),
        ],
      },
      {
        id: uid(),
        title: 'Wayanad to Mangalore',
        notes: '',
        items: [
          makeItem('cab', 'Cab', 3150, '', ravi.id),
          makeItem('food', 'Lunch', 800, '', asha.id),
          makeItem('place', 'Mangalore'),
        ],
      },
    ],
  }
}
