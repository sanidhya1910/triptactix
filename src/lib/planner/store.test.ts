import { beforeEach, describe, expect, it } from 'vitest'
import { seedTrip } from './seed'
import { useTrip } from './store'

const s = () => useTrip.getState()

beforeEach(() => {
  useTrip.setState({ trip: seedTrip(), toast: null, confirmDayId: null })
})

describe('undo', () => {
  it('restores a deleted item without discarding edits made afterwards', () => {
    const day = s().trip.days[0]
    const item = day.items[1]
    s().removeItem(item.id)
    s().setTitle('Renamed while the toast was up')
    s().undo()

    expect(s().trip.title).toBe('Renamed while the toast was up')
    expect(s().trip.days[0].items[1].id).toBe(item.id)
  })

  it('restores a removed day at its original position, keeping later edits', () => {
    const day = s().trip.days[1]
    s().removeDay(day.id)
    s().setTravellers(4)
    s().undo()

    expect(s().trip.travellers).toBe(4)
    expect(s().trip.days[1].id).toBe(day.id)
    expect(s().trip.days).toHaveLength(4)
  })

  it('puts an item under Whole trip if its day has since been removed', () => {
    const day = s().trip.days[0]
    const item = day.items[0]
    s().removeItem(item.id)
    // Remove the day directly, which replaces the item toast; restore that toast's undo.
    const itemUndo = s().toast!.undo!
    s().removeDay(day.id)
    useTrip.setState({ trip: itemUndo(s().trip) })

    expect(s().trip.wholeTrip.some((i) => i.id === item.id)).toBe(true)
    expect(s().trip.days.some((d) => d.id === day.id)).toBe(false)
  })


  it('clears the toast after undoing', () => {
    s().removeItem(s().trip.days[0].items[0].id)
    s().undo()
    expect(s().toast).toBeNull()
  })
})

describe('adding', () => {
  it('adds a blank item of the chosen kind to that card and returns its id', () => {
    const day = s().trip.days[2]
    const before = day.items.length
    const id = s().addItem(day.id, 'stay')
    const items = s().trip.days[2].items
    expect(items).toHaveLength(before + 1)
    expect(items.at(-1)).toMatchObject({ id, kind: 'stay', title: '', amount: 0 })
  })

  it('adds a day at the end and returns its id', () => {
    const id = s().addDay()
    expect(s().trip.days.at(-1)?.id).toBe(id)
    expect(s().trip.days).toHaveLength(5)
  })
})
