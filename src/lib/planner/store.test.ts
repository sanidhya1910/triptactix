import { beforeEach, describe, expect, it } from 'vitest'
import { balances, totalCost } from './calc'
import { seedTrip } from './seed'
import { selectActive, useTrip } from './store'

const s = () => useTrip.getState()
const trip = () => selectActive(s())!

beforeEach(() => {
  const t = seedTrip()
  useTrip.setState({ trips: [t], activeId: t.id, toast: null, confirmDayId: null, confirmPersonId: null })
})

describe('undo', () => {
  it('restores a deleted item without discarding edits made afterwards', () => {
    const item = trip().days[0].items[1]
    s().removeItem(item.id)
    s().setTitle('Renamed while the toast was up')
    s().undo()
    expect(trip().title).toBe('Renamed while the toast was up')
    expect(trip().days[0].items[1].id).toBe(item.id)
  })

  it('restores a removed day at its original position, keeping later edits', () => {
    const day = trip().days[1]
    s().removeDay(day.id)
    s().setBudget(60000)
    s().undo()
    expect(trip().budget).toBe(60000)
    expect(trip().days[1].id).toBe(day.id)
  })

  it('puts an item back under shared costs if its day has since been removed', () => {
    const day = trip().days[0]
    const item = day.items[0]
    s().removeItem(item.id)
    const itemUndo = s().toast!.undo!
    s().removeDay(day.id)
    useTrip.setState({ trips: itemUndo(s().trips) })
    expect(trip().wholeTrip.some((i) => i.id === item.id)).toBe(true)
  })

  it('restores a deleted budget at its place in the list', () => {
    const second = seedTrip()
    useTrip.setState({ trips: [trip(), second] })
    s().deleteTrip(second.id)
    expect(s().trips).toHaveLength(1)
    s().undo()
    expect(s().trips.map((t) => t.id)).toEqual([trip().id, second.id])
  })
})

describe('people', () => {
  it('removing someone frees what they paid for, and undo restores it exactly', () => {
    const [asha, ravi] = trip().people
    const paidByRavi = () => [...trip().wholeTrip, ...trip().days.flatMap((d) => d.items)].filter((i) => i.paidBy === ravi.id).length
    expect(paidByRavi()).toBe(7) // four cabs and three fees

    s().removePerson(ravi.id)
    expect(trip().people.map((p) => p.id)).toEqual([asha.id])
    expect(paidByRavi()).toBe(0)

    s().undo()
    expect(trip().people.map((p) => p.id)).toEqual([asha.id, ravi.id])
    expect(paidByRavi()).toBe(7)
    expect(balances(trip())[ravi.id]).toBe(-9500)
  })

  it('asks before removing someone who paid for something', () => {
    s().requestRemovePerson(trip().people[1].id)
    expect(s().confirmPersonId).toBe(trip().people[1].id)
    expect(trip().people).toHaveLength(2)
  })

  it('never removes the last person', () => {
    s().removePerson(trip().people[1].id)
    s().removePerson(trip().people[0].id)
    expect(trip().people).toHaveLength(1)
  })

  it('adds a person, who then shares every "everyone" cost', () => {
    const before = totalCost(trip()) / 2
    s().addPerson('Meera')
    expect(trip().people).toHaveLength(3)
    expect(Math.round(before)).toBe(23700)
  })
})

describe('days and items', () => {
  it('moves a day and ignores moves past either end', () => {
    const [d0, d1] = trip().days
    s().moveDay(d0.id, 1)
    expect(trip().days.slice(0, 2).map((d) => d.id)).toEqual([d1.id, d0.id])
    s().moveDay(d1.id, -1)
    s().moveDay(trip().days[0].id, -1)
    expect(trip().days[0].id).toBe(d1.id)
  })

  it('duplicates a day right after itself, with new ids', () => {
    const d0 = trip().days[0]
    const id = s().duplicateDay(d0.id)!
    expect(trip().days[1].id).toBe(id)
    expect(trip().days[1].items.map((i) => i.title)).toEqual(d0.items.map((i) => i.title))
    expect(trip().days[1].items[0].id).not.toBe(d0.items[0].id)
    expect(totalCost(trip())).toBe(47400 + 4450)
  })

  it('duplicates an item next to itself', () => {
    const item = trip().days[0].items[0]
    const id = s().duplicateItem(item.id)!
    expect(trip().days[0].items[1]).toMatchObject({ id, title: item.title, amount: item.amount })
  })

  it('adds a blank item to the chosen card and returns its id', () => {
    const day = trip().days[2]
    const id = s().addItem(day.id, 'stay')!
    expect(trip().days[2].items.at(-1)).toMatchObject({ id, kind: 'stay', title: '', amount: 0, paidBy: null })
  })
})

describe('trips', () => {
  it('duplicating gives every person, day and item a new id and remaps payers', () => {
    const original = trip()
    const id = s().duplicateTrip(original.id)!
    const copy = s().trips.find((t) => t.id === id)!
    expect(copy.title).toBe(`${original.title} (copy)`)
    const oldIds = new Set(original.people.map((p) => p.id))
    expect(copy.people.some((p) => oldIds.has(p.id))).toBe(false)
    // The copy settles the same way as the original, through its own people.
    expect(Object.values(balances(copy)).sort()).toEqual(Object.values(balances(original)).sort())
  })

  it('re-ids an imported trip whose id is already on this device', () => {
    const [id] = s().addTrips([trip()])
    expect(id).not.toBe(trip().id)
    expect(s().trips).toHaveLength(2)
  })

  it('edits do nothing when no trip is open', () => {
    s().setActive(null)
    expect(s().addDay()).toBeNull()
    s().setTitle('ignored')
    expect(s().trips[0].title).toBe('Karnataka and Kerala road trip')
  })

  it('creates a blank trip with one traveller and one empty day', () => {
    const id = s().createTrip('blank')
    const t = s().trips.find((x) => x.id === id)!
    expect(t.people).toHaveLength(1)
    expect(t.days).toHaveLength(1)
    expect(totalCost(t)).toBe(0)
  })
})
