import { useRef } from 'react'
import { create } from 'zustand'
import { perPerson, totalCost } from './calc'
import { blankTrip, makeItem, makePerson, nowISO, seedTrip, uid } from './seed'
import { KEY, loadTrips, saveTrips } from './storage'
import type { Day, Item, ItemKind, Trip } from './types'
import { WHOLE } from './types'
import { readJSON } from '@/lib/storage'

interface Toast {
  id: number
  message: string
  /**
   * Reverses one deletion against the trips as they are when Undo is pressed. This is an
   * inverse operation rather than a snapshot, so edits made while the toast is showing
   * are kept instead of being rolled back along with the deletion.
   */
  undo?: (trips: Trip[]) => Trip[]
}

interface State {
  trips: Trip[]
  /** The trip open in the editor, or null on the list of budgets. */
  activeId: string | null
  confirmDayId: string | null
  confirmPersonId: string | null
  toast: Toast | null
  /** True after the browser refused to save, e.g. because storage is full. */
  saveFailed: boolean

  // ---- Trips ----
  setActive: (id: string | null) => void
  createTrip: (from: 'blank' | 'sample') => string
  /** Adds already-built trips (an import, a converted itinerary). Returns their ids. */
  addTrips: (trips: Trip[]) => string[]
  duplicateTrip: (id: string) => string | null
  deleteTrip: (id: string) => void

  // ---- The active trip ----
  setTitle: (v: string) => void
  setStartDate: (v: string) => void
  setNotes: (v: string) => void
  setBudget: (v: number | null) => void

  /** Returns the new person's id. */
  addPerson: (name: string) => string | null
  renamePerson: (id: string, name: string) => void
  /** Asks first if the person paid for or sits out of any cost; otherwise removes. */
  requestRemovePerson: (id: string) => void
  cancelRemovePerson: () => void
  removePerson: (id: string) => void

  /** Returns the new day's id. */
  addDay: () => string | null
  duplicateDay: (id: string) => string | null
  moveDay: (id: string, delta: -1 | 1) => void
  requestRemoveDay: (id: string) => void
  cancelRemoveDay: () => void
  removeDay: (id: string) => void
  updateDay: (id: string, patch: Partial<Pick<Day, 'title' | 'notes'>>) => void

  /** Returns the new item's id, so the caller can focus it. */
  addItem: (container: string, kind: ItemKind, title?: string) => string | null
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void
  duplicateItem: (id: string) => string | null
  removeItem: (id: string) => void
  moveItem: (itemId: string, toContainer: string, toIndex: number) => void

  undo: () => void
  dismissToast: () => void
}

// ---- Pure helpers -----------------------------------------------------------

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

const findItem = (trip: Trip, id: string) => [...trip.wholeTrip, ...trip.days.flatMap((d) => d.items)].find((i) => i.id === id)

/** A deep copy with fresh ids everywhere, so the copy never shares an id with the original. */
function cloneTrip(trip: Trip, title = trip.title): Trip {
  const personIds = new Map(trip.people.map((p) => [p.id, uid()]))
  const remapItem = (i: Item): Item => ({
    ...i,
    id: uid(),
    paidBy: i.paidBy ? (personIds.get(i.paidBy) ?? null) : null,
    sharedBy: i.sharedBy.map((id) => personIds.get(id)).filter((id): id is string => !!id),
  })
  const t = nowISO()
  return {
    ...trip,
    id: uid(),
    title,
    people: trip.people.map((p) => ({ ...p, id: personIds.get(p.id)! })),
    wholeTrip: trip.wholeTrip.map(remapItem),
    days: trip.days.map((d) => ({ ...d, id: uid(), items: d.items.map(remapItem) })),
    createdAt: t,
    updatedAt: t,
    source: undefined,
  }
}

const usesPerson = (trip: Trip, personId: string) =>
  [...trip.wholeTrip, ...trip.days.flatMap((d) => d.items)].some(
    (i) => i.paidBy === personId || i.sharedBy.includes(personId),
  )

// ---- Initial state ----------------------------------------------------------

const initialTrips = loadTrips()
// A trip migrated from version 1 gets new ids on every load until it is written back,
// which would break its ?trip= link between reloads, so save the migration now.
if (initialTrips.length > 0 && readJSON(KEY) === undefined) saveTrips(initialTrips)

let toastSeq = 0

