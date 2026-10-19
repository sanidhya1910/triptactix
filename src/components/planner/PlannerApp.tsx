'use client'

import { useMemo, useState } from 'react'
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
import { DownloadSimple, Plus, Printer } from '@phosphor-icons/react/ssr'
import { AppShell } from '@/components/layout/AppShell'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/planner/calc'
import { containerOf, useTrip } from '@/lib/planner/store'
import type { Item } from '@/lib/planner/types'
import { KINDS, WHOLE } from '@/lib/planner/types'
import { DayCard, dayTitleId } from './DayCard'
import { RemoveDayDialog, UndoToasts } from './Feedback'
import { KindTile } from './kinds'
import { PrintSummary } from './PrintSummary'
import { SharedCosts } from './SharedCosts'
import { MobileTotalBar, Summary } from './Summary'
import { TripDetails } from './TripDetails'
import { focusSoon } from './ui'

/** Prefer the item under the pointer, then the card, then fall back to rectangle overlap. */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length) {
    const items = hits.filter((h) => h.data?.droppableContainer?.data?.current?.type === 'item')
    return items.length ? items : hits
  }
  return rectIntersection(args)
}

function exportJson() {
  const { trip } = useTrip.getState()
  const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(trip.title || 'trip').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
  a.click()
  // Revoking in the same tick can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function PlannerApp() {
  const trip = useTrip((s) => s.trip)
  const addDay = useTrip((s) => s.addDay)
  const [dragging, setDragging] = useState<Item | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  // Suggest place names already used on this trip, so a stop typed once is one pick away.
  const places = useMemo(() => {
    const used = [...trip.wholeTrip, ...trip.days.flatMap((d) => d.items)]
      .filter((i) => i.kind === 'place')
      .map((i) => i.title.trim())
    return [...new Set([...trip.customPlaces, ...used].filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [trip])

  const onStart = (e: DragStartEvent) => {
    const t = useTrip.getState().trip
    setDragging([...t.wholeTrip, ...t.days.flatMap((d) => d.items)].find((i) => i.id === e.active.id) ?? null)
  }

  const onEnd = (e: DragEndEvent) => {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const store = useTrip.getState()
    const overId = String(over.id)
    const isContainer = overId === WHOLE || store.trip.days.some((d) => d.id === overId)
    const container = isContainer ? overId : containerOf(store.trip, overId)
    if (!container || String(active.id) === overId) return
    const list = container === WHOLE ? store.trip.wholeTrip : store.trip.days.find((d) => d.id === container)!.items
    const index = isContainer ? list.length : list.findIndex((i) => i.id === overId)
    store.moveItem(String(active.id), container, index)
  }

  const newDay = () => focusSoon(dayTitleId(addDay()), { scroll: true })

  return (
    <>
      <div className="print:hidden">
        <AppShell width="wide">
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-display-sm text-ink">Budget planner</h1>
              <p className="mt-3 max-w-xl text-ink-secondary">
                Cost a trip day by day and watch every rupee add up. Saved on this device only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={exportJson}>
                <DownloadSimple className="h-4 w-4" />
                Download
              </Button>
            </div>
          </header>

          <DndContext
            sensors={sensors}
            collisionDetection={collision}
            onDragStart={onStart}
            onDragEnd={onEnd}
            onDragCancel={() => setDragging(null)}
          >
            <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
              <div className="min-w-0 space-y-5">
                <TripDetails />
                <SharedCosts />
                {trip.days.map((d, i) => (
                  <DayCard key={d.id} day={d} index={i} />
                ))}
                <Button variant="outline" className="h-12 w-full border-dashed text-ink-secondary" onClick={newDay}>
                  <Plus className="h-4 w-4" weight="bold" />
                  Add day {trip.days.length + 1}
                </Button>
              </div>

              <Summary />
            </div>

            <DragOverlay>
              {dragging && (
                <div className="flex items-center gap-2 rounded-md border border-brand bg-surface px-3 py-2 text-sm shadow-lg">
                  <KindTile kind={dragging.kind} />
                  <span className="font-medium text-ink">{dragging.title || KINDS[dragging.kind].label}</span>
                  {dragging.amount > 0 && (
                    <span className="ml-2 font-mono text-ink-secondary [font-variant-numeric:tabular-nums]">
                      {formatINR(dragging.amount)}
                    </span>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </AppShell>
        <SiteFooter />
        <MobileTotalBar />
      </div>

      <datalist id="planner-places">
        {places.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <PrintSummary />
      <RemoveDayDialog />
      <UndoToasts />
    </>
  )
}
