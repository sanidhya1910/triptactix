import { create } from 'zustand'
import { perPerson, totalCost } from './calc'
import { makeItem, seedTrip, uid } from './seed'
import { loadState, saveState } from './storage'
import type { Day, Item, ItemKind, Trip } from './types'
import { WHOLE } from './types'

interface Toast {
  id: number
  message: string
  undo?: Trip
}

interface State {
  trip: Trip
  dark: boolean
  selected: string // day id or WHOLE
  confirmDayId: string | null
  toast: Toast | null

  setTitle: (v: string) => void
  setStartDate: (v: string) => void
  setTravellers: (v: number) => void
  setNotes: (v: string) => void
  toggleDark: () => void
  select: (id: string) => void

  addDay: () => void
  requestRemoveDay: (id: string) => void
  cancelRemoveDay: () => void
  removeDay: (id: string) => void
  updateDay: (id: string, patch: Partial<Pick<Day, 'title' | 'notes'>>) => void

  addItem: (container: string, kind: ItemKind, title: string) => string
  addToSelected: (kind: ItemKind, title: string) => void
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void
  removeItem: (id: string) => void
  moveItem: (itemId: string, toContainer: string, toIndex: number) => void

  addPlace: (name: string) => void
  removePlace: (name: string) => void

  undo: () => void
  dismissToast: () => void
}

const persisted = loadState()
const initialTrip: Trip = persisted?.trip ?? seedTrip()

let toastSeq = 0

const mapItems = (trip: Trip, fn: (items: Item[]) => Item[]): Trip => ({
  ...trip,
  wholeTrip: fn(trip.wholeTrip),
  days: trip.days.map((d) => ({ ...d, items: fn(d.items) })),
})

const getList = (trip: Trip, container: string): Item[] | undefined =>
  container === WHOLE ? trip.wholeTrip : trip.days.find((d) => d.id === container)?.items

const setList = (trip: Trip, container: string, items: Item[]): Trip =>
  container === WHOLE
    ? { ...trip, wholeTrip: items }
    : { ...trip, days: trip.days.map((d) => (d.id === container ? { ...d, items } : d)) }

export const containerOf = (trip: Trip, itemId: string): string | null => {
  if (trip.wholeTrip.some((i) => i.id === itemId)) return WHOLE
  return trip.days.find((d) => d.items.some((i) => i.id === itemId))?.id ?? null
}

export const useTrip = create<State>((set, get) => {
  const edit = (fn: (t: Trip) => Trip) => set((s) => ({ trip: fn(s.trip) }))
  const notify = (message: string, undo?: Trip) => set({ toast: { id: ++toastSeq, message, undo } })

  return {
    trip: initialTrip,
    dark: persisted?.dark ?? false,
    selected: initialTrip.days[0]?.id ?? WHOLE,
    confirmDayId: null,
    toast: null,

    setTitle: (title) => edit((t) => ({ ...t, title })),
    setStartDate: (startDate) => edit((t) => ({ ...t, startDate })),
    setTravellers: (n) => edit((t) => ({ ...t, travellers: Math.max(1, Math.min(50, Math.round(n) || 1)) })),
    setNotes: (notes) => edit((t) => ({ ...t, notes })),
    toggleDark: () => set((s) => ({ dark: !s.dark })),
    select: (selected) => set({ selected }),

    addDay: () => {
      const day: Day = { id: uid(), title: '', notes: '', items: [] }
      set((s) => ({ trip: { ...s.trip, days: [...s.trip.days, day] }, selected: day.id }))
    },
    requestRemoveDay: (id) => {
      const day = get().trip.days.find((d) => d.id === id)
      if (!day) return
      if (day.items.length > 0) set({ confirmDayId: id })
      else get().removeDay(id)
    },
    cancelRemoveDay: () => set({ confirmDayId: null }),
    removeDay: (id) => {
      const before = get().trip
      const after = { ...before, days: before.days.filter((d) => d.id !== id) }
      set((s) => ({
        trip: after,
        confirmDayId: null,
        selected: s.selected === id ? (after.days[0]?.id ?? WHOLE) : s.selected,
      }))
      notify('Day removed', before)
    },
    updateDay: (id, patch) =>
      edit((t) => ({ ...t, days: t.days.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

    addItem: (container, kind, title) => {
      const item = makeItem(kind, title)
      edit((t) => setList(t, container, [...(getList(t, container) ?? []), item]))
      return item.id
    },
    addToSelected: (kind, title) => {
      const { trip, selected } = get()
      const target = getList(trip, selected) ? selected : WHOLE
      get().addItem(target, kind, title)
      const where = target === WHOLE ? 'Whole trip' : `Day ${trip.days.findIndex((d) => d.id === target) + 1}`
      notify(`Added ${title} to ${where}`)
    },
    updateItem: (id, patch) =>
      edit((t) => mapItems(t, (items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)))),
    removeItem: (id) => {
      const before = get().trip
      edit((t) => mapItems(t, (items) => items.filter((i) => i.id !== id)))
      notify('Item deleted', before)
    },
    moveItem: (itemId, toContainer, toIndex) =>
      edit((t) => {
        const from = containerOf(t, itemId)
        if (!from || !getList(t, toContainer)) return t
        const item = getList(t, from)!.find((i) => i.id === itemId)!
        let next = setList(t, from, getList(t, from)!.filter((i) => i.id !== itemId))
        const list = [...getList(next, toContainer)!]
        list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, item)
        next = setList(next, toContainer, list)
        return next
      }),

    addPlace: (name) => {
      const n = name.trim()
      if (!n) return
      edit((t) => (t.customPlaces.includes(n) ? t : { ...t, customPlaces: [...t.customPlaces, n] }))
    },
    removePlace: (name) => {
      const before = get().trip
      edit((t) => ({ ...t, customPlaces: t.customPlaces.filter((p) => p !== name) }))
      notify(`Removed ${name} from places`, before)
    },

    undo: () => {
      const undo = get().toast?.undo
      if (undo) set({ trip: undo, toast: null })
    },
    dismissToast: () => set({ toast: null }),
  }
})

useTrip.subscribe((s) => saveState({ trip: s.trip, dark: s.dark }))

// Selectors
export const selectTotal = (s: State) => totalCost(s.trip)
export const selectPerPerson = (s: State) => perPerson(s.trip)