export const useTrip = create<State>((set, get) => {
  const notify = (message: string, undo?: Toast['undo']) => set({ toast: { id: ++toastSeq, message, undo } })

  /** Applies `fn` to the active trip and stamps it as edited. No-op without one. */
  const edit = (fn: (t: Trip) => Trip) =>
    set((s) => ({
      trips: s.trips.map((t) => (t.id === s.activeId ? { ...fn(t), updatedAt: nowISO() } : t)),
    }))

  const active = () => {
    const { trips, activeId } = get()
    return trips.find((t) => t.id === activeId)
  }

  /** An undo that applies `fn` to one trip, if it still exists. */
  const onTrip =
    (tripId: string, fn: (t: Trip) => Trip): Toast['undo'] =>
    (trips) =>
      trips.map((t) => (t.id === tripId ? { ...fn(t), updatedAt: nowISO() } : t))

  return {
    trips: initialTrips,
    activeId: null,
    confirmDayId: null,
    confirmPersonId: null,
    toast: null,
    saveFailed: false,

    // ---- Trips ----
    setActive: (activeId) => set({ activeId, confirmDayId: null, confirmPersonId: null }),

    createTrip: (from) => {
      const trip = from === 'sample' ? seedTrip() : blankTrip()
      set((s) => ({ trips: [trip, ...s.trips] }))
      return trip.id
    },

    addTrips: (incoming) => {
      // Imported files may repeat an id already on this device; re-id those so nothing
      // is silently overwritten.
      const taken = new Set(get().trips.map((t) => t.id))
      const added = incoming.map((t) => (taken.has(t.id) ? cloneTrip(t) : t))
      set((s) => ({ trips: [...added, ...s.trips] }))
      return added.map((t) => t.id)
    },

    duplicateTrip: (id) => {
      const original = get().trips.find((t) => t.id === id)
      if (!original) return null
      const copy = cloneTrip(original, original.title ? `${original.title} (copy)` : '')
      set((s) => {
        const at = s.trips.findIndex((t) => t.id === id)
        const trips = [...s.trips]
        trips.splice(at, 0, copy)
        return { trips }
      })
      notify('Budget duplicated')
      return copy.id
    },

    deleteTrip: (id) => {
      const before = get().trips
      const index = before.findIndex((t) => t.id === id)
      if (index < 0) return
      const trip = before[index]
      set((s) => ({ trips: s.trips.filter((t) => t.id !== id), activeId: s.activeId === id ? null : s.activeId }))
      notify(`Deleted ${trip.title || 'untitled budget'}`, (trips) => {
        if (trips.some((t) => t.id === trip.id)) return trips
        const next = [...trips]
        next.splice(Math.min(index, next.length), 0, trip)
        return next
      })
    },

    // ---- The active trip ----
    setTitle: (title) => edit((t) => ({ ...t, title })),
    setStartDate: (startDate) => edit((t) => ({ ...t, startDate })),
    setNotes: (notes) => edit((t) => ({ ...t, notes })),
    setBudget: (budget) => edit((t) => ({ ...t, budget: budget && budget > 0 ? budget : null })),

    addPerson: (name) => {
      const trip = active()
      if (!trip || trip.people.length >= 50) return null
      const person = makePerson(name.trim() || `Traveller ${trip.people.length + 1}`)
      edit((t) => ({ ...t, people: [...t.people, person] }))
      return person.id
    },
    renamePerson: (id, name) =>
      edit((t) => ({ ...t, people: t.people.map((p) => (p.id === id ? { ...p, name } : p)) })),
    requestRemovePerson: (id) => {
      const trip = active()
      if (!trip || trip.people.length <= 1) return
      if (usesPerson(trip, id)) set({ confirmPersonId: id })
      else get().removePerson(id)
    },
    cancelRemovePerson: () => set({ confirmPersonId: null }),
    removePerson: (id) => {
      const trip = active()
      if (!trip || trip.people.length <= 1) return
      const index = trip.people.findIndex((p) => p.id === id)
      if (index < 0) return
      const person = trip.people[index]
      // Remember exactly what referenced them, so undo can put it back.
      const refs = [...trip.wholeTrip, ...trip.days.flatMap((d) => d.items)]
        .filter((i) => i.paidBy === id || i.sharedBy.includes(id))
        .map((i) => ({ id: i.id, paidBy: i.paidBy, sharedBy: i.sharedBy }))

      edit((t) =>
        mapItems({ ...t, people: t.people.filter((p) => p.id !== id) }, (items) =>
          items.map((i) =>
            i.paidBy === id || i.sharedBy.includes(id)
              ? { ...i, paidBy: i.paidBy === id ? null : i.paidBy, sharedBy: i.sharedBy.filter((x) => x !== id) }
              : i,
          ),
        ),
      )
      set({ confirmPersonId: null })
      notify(
        `Removed ${person.name || 'traveller'}`,
        onTrip(trip.id, (t) => {
          if (t.people.some((p) => p.id === person.id)) return t
          const people = [...t.people]
          people.splice(Math.min(index, people.length), 0, person)
          const byId = new Map(refs.map((r) => [r.id, r]))
          return mapItems({ ...t, people }, (items) =>
            items.map((i) => {
              const r = byId.get(i.id)
              return r ? { ...i, paidBy: r.paidBy, sharedBy: r.sharedBy } : i
            }),
          )
        }),
      )
    },

    addDay: () => {
      if (!active()) return null
      const day: Day = { id: uid(), title: '', notes: '', items: [] }
      edit((t) => ({ ...t, days: [...t.days, day] }))
      return day.id
    },
    duplicateDay: (id) => {
      const trip = active()
      const index = trip?.days.findIndex((d) => d.id === id) ?? -1
      if (!trip || index < 0) return null
      const src = trip.days[index]
      const copy: Day = { ...src, id: uid(), items: src.items.map((i) => ({ ...i, id: uid() })) }
      edit((t) => {
        const days = [...t.days]
        days.splice(index + 1, 0, copy)
        return { ...t, days }
      })
      return copy.id
    },
    moveDay: (id, delta) =>
      edit((t) => {
        const from = t.days.findIndex((d) => d.id === id)
        const to = from + delta
        if (from < 0 || to < 0 || to >= t.days.length) return t
        const days = [...t.days]
        const [day] = days.splice(from, 1)
        days.splice(to, 0, day)
        return { ...t, days }
      }),
    requestRemoveDay: (id) => {
      const day = active()?.days.find((d) => d.id === id)
      if (!day) return
      if (day.items.length > 0) set({ confirmDayId: id })
      else get().removeDay(id)
    },
    cancelRemoveDay: () => set({ confirmDayId: null }),
    removeDay: (id) => {
      const trip = active()
      const index = trip?.days.findIndex((d) => d.id === id) ?? -1
      if (!trip || index < 0) return
      const day = trip.days[index]
      edit((t) => ({ ...t, days: t.days.filter((d) => d.id !== id) }))
      set({ confirmDayId: null })
      notify(
        `Day ${index + 1} removed`,
        onTrip(trip.id, (t) => {
          if (t.days.some((d) => d.id === day.id)) return t
          const days = [...t.days]
          days.splice(Math.min(index, days.length), 0, day)
          return { ...t, days }
        }),
      )
    },
    updateDay: (id, patch) =>
      edit((t) => ({ ...t, days: t.days.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

    addItem: (container, kind, title = '') => {
      const trip = active()
      if (!trip || !getList(trip, container)) return null
      const item = makeItem(kind, title)
      edit((t) => setList(t, container, [...(getList(t, container) ?? []), item]))
      return item.id
    },
    updateItem: (id, patch) =>
      edit((t) => mapItems(t, (items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)))),
    duplicateItem: (id) => {
      const trip = active()
      const from = trip ? containerOf(trip, id) : null
      if (!trip || !from) return null
      const list = getList(trip, from)!
      const index = list.findIndex((i) => i.id === id)
      const copy: Item = { ...list[index], id: uid() }
      edit((t) => {
        const items = [...getList(t, from)!]
        items.splice(index + 1, 0, copy)
        return setList(t, from, items)
      })
      return copy.id
    },
    removeItem: (id) => {
      const trip = active()
      const from = trip ? containerOf(trip, id) : null
      if (!trip || !from) return
      const list = getList(trip, from)!
      const index = list.findIndex((i) => i.id === id)
      const item = list[index]
      edit((t) => mapItems(t, (items) => items.filter((i) => i.id !== id)))
      notify(
        `Removed ${item.title || 'item'}`,
        onTrip(trip.id, (t) => {
          if (findItem(t, item.id)) return t
          // If its day was removed in the meantime, put it back under shared costs.
          const target = getList(t, from) ? from : WHOLE
          const items = [...getList(t, target)!]
          items.splice(Math.min(index, items.length), 0, item)
          return setList(t, target, items)
        }),
      )
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
      if (undo) set((s) => ({ trips: undo(s.trips), toast: null }))
    },
    dismissToast: () => set({ toast: null }),
  }
})

// Persist on change. Only the trips are saved; UI state like the open dialog is not.
useTrip.subscribe((s, prev) => {
  if (s.trips === prev.trips) return
  const ok = saveTrips(s.trips)
  if (ok !== !s.saveFailed) useTrip.setState({ saveFailed: !ok })
})

// ---- Selectors ----------------------------------------------------------------

export const selectActive = (s: State): Trip | undefined => s.trips.find((t) => t.id === s.activeId)

/**
 * The trip open in the editor. Editor components render only while one is open. If the
 * trip disappears (deleted, or removed in another tab), a child can render once more
 * before its parent unmounts it; it gets the last trip it saw for that render instead of
 * throwing, because a throw here would send the whole page to the error boundary.
 */
export function useActiveTrip(): Trip {
  const trip = useTrip(selectActive)
  const last = useRef<Trip | undefined>(trip)
  if (trip) last.current = trip
  return (trip ?? last.current ?? EMPTY_TRIP) as Trip
}

const EMPTY_TRIP: Trip = {
  id: '',
  title: '',
  startDate: '',
  notes: '',
  people: [{ id: '', name: '' }],
  budget: null,
  wholeTrip: [],
  days: [],
  customPlaces: [],
  createdAt: '',
  updatedAt: '',
}

export const selectTotal = (s: State) => {
  const t = selectActive(s)
  return t ? totalCost(t) : 0
}
export const selectPerPerson = (s: State) => {
  const t = selectActive(s)
  return t ? perPerson(t) : 0
}
