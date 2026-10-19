'use client'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { plannerDisplay, plannerSans } from './fonts'
import { WHOLE } from '@/lib/planner/types'
import type { ItemKind } from '@/lib/planner/types'
import { ConfirmDialog, Toast } from './Overlays'
import { CostSplit } from './CostSplit'
import { DayCard } from './DayCard'
import { PrintSummary } from './PrintSummary'
import { TileLibrary } from './TileLibrary'
import { TripHeader } from './TripHeader'
import { WholeTripCard } from './WholeTripCard'
import { AutoTextarea, KindDot } from './ui'
import { containerOf, useTrip } from '@/lib/planner/store'

/** Prefer the item under the pointer, then the container, then fall back to rectangle overlap. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length) {
    const items = hits.filter((h) => h.data?.droppableContainer?.data?.current?.type === 'item')
    return items.length ? items : hits
  }
  return rectIntersection(args)
}

interface Overlay {
  label: string
  kind: ItemKind
}

export default function PlannerApp() {
  const trip = useTrip((s) => s.trip)
  const dark = useTrip((s) => s.dark)
  const { setNotes, addDay } = useTrip.getState()
  const [overlay, setOverlay] = useState<Overlay | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    // Space lifts, so that Enter stays free for "add this tile".
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const onStart = (e: DragStartEvent) => {
    const d = e.active.data.current
    if (d?.type === 'tile') setOverlay({ label: d.label, kind: d.kind })
    else {
      const t = useTrip.getState().trip
      const item = [...t.wholeTrip, ...t.days.flatMap((x) => x.items)].find((i) => i.id === e.active.id)
      if (item) setOverlay({ label: item.title || 'Item', kind: item.kind })
    }
  }

  const onEnd = (e: DragEndEvent) => {
    setOverlay(null)
    const { active, over } = e
    if (!over) return
    const store = useTrip.getState()
    const overId = String(over.id)
    const isContainer = overId === WHOLE || store.trip.days.some((d) => d.id === overId)
    const container = isContainer ? overId : containerOf(store.trip, overId)
    if (!container) return
    const list = container === WHOLE ? store.trip.wholeTrip : store.trip.days.find((d) => d.id === container)!.items
    const index = isContainer ? list.length : list.findIndex((i) => i.id === overId)

    const data = active.data.current
    if (data?.type === 'tile') {
      const id = store.addItem(container, data.kind, data.title)
      store.moveItem(id, container, index)
      store.select(container)
    } else if (String(active.id) !== overId) {
      store.moveItem(String(active.id), container, index)
    }
  }

  return (
    <div
      className={`tp-root ${plannerDisplay.variable} ${plannerSans.variable} ${dark ? 'tp-dark' : ''} min-h-screen bg-tp-bg pt-16 font-tp-sans text-tp-ink`}
    >
      <div className="tp-no-print">
        <Navbar showGetStarted={false} />
        <TripHeader />
        <CostSplit />
        <DndContext
          sensors={sensors}
          collisionDetection={collision}
          onDragStart={onStart}
          onDragEnd={onEnd}
          onDragCancel={() => setOverlay(null)}
        >
          <div className="flex flex-col lg:flex-row">
            <TileLibrary />
            <main className="mx-auto w-full max-w-[1000px] flex-1 space-y-5 px-4 py-6 lg:px-8">
              <section className="rounded-2xl border-2 border-tp-line bg-tp-surface p-4 sm:p-6">
                <h2 className="mb-2 text-[26px] font-bold leading-tight">Trip notes</h2>
                <AutoTextarea
                  aria-label="Trip notes"
                  placeholder="Write anything about this trip"
                  value={trip.notes}
                  onChange={setNotes}
                  className="!min-h-24 !text-base"
                />
              </section>
              <WholeTripCard />
              {trip.days.map((d, i) => (
                <DayCard key={d.id} day={d} index={i} />
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <button className="tp-btn tp-btn-primary !text-[17px]" onClick={addDay}>
                  + Add day
                </button>
                {trip.days.length === 0 && <span className="text-[17px] text-tp-ink2">No days yet. Add one to start planning.</span>}
              </div>
            </main>
          </div>
          <DragOverlay>
            {overlay && (
              <div className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-tp-accent bg-tp-surface px-4 text-[17px] font-semibold shadow-xl">
                <KindDot kind={overlay.kind} />
                {overlay.label}
              </div>
            )}
          </DragOverlay>
        </DndContext>
        <Toast />
        <ConfirmDialog />
      </div>
      <PrintSummary />
    </div>
  )
}

