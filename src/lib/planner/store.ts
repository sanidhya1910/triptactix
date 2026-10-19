import { create } from 'zustand'
import { perPerson, totalCost } from './calc'
import { makeItem, seedTrip, uid } from './seed'
import { loadState, saveState } from './storage'
import type { Day, Item, ItemKind, Trip } from './types'
import { WHOLE } from './types'

interface Toast {
  id: number
  message: string
  /**
   * Reverses one deletion against the trip as it is when Undo is pressed. This is an
   * inverse operation rather than a snapshot, so edits made while the toast is showing
   * are kept instead of being rolled back along with the deletion.
   */
  undo?: (current: Trip) => Trip
}

interface State {
  trip: Trip
  confirmDayId: string | null
  toast: Toast | null

  setTitle: (v: string) => void
  setStartDate: (v: string) => void
  setTravellers: (v: number) => void
  setNotes: (v: string) => void

  /** Returns the new day's id. */
  addDay: () => string
  requestRemoveDay: (id: string) => void
  cancelRemoveDay: () => void
  removeDay: (id: string) => void
  updateDay: (id: string, patch: Partial<Pick<Day, 'title' | 'notes'>>) => void

  /** Returns the new item's id, so the caller can focus it. */
  addItem: (container: string, kind: ItemKind, title?: string) => string
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void
  removeItem: (id: string) => void
  moveItem: (itemId: string, toContainer: string, toIndex: number) => void

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
  const notify = (message: string, undo?: Toast['undo']) => set({ toast: { id: ++toastSeq, message, undo } })

  return {
    trip: initialTrip,
    confirmDayId: null,
    toast: null,

    setTitle: (title) => edit((t) => ({ ...t, title })),
    setStartDate: (startDate) => edit((t) => ({ ...t, startDate })),
    setTravellers: (n) => edit((t) => ({ ...t, travellers: Math.max(1, Math.min(50, Math.round(n) || 1)) })),
    setNotes: (notes) => edit((t) => ({ ...t, notes })),

    addDay: () => {
      const day: Day = { id: uid(), title: '', notes: '', items: [] }
      edit((t) => ({ ...t, days: [...t.days, day] }))
      return day.id
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
      const index = before.days.findIndex((d) => d.id === id)
      if (index < 0) return
      const day = before.days[index]
      set({ trip: { ...before, days: before.days.filter((d) => d.id !== id) }, confirmDayId: null })
      notify(`Day ${index + 1} removed`, (t) => {
        const days = [...t.days]
        days.splice(Math.min(index, days.length), 0, day)
        return { ...t, days }
      })
    },
    updateDay: (id, patch) =>
      edit((t) => ({ ...t, days: t.days.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

    addItem: (container, kind, title = '') => {
      const item = makeItem(kind, title)
      edit((t) => setList(t, container, [...(getList(t, container) ?? []), item]))
      return item.id
    },
    updateItem: (id, patch) =>
      edit((t) => mapItems(t, (items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)))),
    removeItem: (id) => {
      const before = get().trip
      const from = containerOf(before, id)
      if (!from) return
      const list = getList(before, from)!
      const index = list.findIndex((i) => i.id === id)
      const item = list[index]
      edit((t) => mapItems(t, (items) => items.filter((i) => i.id !== id)))
      notify(`Removed ${item.title || 'item'}`, (t) => {
        // If its day was removed in the meantime, put it back under shared costs.
        const target = getList(t, from) ? from : WHOLE
        const items = [...getList(t, target)!]
        items.splice(Math.min(index, items.length), 0, item)
        return setList(t, target, items)
      })
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

    undo: () => {
      const undo = get().toast?.undo
      if (undo) set((s) => ({ trip: undo(s.trip), toast: null }))
    },
    dismissToast: () => set({ toast: null }),
  }
})

useTrip.subscribe((s) => saveState({ trip: s.trip }))

// Selectors
export const selectTotal = (s: State) => totalCost(s.trip)
export const selectPerPerson = (s: State) => perPerson(s.trip)
